---
id: TASK-5
title: T05 - Prove identity mapping spike
status: To Do
assignee: []
created_date: '2026-06-27 10:53'
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
- [ ] #1 A real push event resolves to the correct seeded user.
- [ ] #2 The fallback for unattributed commits is documented.
<!-- AC:END -->
