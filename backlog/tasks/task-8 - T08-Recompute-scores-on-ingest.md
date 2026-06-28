---
id: TASK-8
title: T08 - Recompute scores on ingest
status: Done
assignee:
  - '@codex'
created_date: '2026-06-27 10:53'
updated_date: '2026-06-28 21:06'
labels:
  - phase-2-core-action
  - v1
dependencies: []
references:
  - .docs/backlog.md
priority: high
ordinal: 8
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After each contribution event is ingested, recompute the user current-period scores row deterministically.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A new commit updates the user points and streak deterministically.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add failing Convex ingest tests for score creation, recomputation, and dedupe behavior.
2. Run targeted tests and confirm the new score tests fail before production changes.
3. Implement minimal score recomputation/upsert inside convex/githubWebhookIngest.ts using existing computeScore.
4. Re-run targeted tests, then full test/typecheck/lint verification.
5. Record verification notes and check acceptance criteria without marking the task Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented deterministic score recomputation inside convex/githubWebhookIngest.ts. New ingest candidates can carry optional lines, inserted contribution rows persist lines when present, affected user/period pairs are recomputed from stored contributions with computeScore, and scores rows are inserted or patched via by_user_id_and_period. No GitHub API calls, diff/code fetching, or rate limiter work was added; TASK-9 remains responsible for populating line counts from GitHub.

TDD evidence: targeted test first failed with Validator error: Unexpected field `lines` in object. After implementation, verification passed: CI=true pnpm test convex/githubWebhookIngest.test.ts convex/lib/scoring.test.ts (2 files, 17 tests), CI=true pnpm test (5 files, 34 tests), CI=true pnpm run typecheck, CI=true pnpm run lint. Spec and code-quality subagent reviews approved.

Live webhook test completed with real GitHub commit 2ab721be52df774bc66ae821b50c0a3279cb8d2c pushed to mmeister86/commit-leaderboard-private-test on main. Convex dev deployment received push delivery aeb3c1aa-7334-11f1-97a3-9be6ab4ce0f1 and inserted 2 contribution rows for weekly/all_time. Score rows for mmeister86 were created/updated by the recompute path with points=0, streak=0, commits=0 because real push payloads do not include lines until TASK-9 populates contribution line counts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Recomputed user period score rows during webhook ingest using stored contributions and the existing pure computeScore helper. Verified with CI=true pnpm test (5 files, 34 tests), CI=true pnpm run typecheck, CI=true pnpm run lint, subagent reviews, and live GitHub webhook commit 2ab721be52df774bc66ae821b50c0a3279cb8d2c into the private test repository.
<!-- SECTION:FINAL_SUMMARY:END -->
