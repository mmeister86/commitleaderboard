---
id: TASK-7
title: T07 - Ingest GitHub webhooks
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
ordinal: 7
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build a Convex HTTP action that verifies GitHub HMAC signatures, deduplicates by delivery or SHA, and normalizes push, pull_request, and pull_request_review events into contributions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Duplicate webhook deliveries insert only once.
- [ ] #2 A push event writes the correct contribution rows.
<!-- AC:END -->
