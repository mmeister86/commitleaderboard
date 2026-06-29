import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { describe, expect, test, vi } from "vitest";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { NormalizedContributionCandidate } from "./lib/githubWebhookPayloads";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const ingestNormalizedContributions =
  internal.githubWebhookIngest.ingestNormalizedContributions;
const applyFetchedCommitStats =
  internal.githubCommitStats.applyFetchedCommitStats;
const claimPendingCommitStatFetches =
  internal.githubCommitStats.claimPendingCommitStatFetches;
const processPendingCommitStats =
  internal.githubCommitStats.processPendingCommitStats;

const resolvedPushCandidate = {
  kind: "commit",
  externalId: "github:commit:10395d235a91f3eeec771877639c6ffb9a351fbc",
  repo: "mmeister86/commit-leaderboard-private-test",
  day: "2026-06-28",
  onDefaultBranch: true,
  githubLogin: "mmeister86",
  githubInstallationId: "3828258385084547000",
} satisfies NormalizedContributionCandidate;

const scoredPushCandidate = {
  ...resolvedPushCandidate,
  lines: 10,
};

const periodOrder = {
  weekly: 0,
  all_time: 1,
};

describe("ingestNormalizedContributions", () => {
  test("duplicate webhook deliveries insert contributions only once", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, "mmeister86");

    await t.mutation(ingestNormalizedContributions, {
      deliveryId: "delivery-1",
      event: "push",
      candidates: [scoredPushCandidate],
    });
    await t.mutation(ingestNormalizedContributions, {
      deliveryId: "delivery-1",
      event: "push",
      candidates: [scoredPushCandidate],
    });

    await expect(listContributions(t)).resolves.toHaveLength(2);
    await expect(listDeliveries(t)).resolves.toMatchObject([
      {
        deliveryId: "delivery-1",
        event: "push",
        insertedContributionRows: 2,
      },
    ]);
    await expect(listScores(t)).resolves.toEqual([
      {
        userId: expect.any(String),
        period: "weekly",
        points: 19,
        streak: 1,
        commits: 1,
      },
      {
        userId: expect.any(String),
        period: "all_time",
        points: 19,
        streak: 1,
        commits: 1,
      },
    ]);
  });

  test("duplicate contribution external IDs from different deliveries insert once", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, "mmeister86");

    await t.mutation(ingestNormalizedContributions, {
      deliveryId: "delivery-1",
      event: "push",
      candidates: [scoredPushCandidate],
    });
    await t.mutation(ingestNormalizedContributions, {
      deliveryId: "delivery-2",
      event: "push",
      candidates: [scoredPushCandidate],
    });

    await expect(listContributions(t)).resolves.toHaveLength(2);
    await expect(listDeliveries(t)).resolves.toMatchObject([
      {
        deliveryId: "delivery-1",
        insertedContributionRows: 2,
      },
      {
        deliveryId: "delivery-2",
        insertedContributionRows: 0,
      },
    ]);
    await expect(listScores(t)).resolves.toEqual([
      {
        userId: expect.any(String),
        period: "weekly",
        points: 19,
        streak: 1,
        commits: 1,
      },
      {
        userId: expect.any(String),
        period: "all_time",
        points: 19,
        streak: 1,
        commits: 1,
      },
    ]);
  });

  test("a resolved push event writes weekly and all-time contribution rows", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "mmeister86");

    await t.mutation(ingestNormalizedContributions, {
      deliveryId: "delivery-1",
      event: "push",
      candidates: [resolvedPushCandidate],
    });

    await expect(listContributions(t)).resolves.toEqual([
      {
        userId,
        period: "weekly",
        day: "2026-06-28",
        kind: "commit",
        externalId: "github:commit:10395d235a91f3eeec771877639c6ffb9a351fbc",
        repo: "mmeister86/commit-leaderboard-private-test",
        onDefaultBranch: true,
      },
      {
        userId,
        period: "all_time",
        day: "2026-06-28",
        kind: "commit",
        externalId: "github:commit:10395d235a91f3eeec771877639c6ffb9a351fbc",
        repo: "mmeister86/commit-leaderboard-private-test",
        onDefaultBranch: true,
      },
    ]);
  });

  test("a commit without line counts queues one metadata-only stats fetch", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, "mmeister86");

    await t.mutation(ingestNormalizedContributions, {
      deliveryId: "delivery-1",
      event: "push",
      candidates: [resolvedPushCandidate],
    });

    await expect(listCommitStatFetches(t)).resolves.toEqual([
      {
        externalId: "github:commit:10395d235a91f3eeec771877639c6ffb9a351fbc",
        githubInstallationId: "3828258385084547000",
        repo: "mmeister86/commit-leaderboard-private-test",
        sha: "10395d235a91f3eeec771877639c6ffb9a351fbc",
        status: "pending",
        attempts: 0,
      },
    ]);
  });

  test("non-commit contributions and already-scored commits do not queue stats fetches", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, "mmeister86");

    await t.mutation(ingestNormalizedContributions, {
      deliveryId: "delivery-1",
      event: "pull_request",
      candidates: [
        {
          ...resolvedPushCandidate,
          kind: "pr_merged",
          externalId:
            "github:pull_request:mmeister86/commit-leaderboard-private-test:42:merged",
          lines: undefined,
        },
        scoredPushCandidate,
      ],
    });

    await expect(listCommitStatFetches(t)).resolves.toEqual([]);
  });

  test("applying fetched commit stats populates both contribution rows and recomputes scores", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "mmeister86");

    await t.mutation(ingestNormalizedContributions, {
      deliveryId: "delivery-1",
      event: "push",
      candidates: [resolvedPushCandidate],
    });
    await t.mutation(applyFetchedCommitStats, {
      externalId: "github:commit:10395d235a91f3eeec771877639c6ffb9a351fbc",
      lines: 10,
      now: 1_800_000_000_000,
    });

    await expect(listContributionLines(t)).resolves.toEqual([
      {
        userId,
        period: "weekly",
        externalId: "github:commit:10395d235a91f3eeec771877639c6ffb9a351fbc",
        lines: 10,
      },
      {
        userId,
        period: "all_time",
        externalId: "github:commit:10395d235a91f3eeec771877639c6ffb9a351fbc",
        lines: 10,
      },
    ]);
    await expect(listScores(t)).resolves.toEqual([
      {
        userId,
        period: "weekly",
        points: 19,
        streak: 1,
        commits: 1,
      },
      {
        userId,
        period: "all_time",
        points: 19,
        streak: 1,
        commits: 1,
      },
    ]);
  });

  test("the commit stats rate limiter claims only ten jobs per installation burst", async () => {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);

    await seedCommitStatFetches(t, 11);

    await expect(
      t.mutation(claimPendingCommitStatFetches, {
        githubInstallationId: "3828258385084547000",
        now: 1_800_000_000_000,
      }),
    ).resolves.toMatchObject({
      rateLimited: true,
      jobs: expect.arrayContaining([
        expect.objectContaining({
          externalId: "github:commit:0000000000000000000000000000000000000000",
        }),
      ]),
    });

    await expect(listCommitStatFetches(t)).resolves.toEqual([
      ...Array.from({ length: 10 }, (_, index) => ({
        externalId: `github:commit:${String(index).padStart(40, "0")}`,
        githubInstallationId: "3828258385084547000",
        repo: "mmeister86/commit-leaderboard-private-test",
        sha: String(index).padStart(40, "0"),
        status: "processing",
        attempts: 1,
      })),
      {
        externalId: "github:commit:0000000000000000000000000000000000000010",
        githubInstallationId: "3828258385084547000",
        repo: "mmeister86/commit-leaderboard-private-test",
        sha: "0000000000000000000000000000000000000010",
        status: "pending",
        attempts: 0,
      },
    ]);
  });

  test("the commit stats worker does not fetch when no line counts are pending", async () => {
    const t = convexTest(schema, modules);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    try {
      await expect(
        t.action(processPendingCommitStats, {
          now: 1_800_000_000_000,
        }),
      ).resolves.toEqual({
        installationCount: 0,
        fetched: 0,
        rateLimited: false,
      });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("a resolved commit updates weekly and all-time score rows", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "mmeister86");

    await t.mutation(ingestNormalizedContributions, {
      deliveryId: "delivery-1",
      event: "push",
      candidates: [scoredPushCandidate],
    });

    await expect(listScores(t)).resolves.toEqual([
      {
        userId,
        period: "weekly",
        points: 19,
        streak: 1,
        commits: 1,
      },
      {
        userId,
        period: "all_time",
        points: 19,
        streak: 1,
        commits: 1,
      },
    ]);
  });

  test("a second commit recomputes score rows from all stored contributions", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "mmeister86");

    await t.mutation(ingestNormalizedContributions, {
      deliveryId: "delivery-1",
      event: "push",
      candidates: [
        {
          ...resolvedPushCandidate,
          externalId: "github:commit:first",
          day: "2026-06-27",
          lines: 1,
        },
      ],
    });
    await t.mutation(ingestNormalizedContributions, {
      deliveryId: "delivery-2",
      event: "push",
      candidates: [
        {
          ...resolvedPushCandidate,
          externalId: "github:commit:second",
          day: "2026-06-28",
          lines: 1,
        },
      ],
    });

    await expect(listScores(t)).resolves.toEqual([
      {
        userId,
        period: "weekly",
        points: 22,
        streak: 2,
        commits: 2,
      },
      {
        userId,
        period: "all_time",
        points: 22,
        streak: 2,
        commits: 2,
      },
    ]);
  });
});

