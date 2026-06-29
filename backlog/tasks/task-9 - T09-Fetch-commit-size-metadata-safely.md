---
id: TASK-9
title: T09 - Fetch commit size metadata safely
status: Done
assignee:
  - '@codex'
created_date: '2026-06-27 10:53'
updated_date: '2026-06-29 06:03'
labels:
  - phase-2-core-action
  - v1
dependencies: []
references:
  - .docs/backlog.md
priority: high
ordinal: 9
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mint a GitHub App installation token and fetch commit stats only when line counts are needed, with rate limiting and without requesting diff, patch, or file contents.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Line counts populate contributions.lines.
- [x] #2 No code or diff content is fetched or stored.
- [x] #3 The rate limiter caps bursts.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refresh current docs for GitHub REST commit metadata and @convex-dev/rate-limiter.
2. Add failing tests for installation extraction, metadata-only stats parsing, queued commit stat jobs, skipped unnecessary fetches, and conservative burst caps.
3. Add the rate limiter component configuration and commitStatFetches queue schema.
4. Implement GitHub App token minting and metadata-only commit stats fetch helpers.
5. Wire webhook HTTP/ingest to enqueue and process pending commit stats without storing code/diff content.
6. Run tests, typecheck, lint, record verified acceptance criteria, and leave TASK-9 awaiting user confirmation for Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented commit stats metadata pipeline. Added @convex-dev/rate-limiter component, commitStatFetches queue, GraphQL-only line-count fetch worker, GitHub App installation token minting, and score recomputation after fetched line counts. Privacy fix after review: switched away from REST commit JSON because it can include files[].patch; worker now requests only GraphQL Commit additions/deletions and sums them. Reliability fix after review: rate-limited and retryable jobs schedule a continuation instead of waiting for another webhook. Verification passed: CI=true pnpm test, CI=true pnpm run typecheck, CI=true pnpm run lint.

Post-review hardening: GraphQL request now asks only for Commit additions/deletions, retryable/rate-limited jobs schedule processPendingCommitStats continuations, and GitHub App JWT creation supports both PKCS#8 PRIVATE KEY and GitHub-style PKCS#1 RSA PRIVATE KEY PEMs. Re-verified after hardening: CI=true pnpm test (6 files, 43 tests), CI=true pnpm run typecheck, CI=true pnpm run lint.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented safe commit line-count fetching for TASK-9. Commit contributions missing lines now enqueue metadata jobs; a Convex worker mints GitHub App installation tokens only when needed, requests only GraphQL Commit additions/deletions, updates contributions.lines, recomputes scores, and rate-limits commit stats fetches at 10/min per installation. Verified with CI=true pnpm test, CI=true pnpm run typecheck, and CI=true pnpm run lint.
<!-- SECTION:FINAL_SUMMARY:END -->
