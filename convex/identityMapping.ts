import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import {
  canonicalizeGithubLogin,
  classifyAuthorCandidate,
} from "./lib/identityMapping";

const candidateValidator = v.object({
  sha: v.string(),
  githubLogin: v.union(v.string(), v.null()),
});

export const resolvePushAuthorCandidates = internalQuery({
  args: {
    candidates: v.array(candidateValidator),
  },
  handler: async (ctx, args) => {
    const resolutions = [];

    for (const candidate of args.candidates) {
      const githubLogin =
        candidate.githubLogin === null
          ? null
          : canonicalizeGithubLogin(candidate.githubLogin);
      const user =
        githubLogin === null
          ? null
          : await ctx.db
              .query("users")
              .withIndex("by_github_login", (q) =>
                q.eq("githubLogin", githubLogin),
              )
              .unique();

      resolutions.push(classifyAuthorCandidate(candidate, user?._id ?? null));
    }

    return resolutions;
  },
});
