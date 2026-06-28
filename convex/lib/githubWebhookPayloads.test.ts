import { describe, expect, test } from "vitest";

import {
  normalizeGitHubWebhookPayload,
  type NormalizedContributionCandidate,
} from "./githubWebhookPayloads";

const pushPayload = {
  ref: "refs/heads/main",
  repository: {
    full_name: "mmeister86/commit-leaderboard-private-test",
    default_branch: "main",
  },
  commits: [
    {
      id: "10395d235a91f3eeec771877639c6ffb9a351fbc",
      timestamp: "2026-06-28T16:44:00Z",
      author: {
        username: "MMeister86",
      },
    },
  ],
};

describe("normalizeGitHubWebhookPayload", () => {
  test("normalizes a real-style push commit into a contribution candidate", () => {
    expect(normalizeGitHubWebhookPayload("push", pushPayload)).toEqual([
      {
        kind: "commit",
        externalId:
          "github:commit:10395d235a91f3eeec771877639c6ffb9a351fbc",
        repo: "mmeister86/commit-leaderboard-private-test",
        day: "2026-06-28",
        onDefaultBranch: true,
        githubLogin: "mmeister86",
      },
    ] satisfies NormalizedContributionCandidate[]);
  });

  test("marks push commits on non-default branches as off default branch", () => {
    expect(
      normalizeGitHubWebhookPayload("push", {
        ...pushPayload,
        ref: "refs/heads/feature/task-7",
      }),
    ).toEqual([
      {
        kind: "commit",
        externalId:
          "github:commit:10395d235a91f3eeec771877639c6ffb9a351fbc",
        repo: "mmeister86/commit-leaderboard-private-test",
        day: "2026-06-28",
        onDefaultBranch: false,
        githubLogin: "mmeister86",
      },
    ] satisfies NormalizedContributionCandidate[]);
  });

  test("normalizes merged pull requests and ignores unmerged pull requests", () => {
    const mergedPayload = {
      action: "closed",
      repository: {
        full_name: "mmeister86/commit-leaderboard-private-test",
        default_branch: "main",
      },
      pull_request: {
        number: 42,
        merged: true,
        merged_at: "2026-06-28T17:00:00Z",
        user: {
          login: "MMeister86",
        },
        base: {
          ref: "main",
        },
      },
    };

    expect(normalizeGitHubWebhookPayload("pull_request", mergedPayload)).toEqual([
      {
        kind: "pr_merged",
        externalId:
          "github:pull_request:mmeister86/commit-leaderboard-private-test:42:merged",
        repo: "mmeister86/commit-leaderboard-private-test",
        day: "2026-06-28",
        onDefaultBranch: true,
        githubLogin: "mmeister86",
      },
    ] satisfies NormalizedContributionCandidate[]);

    expect(
      normalizeGitHubWebhookPayload("pull_request", {
        ...mergedPayload,
        pull_request: {
          ...mergedPayload.pull_request,
          merged: false,
        },
      }),
    ).toEqual([]);
  });

  test("normalizes submitted pull request reviews and ignores other review actions", () => {
    const submittedPayload = {
      action: "submitted",
      repository: {
        full_name: "mmeister86/commit-leaderboard-private-test",
        default_branch: "main",
      },
      pull_request: {
        base: {
          ref: "main",
        },
      },
      review: {
        id: 987654321,
        submitted_at: "2026-06-28T18:00:00Z",
        user: {
          login: "MMeister86",
        },
      },
    };

    expect(
      normalizeGitHubWebhookPayload("pull_request_review", submittedPayload),
    ).toEqual([
      {
        kind: "review",
        externalId: "github:pull_request_review:987654321",
        repo: "mmeister86/commit-leaderboard-private-test",
        day: "2026-06-28",
        onDefaultBranch: true,
        githubLogin: "mmeister86",
      },
    ] satisfies NormalizedContributionCandidate[]);

    expect(
      normalizeGitHubWebhookPayload("pull_request_review", {
        ...submittedPayload,
        action: "edited",
      }),
    ).toEqual([]);
  });
});
