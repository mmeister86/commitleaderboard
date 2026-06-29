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

const commitStatFetchStatus = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("complete"),
  v.literal("failed"),
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

  webhookDeliveries: defineTable({
    deliveryId: v.string(),
    event: v.string(),
    receivedAt: v.number(),
    insertedContributionRows: v.number(),
  }).index("by_delivery_id", ["deliveryId"]),

  commitStatFetches: defineTable({
    externalId: v.string(),
    githubInstallationId: v.string(),
    repo: v.string(),
    sha: v.string(),
    status: commitStatFetchStatus,
    attempts: v.number(),
    nextAttemptAt: v.number(),
    lastMetadataError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_status_and_next_attempt_at", ["status", "nextAttemptAt"])
    .index("by_installation_status_and_next_attempt_at", [
      "githubInstallationId",
      "status",
      "nextAttemptAt",
    ]),

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
