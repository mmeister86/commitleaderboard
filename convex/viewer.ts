import { query } from "./_generated/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return null;
    }

    return {
      name: identity.name ?? null,
      email: identity.email ?? null,
      tokenIdentifier: identity.tokenIdentifier,
    };
  },
});
