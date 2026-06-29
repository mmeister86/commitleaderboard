import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
import { githubRateLimiter } from "./githubRateLimits";
import {
  buildCommitMetadataRequest,
  buildInstallationTokenRequest,
  createGitHubAppJwt,
  extractCommitLineCount,
  extractInstallationToken,
} from "./lib/githubCommitStats";
import { computeScore, type ScoreContribution } from "./lib/scoring";

const PROCESSING_BATCH_SIZE = 25;

const commitStatFetchStatus = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("complete"),
  v.literal("failed"),
);

export const listPendingInstallationIds = internalQuery({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("commitStatFetches")
      .withIndex("by_status_and_next_attempt_at", (q) =>
        q.eq("status", "pending").lte("nextAttemptAt", args.now),
      )
      .take(100);

    return Array.from(new Set(rows.map((row) => row.githubInstallationId)));
  },
});

export const claimPendingCommitStatFetches = internalMutation({
  args: {
    githubInstallationId: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const pendingJobs = await ctx.db
      .query("commitStatFetches")
      .withIndex("by_installation_status_and_next_attempt_at", (q) =>
        q
          .eq("githubInstallationId", args.githubInstallationId)
          .eq("status", "pending")
          .lte("nextAttemptAt", args.now),
      )
      .take(PROCESSING_BATCH_SIZE);
    const jobs = [];

    for (const job of pendingJobs) {
      const limit = await githubRateLimiter.limit(ctx, "commitStatsFetch", {
        key: args.githubInstallationId,
      });

      if (!limit.ok) {
        return {
          jobs,
          rateLimited: true,
          retryAfter: limit.retryAfter ?? null,
        };
      }

      await ctx.db.patch(job._id, {
        status: "processing",
        attempts: job.attempts + 1,
        updatedAt: args.now,
        lastMetadataError: undefined,
      });
      jobs.push({
        externalId: job.externalId,
        githubInstallationId: job.githubInstallationId,
        repo: job.repo,
        sha: job.sha,
      });
    }

    return {
      jobs,
      rateLimited: false,
      retryAfter: null,
    };
  },
});

export const applyFetchedCommitStats = internalMutation({
  args: {
    externalId: v.string(),
    lines: v.number(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const affectedScores = new Map<string, AffectedScoreKey>();

    for await (const contribution of ctx.db
      .query("contributions")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))) {
      await ctx.db.patch(contribution._id, {
        lines: args.lines,
      });
      affectedScores.set(scoreKey(contribution.userId, contribution.period), {
        userId: contribution.userId,
        period: contribution.period,
      });
    }

    const jobs = await ctx.db
      .query("commitStatFetches")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .take(10);

    for (const job of jobs) {
      await ctx.db.patch(job._id, {
        status: "complete",
        updatedAt: args.now,
        lastMetadataError: undefined,
      });
    }

    for (const affectedScore of affectedScores.values()) {
      await recomputeScore(ctx, affectedScore, args.now);
    }

    return { updatedContributionRows: affectedScores.size };
  },
});

export const markCommitStatFetchFailed = internalMutation({
  args: {
    externalId: v.string(),
    status: commitStatFetchStatus,
    retryAt: v.union(v.number(), v.null()),
    error: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("commitStatFetches")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .take(10);

    for (const job of jobs) {
      await ctx.db.patch(job._id, {
        status: args.status,
        nextAttemptAt: args.retryAt ?? job.nextAttemptAt,
        lastMetadataError: args.error,
        updatedAt: args.now,
      });
    }
  },
});