type TestDatabase = {
  run: <Output>(
    func: (ctx: MutationCtx) => Promise<Output>,
  ) => Promise<Output>;
};

async function seedUser(t: TestDatabase, githubLogin: string) {
  return await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("users", {
      clerkId: `clerk-${githubLogin}`,
      tokenIdentifier: `token-${githubLogin}`,
      githubLogin,
      githubUserId: `github-${githubLogin}`,
      avatarUrl: `https://github.com/${githubLogin}.png`,
      createdAt: 1,
      updatedAt: 1,
    });
  });
}

async function listContributions(t: TestDatabase) {
  return await t.run(async (ctx: MutationCtx) => {
    const contributions = await ctx.db.query("contributions").collect();

    return contributions.map((row) => {
      return {
        userId: row.userId,
        period: row.period,
        day: row.day,
        kind: row.kind,
        externalId: row.externalId,
        repo: row.repo,
        onDefaultBranch: row.onDefaultBranch,
      };
    });
  });
}

async function listContributionLines(t: TestDatabase) {
  return await t.run(async (ctx: MutationCtx) => {
    const contributions = await ctx.db.query("contributions").collect();

    return contributions
      .map((row) => ({
        userId: row.userId,
        period: row.period,
        externalId: row.externalId,
        lines: row.lines,
      }))
      .sort(
        (left, right) => periodOrder[left.period] - periodOrder[right.period],
      );
  });
}

