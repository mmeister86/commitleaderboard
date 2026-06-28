import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { NormalizedContributionCandidate } from "./lib/githubWebhookPayloads";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const ingestNormalizedContributions =
  internal.githubWebhookIngest.ingestNormalizedContributions;

const resolvedPushCandidate = {
  kind: "commit",
  externalId: "github:commit:10395d235a91f3eeec771877639c6ffb9a351fbc",
  repo: "mmeister86/commit-leaderboard-private-test",
  day: "2026-06-28",
  onDefaultBranch: true,
  githubLogin: "mmeister86",
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
