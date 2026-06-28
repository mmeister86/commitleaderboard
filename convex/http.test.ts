import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import type { MutationCtx } from "./_generated/server";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("GitHub webhook HTTP route", () => {
  test("rejects invalid signatures before parsing or ingesting", async () => {
    const previousSecret = process.env.GITHUB_WEBHOOK_SECRET;
    process.env.GITHUB_WEBHOOK_SECRET = "task-7-secret";

    try {
      const t = convexTest(schema, modules);
      const response = await t.fetch("/github/webhook", {
        method: "POST",
        headers: {
          "x-github-delivery": "delivery-invalid-signature",
          "x-github-event": "push",
          "x-hub-signature-256": `sha256=${"0".repeat(64)}`,
        },
        body: "{not-json",
      });

      expect(response.status).toBe(401);
      await expect(listDeliveries(t)).resolves.toHaveLength(0);
    } finally {
      if (previousSecret === undefined) {
        delete process.env.GITHUB_WEBHOOK_SECRET;
      } else {
        process.env.GITHUB_WEBHOOK_SECRET = previousSecret;
      }
    }
  });
});

type TestDatabase = {
  run: <Output>(
    func: (ctx: MutationCtx) => Promise<Output>,
  ) => Promise<Output>;
};

async function listDeliveries(t: TestDatabase) {
  return await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.query("webhookDeliveries").collect();
  });
}
