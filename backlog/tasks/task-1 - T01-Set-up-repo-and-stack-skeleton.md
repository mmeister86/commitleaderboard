---
id: TASK-1
title: T01 - Set up repo and stack skeleton
status: In Progress
assignee:
  - '@codex'
created_date: '2026-06-27 10:53'
updated_date: '2026-06-28 17:00'
labels:
  - phase-1-lock-setup
  - v1
dependencies: []
references:
  - .docs/backlog.md
priority: high
ordinal: 1
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Set up the initial Commit Leaderboard repository skeleton with Next.js App Router, Convex, Clerk, pnpm, and project agent/backlog documentation committed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm dev runs successfully.
- [x] #2 A Convex query renders on a page authenticated via Clerk.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Full implementation plan: docs/superpowers/plans/2026-06-28-task-1-stack-skeleton.md

1. Normalize pnpm scripts and remove the stale npm lockfile.
2. Add a narrow client ConvexClientProvider using ConvexProviderWithClerk and wrap it with ClerkProvider in app/layout.tsx.
3. Add convex/auth.config.ts and a minimal convex/viewer.ts query derived from ctx.auth.getUserIdentity().
4. Replace the starter page with Clerk sign-in controls and an authenticated Convex viewer status widget.
5. Verify pnpm run typecheck, pnpm run lint, pnpm run convex:deploy-once, pnpm dev, and a signed-in browser render.
6. Check acceptance criteria only after verification; leave the task In Progress until user confirms manual testing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the stack skeleton: ClerkProvider + ConvexProviderWithClerk, Convex auth config, viewer.current query, Clerk middleware proxy, smoke-test page, pnpm-only README and scripts.
Verification: pnpm run typecheck passed; pnpm run lint passed; pnpm run convex:deploy-once passed; pnpm run build passed; pnpm dev started outside sandbox at http://localhost:3000 and / returned HTTP 200.
AC #2 remains pending manual signed-in browser verification: sign in with Clerk and confirm the page shows "Convex query authenticated."

User verified the signed-in page in Arc: Convex query rendered as authenticated with a Clerk tokenIdentifier. Follow-up bugfix: ViewerStatus now reads display name, username, and primary email from Clerk useUser() instead of expecting those fields in Convex JWT claims; Convex token remains shown as the backend auth proof. Verification after fix: pnpm run typecheck, pnpm run lint, and pnpm run build passed.
<!-- SECTION:NOTES:END -->
