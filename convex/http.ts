import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  parseWebhookJson,
  verifyGitHubWebhookSignature,
} from "./lib/identityMapping";
import {
  isSupportedGitHubWebhookEvent,
  normalizeGitHubWebhookPayload,
} from "./lib/githubWebhookPayloads";

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

    if (!isSupportedGitHubWebhookEvent(event)) {
      console.log("Ignored unsupported GitHub webhook event", {
        delivery,
        event,
      });

      return Response.json({ ok: true, ignored: true });
    }

    if (delivery === null || delivery.trim() === "") {
      console.warn("Rejected GitHub webhook with missing delivery id", {
        event,
      });

      return new Response("Missing delivery id", { status: 400 });
    }

    const payload = parseWebhookJson(body);

    if (!payload.ok) {
      console.warn("Rejected GitHub webhook with invalid JSON", {
        delivery,
        event,
      });

      return new Response("Invalid JSON", { status: 400 });
    }

    const candidates = normalizeGitHubWebhookPayload(event, payload.value);
    const result = await ctx.runMutation(
      internal.githubWebhookIngest.ingestNormalizedContributions,
      {
        deliveryId: delivery,
        event,
        candidates,
      },
    );

    console.log("Ingested GitHub webhook delivery", {
      delivery,
      event,
      candidateCount: candidates.length,
      ...result,
    });

    return Response.json({ ok: true, ...result });
  }),
});

export default http;
