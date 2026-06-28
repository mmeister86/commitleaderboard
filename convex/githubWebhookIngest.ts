import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { canonicalizeGithubLogin } from "./lib/identityMapping";

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
});

const contributionPeriods = ["weekly", "all_time"] as const;

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
          onDefaultBranch: candidate.onDefaultBranch,
          createdAt: now,
        });
        insertedContributionRows += 1;
      }
    }

    await ctx.db.insert("webhookDeliveries", {
      deliveryId: args.deliveryId,
      event: args.event,
      receivedAt: now,
      insertedContributionRows,
    });

    return {
      duplicateDelivery: false,
      insertedContributionRows,
    };
  },
});
