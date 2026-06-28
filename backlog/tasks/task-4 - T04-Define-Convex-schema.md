---
id: TASK-4
title: T04 - Define Convex schema
status: Done
assignee: []
created_date: '2026-06-27 10:53'
updated_date: '2026-06-28 19:29'
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
Define users, contributions, scores, and installations tables with the indexes required by the product spec.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The schema deploys successfully.
- [x] #2 The tables are visible in the Convex dashboard.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a schema surface check for the expected tables and indexes and verify it fails while convex/schema.ts is absent.
2. Create convex/schema.ts with users, installations, contributions, and scores tables using Convex validators and planned indexes.
3. Re-run the schema surface check, typecheck, lint, and Convex deploy-once verification.
4. Record verification notes and check acceptance criteria that can be proven from CLI output.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented Convex schema in convex/schema.ts with users, installations, contributions, and scores tables. Used string validators for opaque GitHub IDs to avoid JavaScript number precision risk. Verification passed: schema surface RED/GREEN check, pnpm run typecheck, pnpm run lint, pnpm convex dev --once, and pnpm convex data listed contributions/installations/scores/users.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Defined the Convex schema for users, installations, contributions, and scores, generated schema-bound Convex data model types, deployed the schema to the dev deployment, and confirmed the four tables are visible via Convex data listing. GitHub external IDs are stored as strings to avoid JavaScript number precision risk.
<!-- SECTION:FINAL_SUMMARY:END -->
