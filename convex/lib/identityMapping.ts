export type PushAuthorCandidate = {
  sha: string;
  githubLogin: string | null;
};

export type AuthorResolution =
  | {
      kind: "resolved";
      sha: string;
      githubLogin: string;
      userId: string;
    }
  | {
      kind: "unattributed";
      sha: string;
      githubLogin: string | null;
      reason: "missing_commit_author_username" | "no_matching_user";
    };

export type AuthorResolutionSummary = {
  resolved: Array<{
    sha: string;
    githubLogin: string;
    userId: string;
  }>;
  unattributed: Array<{
    sha: string;
    githubLogin: string | null;
    reason: "missing_commit_author_username" | "no_matching_user";
  }>;
};

export type WebhookJsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: "invalid_json" };

type PushCommit = {
  id?: unknown;
  author?: {
    username?: unknown;
  };
};

export function canonicalizeGithubLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function extractPushAuthorCandidates(
  payload: unknown,
): PushAuthorCandidate[] {
  if (!isRecord(payload) || !Array.isArray(payload.commits)) {
    return [];
  }

  return payload.commits.flatMap((commit): PushAuthorCandidate[] => {
    if (!isPushCommit(commit) || typeof commit.id !== "string") {
      return [];
    }

    const username = commit.author?.username;

    return [
      {
        sha: commit.id,
        githubLogin:
          typeof username === "string" && username.trim() !== ""
            ? canonicalizeGithubLogin(username)
            : null,
      },
    ];
  });
}

export function parseWebhookJson(body: string): WebhookJsonParseResult {
  try {
    return { ok: true, value: JSON.parse(body) as unknown };
  } catch {
    return { ok: false, error: "invalid_json" };
  }
}

export async function verifyGitHubWebhookSignature({
  body,
  signature,
  secret,
}: {
  body: string;
  signature: string | null;
  secret: string;
}): Promise<boolean> {
  if (secret.trim() === "") {
    return false;
  }

  if (signature === null || !signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = `sha256=${await hmacSha256Hex(secret, body)}`;

  return timingSafeEqual(signature, expectedSignature);
}

export function classifyAuthorCandidate(
  candidate: PushAuthorCandidate,
  userId: string | null,
): AuthorResolution {
  const githubLogin =
    candidate.githubLogin === null
      ? null
      : canonicalizeGithubLogin(candidate.githubLogin);

  if (githubLogin === null) {
    return {
      kind: "unattributed",
      sha: candidate.sha,
      githubLogin: null,
      reason: "missing_commit_author_username",
    };
  }

  if (userId === null) {
    return {
      kind: "unattributed",
      sha: candidate.sha,
      githubLogin,
      reason: "no_matching_user",
    };
  }

  return {
    kind: "resolved",
    sha: candidate.sha,
    githubLogin,
    userId,
  };
}

export function summarizeAuthorResolutions(
  resolutions: AuthorResolution[],
): AuthorResolutionSummary {
  return {
    resolved: resolutions.flatMap((resolution) =>
      resolution.kind === "resolved"
        ? [
            {
              sha: resolution.sha,
              githubLogin: resolution.githubLogin,
              userId: resolution.userId,
            },
          ]
        : [],
    ),
    unattributed: resolutions.flatMap((resolution) =>
      resolution.kind === "unattributed"
        ? [
            {
              sha: resolution.sha,
              githubLogin: resolution.githubLogin,
              reason: resolution.reason,
            },
          ]
        : [],
    ),
  };
}

function isPushCommit(value: unknown): value is PushCommit {
  return isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}