export const processPendingCommitStats = internalAction({
  args: {
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const installationIds: string[] = await ctx.runQuery(
      internal.githubCommitStats.listPendingInstallationIds,
      { now },
    );
    let fetched = 0;
    let rateLimited = false;
    let nextRunAfter: number | null = null;

    for (const githubInstallationId of installationIds) {
      const claim: {
        jobs: Array<{
          externalId: string;
          githubInstallationId: string;
          repo: string;
          sha: string;
        }>;
        rateLimited: boolean;
        retryAfter: number | null;
      } = await ctx.runMutation(
        internal.githubCommitStats.claimPendingCommitStatFetches,
        { githubInstallationId, now },
      );

      if (claim.jobs.length === 0) {
        rateLimited ||= claim.rateLimited;
        if (claim.rateLimited) {
          nextRunAfter = earlierDelay(
            nextRunAfter,
            normalizeRetryAfter(claim.retryAfter),
          );
        }
        continue;
      }

      let token: string;

      try {
        token = await mintInstallationToken(githubInstallationId, now);
      } catch (error) {
        await markJobsForRetryAfterTokenFailure(ctx, claim.jobs, now, error);
        nextRunAfter = earlierDelay(nextRunAfter, 5 * 60 * 1000);
        continue;
      }

      for (const job of claim.jobs) {
        try {
          const request = buildCommitMetadataRequest({
            repo: job.repo,
            sha: job.sha,
            token,
          });
          const response = await fetch(request.url, request.init);

          if (!response.ok) {
            await ctx.runMutation(
              internal.githubCommitStats.markCommitStatFetchFailed,
              {
                externalId: job.externalId,
                status: response.status === 403 ? "pending" : "failed",
                retryAt:
                  response.status === 403 ? now + 5 * 60 * 1000 : null,
                error: `github_commit_metadata_${response.status}`,
                now,
              },
            );
            if (response.status === 403) {
              nextRunAfter = earlierDelay(nextRunAfter, 5 * 60 * 1000);
            }
            continue;
          }

          const lines = extractCommitLineCount(await response.json());

          if (lines === null) {
            await ctx.runMutation(
              internal.githubCommitStats.markCommitStatFetchFailed,
              {
                externalId: job.externalId,
                status: "failed",
                retryAt: null,
                error: "missing_commit_stats_total",
                now,
              },
            );
            continue;
          }

          await ctx.runMutation(
            internal.githubCommitStats.applyFetchedCommitStats,
            {
              externalId: job.externalId,
              lines,
              now,
            },
          );
          fetched += 1;
        } catch (error) {
          await ctx.runMutation(
            internal.githubCommitStats.markCommitStatFetchFailed,
            {
              externalId: job.externalId,
              status: "pending",
              retryAt: now + 5 * 60 * 1000,
              error:
                error instanceof Error
                  ? error.message.slice(0, 200)
                  : "commit_stats_fetch_failed",
              now,
            },
          );
          nextRunAfter = earlierDelay(nextRunAfter, 5 * 60 * 1000);
        }
      }

      rateLimited ||= claim.rateLimited;
      if (claim.rateLimited) {
        nextRunAfter = earlierDelay(
          nextRunAfter,
          normalizeRetryAfter(claim.retryAfter),
        );
      }
    }

    if (nextRunAfter !== null) {
      await ctx.scheduler.runAfter(
        nextRunAfter,
        internal.githubCommitStats.processPendingCommitStats,
        {},
      );
    }

    return {
      installationCount: installationIds.length,
      fetched,
      rateLimited,
    };
  },
});

async function mintInstallationToken(
  githubInstallationId: string,
  now: number,
) {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (appId === undefined || appId.trim() === "") {
    throw new Error("Missing GITHUB_APP_ID");
  }

  if (privateKey === undefined || privateKey.trim() === "") {
    throw new Error("Missing GITHUB_PRIVATE_KEY");
  }

  const jwt = await createGitHubAppJwt({
    appId,
    privateKey,
    nowSeconds: Math.floor(now / 1000),
  });
  const request = buildInstallationTokenRequest({
    githubInstallationId,
    jwt,
  });
  const response = await fetch(request.url, request.init);

  if (!response.ok) {
    throw new Error(`github_installation_token_${response.status}`);
  }

  const token = extractInstallationToken(await response.json());

  if (token === null) {
    throw new Error("missing_installation_token");
  }

  return token;
}

function normalizeRetryAfter(retryAfter: number | null) {
  return Math.max(retryAfter ?? 60 * 1000, 1000);
}

function earlierDelay(current: number | null, candidate: number) {
  return current === null ? candidate : Math.min(current, candidate);
}

async function markJobsForRetryAfterTokenFailure(
  ctx: Pick<ActionCtx, "runMutation">,
  jobs: Array<{ externalId: string }>,
  now: number,
  error: unknown,
) {
  for (const job of jobs) {
    await ctx.runMutation(internal.githubCommitStats.markCommitStatFetchFailed, {
      externalId: job.externalId,
      status: "pending",
      retryAt: now + 5 * 60 * 1000,
      error:
        error instanceof Error
          ? error.message.slice(0, 200)
          : "installation_token_failed",
      now,
    });
  }
}

type ContributionPeriod = "weekly" | "all_time";

type AffectedScoreKey = {
  userId: Id<"users">;
  period: ContributionPeriod;
};

function scoreKey(userId: Id<"users">, period: ContributionPeriod) {
  return `${userId}:${period}`;
}

async function recomputeScore(
  ctx: MutationCtx,
  key: AffectedScoreKey,
  now: number,
) {
  const contributions: ScoreContribution[] = [];

  for await (const contribution of ctx.db
    .query("contributions")
    .withIndex("by_user_id_and_period", (q) =>
      q.eq("userId", key.userId).eq("period", key.period),
    )) {
    contributions.push({
      kind: contribution.kind,
      day: contribution.day,
      lines: contribution.lines,
      onDefaultBranch: contribution.onDefaultBranch,
    });
  }

  const score = computeScore(contributions);
  const existingScore = await ctx.db
    .query("scores")
    .withIndex("by_user_id_and_period", (q) =>
      q.eq("userId", key.userId).eq("period", key.period),
    )
    .unique();

  if (existingScore === null) {
    await ctx.db.insert("scores", {
      userId: key.userId,
      period: key.period,
      ...score,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.patch(existingScore._id, {
    ...score,
    updatedAt: now,
  });
}
