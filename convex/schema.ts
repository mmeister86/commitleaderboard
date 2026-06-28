import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const period = v.union(v.literal("weekly"), v.literal("all_time"));

const contributionKind = v.union(
  v.literal("commit"),
  v.literal("pr_merged"),
  v.literal("review"),
  v.literal("issue_closed"),
);

const repositorySelection = v.union(
  v.literal("all"),
  v.literal("selected"),
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    tokenIdentifier: v.string(),
    githubLogin: v.string(),
    githubUserId: v.string(),
    avatarUrl: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk", ["clerkId"])
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_github_login", ["githubLogin"])
    .index("by_github_user_id", ["githubUserId"]),

  installations: defineTable({
    githubInstallationId: v.string(),
    userId: v.id("users"),
    accountLogin: v.string(),
    accountId: v.string(),
    repositorySelection,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_github_installation_id", ["githubInstallationId"])
    .index("by_user_id", ["userId"]),

  contributions: defineTable({
    userId: v.id("users"),
    period,
    day: v.string(),
    kind: contributionKind,
    externalId: v.string(),
    repo: v.string(),
    lines: v.optional(v.number()),
    onDefaultBranch: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_user_id_and_period", ["userId", "period"])
    .index("by_user_id_and_day", ["userId", "day"]),

  scores: defineTable({
    userId: v.id("users"),
    period,
    points: v.number(),
    streak: v.number(),
    commits: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id_and_period", ["userId", "period"])
    .index("by_period_and_points", ["period", "points"]),
});
