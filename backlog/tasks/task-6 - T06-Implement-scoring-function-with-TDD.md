---
id: TASK-6
title: T06 - Implement scoring function with TDD
status: To Do
assignee: []
created_date: '2026-06-27 10:53'
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
- [ ] #1 All scoring unit tests pass.
- [ ] #2 Gaming vectors including one huge commit, many tiny commits, empty commits, and bot commits score as designed.
<!-- AC:END -->
