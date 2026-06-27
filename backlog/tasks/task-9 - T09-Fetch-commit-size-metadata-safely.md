---
id: TASK-9
title: T09 - Fetch commit size metadata safely
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
ordinal: 9
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mint a GitHub App installation token and fetch commit stats only when line counts are needed, with rate limiting and without requesting diff, patch, or file contents.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Line counts populate contributions.lines.
- [ ] #2 No code or diff content is fetched or stored.
- [ ] #3 The rate limiter caps bursts.
<!-- AC:END -->
