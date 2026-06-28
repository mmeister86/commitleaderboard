import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/github/webhook",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const body = await request.text();
    const delivery = request.headers.get("x-github-delivery");
    const event = request.headers.get("x-github-event");
    const signature = request.headers.get("x-hub-signature-256");

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
