---
id: TASK-6
title: T06 - Implement scoring function with TDD
status: Done
assignee: []
created_date: '2026-06-27 10:53'
updated_date: '2026-06-28 20:16'
labels:
  - phase-2-core-action
  - v1
dependencies: []
references:
  - .docs/backlog.md
priority: high
ordinal: 6
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement computeScore as a pure dependency-free function with a table of input-to-expected cases covering log dampening, daily cap, quality signals, streak, and anti-gaming filters.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All scoring unit tests pass.
- [x] #2 Gaming vectors including one huge commit, many tiny commits, empty commits, and bot commits score as designed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create convex/lib/scoring.test.ts first with table-driven failing tests for empty input, commit dampening, daily cap, all quality signal kinds, streaks, and anti-gaming vectors.
2. Run the targeted scoring test and confirm RED because convex/lib/scoring does not exist yet.
3. Create convex/lib/scoring.ts with pure dependency-free computeScore and exported ScoreContribution/ScoreResult/ContributionKind types.
4. Run the targeted scoring test and confirm GREEN.
5. Run pnpm test, pnpm run typecheck, and pnpm run lint.
6. Record verification notes and check acceptance criteria that can be proven from CLI output.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented convex/lib/scoring.ts as a pure dependency-free scoring helper with table-driven Vitest coverage in convex/lib/scoring.test.ts. Verified RED first with the expected missing ./scoring module failure, then GREEN after implementation. Validation passed: pnpm test convex/lib/scoring.test.ts (12 tests), pnpm test (24 tests), pnpm run typecheck, and pnpm run lint. Spec and code-quality subagent reviews both approved. Caller invariant for later ingest/recompute work: day must be normalized as YYYY-MM-DD before calling computeScore.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented pure dependency-free computeScore with table-driven tests for dampening, daily caps, all contribution kinds, streaks, and anti-gaming vectors. Verified with pnpm test, pnpm run typecheck, and pnpm run lint.
<!-- SECTION:FINAL_SUMMARY:END -->
