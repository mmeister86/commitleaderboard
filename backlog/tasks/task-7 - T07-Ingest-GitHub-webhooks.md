---
id: TASK-7
title: T07 - Ingest GitHub webhooks
status: Done
assignee:
  - '@codex'
created_date: '2026-06-27 10:53'
updated_date: '2026-06-28 20:46'
labels:
  - phase-2-core-action
  - v1
dependencies: []
references:
  - .docs/backlog.md
priority: high
ordinal: 7
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build a Convex HTTP action that verifies GitHub HMAC signatures, deduplicates by delivery or SHA, and normalizes push, pull_request, and pull_request_review events into contributions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Duplicate webhook deliveries insert only once.
- [x] #2 A push event writes the correct contribution rows.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Convex test support and write failing normalizer + ingest tests.
2. Implement pure GitHub webhook normalizers for push, merged pull_request, and submitted pull_request_review.
3. Add webhook delivery persistence and internal ingest mutation with delivery/externalId dedupe.
4. Wire /github/webhook to verified parse, normalize, and ingest supported events.
5. Run tests, typecheck, lint, Convex deploy-once, then record verified acceptance criteria.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented TASK-7 webhook ingest. Added pure GitHub payload normalization for push, merged pull_request, and submitted pull_request_review events; added webhookDeliveries delivery dedupe; added internal ingest mutation that skips unattributed candidates and duplicate external IDs, and inserts weekly + all_time contribution rows. Verification passed: pnpm test (4 files, 31 tests), pnpm run typecheck, pnpm run lint. pnpm run convex:deploy-once was attempted but blocked by the approval reviewer because it would upload local Convex code/schema to the external Convex service; local Convex codegen also invoked an internal reinstall path, so _generated/api.d.ts was updated manually to include the new internal module.

Addressed code review suggestion by adding convex/http.test.ts route coverage: invalid signature + malformed JSON returns 401 and leaves webhookDeliveries empty, proving HMAC rejection happens before parse/ingest. Re-verified pnpm test (5 files, 32 tests), pnpm run typecheck, and pnpm run lint.

User confirmed the GitHub App webhook URL is now active and set to https://successful-leopard-347.convex.site/github/webhook. Final verification before commit: pnpm test (5 files, 32 tests), pnpm run typecheck, pnpm run lint.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented verified GitHub webhook ingest with HMAC-preserving HTTP flow, route regression coverage, event normalization, delivery/externalId dedupe, and contribution row insertion for both weekly and all_time periods. GitHub App webhook is now set to the Convex site URL. Verified with pnpm test (5 files, 32 tests), pnpm run typecheck, and pnpm run lint.
<!-- SECTION:FINAL_SUMMARY:END -->
