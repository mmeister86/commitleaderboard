---
id: TASK-22
title: Remove committed private-key fixture
status: In Progress
assignee:
  - '@codex'
created_date: '2026-06-29 06:23'
updated_date: '2026-06-29 06:25'
labels: []
dependencies: []
modified_files:
  - convex/lib/githubCommitStats.test.ts
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove the dummy RSA private-key PEM from the GitHub commit stats test so no private-key material, real or fake, is committed. Keep JWT signing coverage by generating key material inside the test runtime instead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No PEM private-key fixture or key bytes remain in committed source
- [x] #2 JWT signing test still covers createGitHubAppJwt without committed private-key bytes
- [x] #3 Tests, typecheck, and lint pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the static test PEM with a runtime-generated WebCrypto key.
2. Verify no key fixture remains and JWT coverage still passes.
3. Run full test, typecheck, and lint before committing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed the committed dummy private-key PEM fixture from convex/lib/githubCommitStats.test.ts. The test now generates an exportable RSA key at runtime with WebCrypto before calling createGitHubAppJwt.
Validation: targeted vitest for githubCommitStats.test.ts passed; rg found no key bytes or test fixture; CI=true pnpm test passed (6 files, 43 tests); CI=true pnpm run typecheck passed; CI=true pnpm run lint passed.
<!-- SECTION:NOTES:END -->
