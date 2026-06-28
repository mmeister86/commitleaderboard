---
id: TASK-5
title: T05 - Prove identity mapping spike
status: Done
assignee: []
created_date: '2026-06-27 10:53'
updated_date: '2026-06-28 19:53'
labels:
  - phase-1-lock-setup
  - v1
dependencies: []
references:
  - .docs/backlog.md
priority: high
ordinal: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prove commit author to GitHub login to Clerk user mapping on real webhook payloads and document the fallback for unattributed commits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A real push event resolves to the correct seeded user.
- [x] #2 The fallback for unattributed commits is documented.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add Vitest and write failing identity-mapping helper tests.
2. Implement pure GitHub push author extraction and classification helpers.
3. Add an internal Convex resolver query against users.by_github_login.
4. Update the GitHub webhook smoke endpoint to log resolved/unattributed push commit identity proof.
5. Document the unattributed fallback and verify with tests, typecheck, lint, Convex deploy-once, and a real dev webhook proof.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented identity mapping spike. Evidence: seeded Convex dev user githubLogin=mmeister86 with id jh7c1s0ezf1xw3sr6kg0erwc2d89gz1b; created real private test repo proof commit 2b2dc2f08f7fd7962849bd523020cf68fe7a50b1; Convex webhook delivery 85930f66-7329-11f1-8268-aaa60bca1e46 logged resolved githubLogin=mmeister86 to that user id with no unattributed commits. Fallback documented in docs/identity-mapping.md.

Addressed code review findings: GitHub push identity proof now runs only after HMAC verification, malformed signed push JSON returns 400 instead of crashing, missing webhook secret fails closed, and resolver canonicalizes GitHub login before users.by_github_login lookup. Re-verified real signed push webhook with proof commit c012ec0fec842d104c2e9ad577b9ebe12fc7a2cf and delivery 5a86a02a-732a-11f1-85d3-b2a5f6e8facc resolving to seeded user jh7c1s0ezf1xw3sr6kg0erwc2d89gz1b.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented and verified the identity-mapping spike: push commits are attributed only through commit.author.username, canonicalized to users.by_github_login, protected behind GitHub HMAC verification, and documented with an unattributed fallback that never guesses from pusher or sender. Verified with Vitest, typecheck, lint, Convex deploy-once, and real signed GitHub push delivery 5a86a02a-732a-11f1-85d3-b2a5f6e8facc resolving commit c012ec0fec842d104c2e9ad577b9ebe12fc7a2cf to seeded user jh7c1s0ezf1xw3sr6kg0erwc2d89gz1b.
<!-- SECTION:FINAL_SUMMARY:END -->
