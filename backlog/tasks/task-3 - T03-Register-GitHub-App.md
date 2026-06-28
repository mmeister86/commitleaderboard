---
id: TASK-3
title: T03 - Register GitHub App
status: In Progress
assignee: []
created_date: '2026-06-27 10:53'
updated_date: '2026-06-28 18:38'
labels:
  - phase-1-lock-setup
  - v1
dependencies: []
references:
  - .docs/backlog.md
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the GitHub App with Contents: read permission for commit data, PR/review subscriptions, per-repo selection, webhook URL, and required secrets in environment configuration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The App installs on a private test repo with repo selection enabled.
- [x] #2 Webhook deliveries reach a logging endpoint.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User reports GitHub App has been created and Convex secrets have been set for GITHUB_APP_ID, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_WEBHOOK_SECRET. Remaining verification: confirm private key secret is present if needed for installation tokens, install app on a private test repo with selected repositories, and verify webhook deliveries reach the logging endpoint.

Executed TASK-3 rest plan through the safe external steps: set GITHUB_PRIVATE_KEY in Convex dev deployment from the downloaded GitHub App PEM file, created private test repository mmeister86/commit-leaderboard-private-test, and opened the GitHub App installation URL preselecting that repository. Blocked on final GitHub UI confirmation before AC #1 and webhook verification can be completed.

Verified GitHub App installation from GitHub UI: Commit Leaderboard Dev installed on @mmeister86 with Only select repositories enabled and exactly mmeister86/commit-leaderboard-private-test selected.

Verified webhook delivery after switching GitHub App webhook URL to Convex smoke endpoint https://successful-leopard-347.convex.site/github/webhook. Test push commit 10395d235a91f3eeec771877639c6ffb9a351fbc on mmeister86/commit-leaderboard-private-test produced GitHub App delivery 3828258385084547000 / guid 21d55956-7320-11f1-9b0e-3e7baac37b9e with status OK and HTTP 200. Earlier delivery to https://webhook.commitleaderboard.com failed with 502 because the host timed out.

Validation passed for TASK-3 smoke endpoint: pnpm run typecheck, pnpm run lint, pnpm convex dev --once, and pnpm run build. Initial build without network failed only because next/font could not fetch Google Fonts; rerun with network access passed.
<!-- SECTION:NOTES:END -->