async function listCommitStatFetches(t: TestDatabase) {
  return await t.run(async (ctx: MutationCtx) => {
    const fetches = await ctx.db.query("commitStatFetches").collect();

    return fetches
      .map((row) => ({
        externalId: row.externalId,
        githubInstallationId: row.githubInstallationId,
        repo: row.repo,
        sha: row.sha,
        status: row.status,
        attempts: row.attempts,
      }))
      .sort((left, right) => left.externalId.localeCompare(right.externalId));
  });
}

async function seedCommitStatFetches(t: TestDatabase, count: number) {
  await t.run(async (ctx: MutationCtx) => {
    for (let index = 0; index < count; index += 1) {
      const sha = String(index).padStart(40, "0");
      await ctx.db.insert("commitStatFetches", {
        externalId: `github:commit:${sha}`,
        githubInstallationId: "3828258385084547000",
        repo: "mmeister86/commit-leaderboard-private-test",
        sha,
        status: "pending",
        attempts: 0,
        nextAttemptAt: 0,
        createdAt: 1,
        updatedAt: 1,
      });
    }
  });
}

async function listDeliveries(t: TestDatabase) {
  return await t.run(async (ctx: MutationCtx) => {
    const deliveries = await ctx.db.query("webhookDeliveries").collect();

    return deliveries.map((row: Doc<"webhookDeliveries">) => ({
      deliveryId: row.deliveryId,
      event: row.event,
      insertedContributionRows: row.insertedContributionRows,
    }));
  });
}

async function listScores(t: TestDatabase) {
  return await t.run(async (ctx: MutationCtx) => {
    const scores = await ctx.db.query("scores").collect();

    return scores
      .map((row) => ({
        userId: row.userId,
        period: row.period,
        points: row.points,
        streak: row.streak,
        commits: row.commits,
      }))
      .sort((left, right) => periodOrder[left.period] - periodOrder[right.period]);
  });
}
