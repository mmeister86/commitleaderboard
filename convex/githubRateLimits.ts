import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import type { ComponentApi } from "@convex-dev/rate-limiter/_generated/component.js";

import { components } from "./_generated/api";

const convexComponents = components as { rateLimiter: ComponentApi };

export const githubRateLimiter = new RateLimiter(
  convexComponents.rateLimiter,
  {
    githubWebhookIngest: {
      kind: "token bucket",
      rate: 60,
      period: MINUTE,
      capacity: 20,
    },
    commitStatsFetch: {
      kind: "token bucket",
      rate: 10,
      period: MINUTE,
      capacity: 10,
    },
  },
);
