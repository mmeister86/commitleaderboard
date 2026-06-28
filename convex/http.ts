import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  extractPushAuthorCandidates,
  parseWebhookJson,
  summarizeAuthorResolutions,
  verifyGitHubWebhookSignature,
} from "./lib/identityMapping";

const http = httpRouter();

http.route({
  path: "/github/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const delivery = request.headers.get("x-github-delivery");
    const event = request.headers.get("x-github-event");
    const signature = request.headers.get("x-hub-signature-256");

    const isValidSignature = await verifyGitHubWebhookSignature({
      body,
      signature,
      secret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
    });

    if (!isValidSignature) {
      console.warn("Rejected GitHub webhook with invalid signature", {
        delivery,
        event,
        hasSignature: signature !== null,
      });

      return new Response("Invalid signature", { status: 401 });
    }

    if (event === "push") {
      const payload = parseWebhookJson(body);

      if (!payload.ok) {
        console.warn("Rejected GitHub push webhook with invalid JSON", {
          delivery,
        });

        return new Response("Invalid JSON", { status: 400 });
      }

      const candidates = extractPushAuthorCandidates(payload.value);
      const resolutions = await ctx.runQuery(
        internal.identityMapping.resolvePushAuthorCandidates,
        { candidates },
      );

      console.log("GitHub push identity mapping proof", {
        delivery,
        ...summarizeAuthorResolutions(resolutions),
      });
    }

    console.log("Received GitHub webhook smoke delivery", {
      delivery,
      event,
      hasSignature: signature !== null,
      bodyLength: body.length,
    });

    return Response.json({ ok: true });
  }),
});

export default http;
