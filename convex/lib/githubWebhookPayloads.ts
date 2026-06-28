import { canonicalizeGithubLogin } from "./identityMapping";

export type NormalizedContributionCandidate = {
  kind: "commit" | "pr_merged" | "review";
  externalId: string;
  repo: string;
  day: string;
  onDefaultBranch: boolean;
  githubLogin: string | null;
};

export type SupportedGitHubWebhookEvent =
  | "push"
  | "pull_request"
  | "pull_request_review";

export function isSupportedGitHubWebhookEvent(
  event: string | null,
): event is SupportedGitHubWebhookEvent {
  return (
    event === "push" ||
    event === "pull_request" ||
    event === "pull_request_review"
  );
}

export function normalizeGitHubWebhookPayload(
  event: SupportedGitHubWebhookEvent,
  payload: unknown,
): NormalizedContributionCandidate[] {
  if (event === "push") {
    return normalizePushPayload(payload);
  }

  if (event === "pull_request") {
    return normalizePullRequestPayload(payload);
  }

  return normalizePullRequestReviewPayload(payload);
}

function normalizePushPayload(
  payload: unknown,
): NormalizedContributionCandidate[] {
  if (!isRecord(payload) || !Array.isArray(payload.commits)) {
    return [];
  }

  const repo = repositoryFullName(payload.repository);
  const defaultBranch = repositoryDefaultBranch(payload.repository);
  const ref = stringField(payload, "ref");

  if (repo === null || defaultBranch === null || ref === null) {
    return [];
  }

  return payload.commits.flatMap((commit): NormalizedContributionCandidate[] => {
    if (!isRecord(commit)) {
      return [];
    }

    const sha = stringField(commit, "id");
    const day = dayFromTimestamp(stringField(commit, "timestamp"));

    if (sha === null || day === null) {
      return [];
    }

    return [
      {
        kind: "commit",
        externalId: `github:commit:${sha}`,
        repo,
        day,
        onDefaultBranch: ref === `refs/heads/${defaultBranch}`,
        githubLogin: userLogin(commit.author),
      },
    ];
  });
}

function normalizePullRequestPayload(
  payload: unknown,
): NormalizedContributionCandidate[] {
  if (!isRecord(payload) || stringField(payload, "action") !== "closed") {
    return [];
  }

  const repo = repositoryFullName(payload.repository);
  const defaultBranch = repositoryDefaultBranch(payload.repository);
  const pullRequest = payload.pull_request;

  if (!isRecord(pullRequest) || repo === null || defaultBranch === null) {
    return [];
  }

  const number = numberField(pullRequest, "number");
  const merged = booleanField(pullRequest, "merged");
  const day = dayFromTimestamp(stringField(pullRequest, "merged_at"));
  const baseRef = isRecord(pullRequest.base)
    ? stringField(pullRequest.base, "ref")
    : null;

  if (number === null || merged !== true || day === null || baseRef === null) {
    return [];
  }

  return [
    {
      kind: "pr_merged",
      externalId: `github:pull_request:${repo}:${number}:merged`,
      repo,
      day,
      onDefaultBranch: baseRef === defaultBranch,
      githubLogin: userLogin(pullRequest.user),
    },
  ];
}

function normalizePullRequestReviewPayload(
  payload: unknown,
): NormalizedContributionCandidate[] {
  if (!isRecord(payload) || stringField(payload, "action") !== "submitted") {
    return [];
  }

  const repo = repositoryFullName(payload.repository);
  const defaultBranch = repositoryDefaultBranch(payload.repository);
  const review = payload.review;
  const pullRequest = payload.pull_request;

  if (
    !isRecord(review) ||
    !isRecord(pullRequest) ||
    repo === null ||
    defaultBranch === null
  ) {
    return [];
  }

  const reviewId = numberField(review, "id");
  const day = dayFromTimestamp(stringField(review, "submitted_at"));
  const baseRef = isRecord(pullRequest.base)
    ? stringField(pullRequest.base, "ref")
    : null;

  if (reviewId === null || day === null || baseRef === null) {
    return [];
  }

  return [
    {
      kind: "review",
      externalId: `github:pull_request_review:${reviewId}`,
      repo,
      day,
      onDefaultBranch: baseRef === defaultBranch,
      githubLogin: userLogin(review.user),
    },
  ];
}

function repositoryFullName(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const fullName = stringField(value, "full_name");
  return fullName === "" ? null : fullName;
}

function repositoryDefaultBranch(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const defaultBranch = stringField(value, "default_branch");
  return defaultBranch === "" ? null : defaultBranch;
}

function userLogin(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const login = stringField(value, "login") ?? stringField(value, "username");
  return login === null || login.trim() === ""
    ? null
    : canonicalizeGithubLogin(login);
}

function dayFromTimestamp(timestamp: string | null): string | null {
  if (timestamp === null) {
    return null;
  }

  const milliseconds = Date.parse(timestamp);
  if (Number.isNaN(milliseconds)) {
    return null;
  }

  return new Date(milliseconds).toISOString().slice(0, 10);
}

function stringField(
  value: Record<string, unknown>,
  field: string,
): string | null {
  return typeof value[field] === "string" ? value[field] : null;
}

function numberField(
  value: Record<string, unknown>,
  field: string,
): number | null {
  return typeof value[field] === "number" && Number.isFinite(value[field])
    ? value[field]
    : null;
}

function booleanField(
  value: Record<string, unknown>,
  field: string,
): boolean | null {
  return typeof value[field] === "boolean" ? value[field] : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
