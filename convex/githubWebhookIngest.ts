import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { canonicalizeGithubLogin } from "./lib/identityMapping";
import { shaFromCommitExternalId } from "./lib/githubCommitStats";
import { computeScore, type ScoreContribution } from "./lib/scoring";

const contributionKind = v.union(
  v.literal("commit"),
  v.literal("pr_merged"),
  v.literal("review"),
);

const normalizedContributionCandidate = v.object({
  kind: contributionKind,
  externalId: v.string(),
  repo: v.string(),
  day: v.string(),
  onDefaultBranch: v.boolean(),
  githubLogin: v.union(v.string(), v.null()),
  githubInstallationId: v.union(v.string(), v.null()),
  lines: v.optional(v.number()),
});

const contributionPeriods = ["weekly", "all_time"] as const;

type ContributionPeriod = (typeof contributionPeriods)[number];

type AffectedScoreKey = {
  userId: Id<"users">;
  period: ContributionPeriod;
};

export const ingestNormalizedContributions = internalMutation({
  args: {
    deliveryId: v.string(),
    event: v.string(),
    candidates: v.array(normalizedContributionCandidate),
  },
  handler: async (ctx, args) => {
    const existingDelivery = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_delivery_id", (q) => q.eq("deliveryId", args.deliveryId))
      .unique();

    if (existingDelivery !== null) {
      return {
        duplicateDelivery: true,
        insertedContributionRows: 0,
      };
    }

    let insertedContributionRows = 0;
    const now = Date.now();
    const affectedScores = new Map<string, AffectedScoreKey>();
    let queuedCommitStatFetches = 0;

    for (const candidate of args.candidates) {
      const existingContribution = await ctx.db
        .query("contributions")
        .withIndex("by_external_id", (q) =>
          q.eq("externalId", candidate.externalId),
        )
        .take(1);

      if (existingContribution.length > 0 || candidate.githubLogin === null) {
        continue;
      }

      const githubLogin = canonicalizeGithubLogin(candidate.githubLogin);
      const user = await ctx.db
        .query("users")
        .withIndex("by_github_login", (q) =>
          q.eq("githubLogin", githubLogin),
        )
        .unique();

      if (user === null) {
        continue;
      }

      for (const period of contributionPeriods) {
        await ctx.db.insert("contributions", {
          userId: user._id,
          period,
          day: candidate.day,
          kind: candidate.kind,
          externalId: candidate.externalId,
          repo: candidate.repo,
          ...(candidate.lines === undefined ? {} : { lines: candidate.lines }),
          onDefaultBranch: candidate.onDefaultBranch,
          createdAt: now,
        });
        insertedContributionRows += 1;
        affectedScores.set(scoreKey(user._id, period), {
          userId: user._id,
          period,
        });
      }

      if (await shouldQueueCommitStatFetch(ctx, candidate)) {
        const sha = shaFromCommitExternalId(candidate.externalId);

        if (sha !== null && candidate.githubInstallationId !== null) {
          await ctx.db.insert("commitStatFetches", {
            externalId: candidate.externalId,
            githubInstallationId: candidate.githubInstallationId,
            repo: candidate.repo,
            sha,
            status: "pending",
            attempts: 0,
            nextAttemptAt: 0,
            createdAt: now,
            updatedAt: now,
          });
          queuedCommitStatFetches += 1;
        }
      }
    }

    for (const affectedScore of affectedScores.values()) {
      await recomputeScore(ctx, affectedScore, now);
    }

    await ctx.db.insert("webhookDeliveries", {
      deliveryId: args.deliveryId,
      event: args.event,
      receivedAt: now,
      insertedContributionRows,
    });

    if (queuedCommitStatFetches > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.githubCommitStats.processPendingCommitStats,
        { now },
      );
    }

    return {
      duplicateDelivery: false,
      insertedContributionRows,
      queuedCommitStatFetches,
    };
  },
});

async function shouldQueueCommitStatFetch(
  ctx: MutationCtx,
  candidate: {
    kind: "commit" | "pr_merged" | "review";
    externalId: string;
    githubInstallationId: string | null;
    lines?: number;
  },
) {
  if (
    candidate.kind !== "commit" ||
    candidate.lines !== undefined ||
    candidate.githubInstallationId === null ||
    shaFromCommitExternalId(candidate.externalId) === null
  ) {
    return false;
  }

  const existingFetch = await ctx.db
    .query("commitStatFetches")
    .withIndex("by_external_id", (q) => q.eq("externalId", candidate.externalId))
    .take(1);

  return existingFetch.length === 0;
}

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
