import { describe, expect, test } from "vitest";

import {
  canonicalizeGithubLogin,
  classifyAuthorCandidate,
  extractPushAuthorCandidates,
  parseWebhookJson,
  summarizeAuthorResolutions,
  verifyGitHubWebhookSignature,
} from "./identityMapping";

const realStylePushPayload = {
  ref: "refs/heads/main",
  before: "0000000000000000000000000000000000000000",
  after: "10395d235a91f3eeec771877639c6ffb9a351fbc",
  commits: [
    {
      id: "10395d235a91f3eeec771877639c6ffb9a351fbc",
      distinct: true,
      message: "Verify webhook delivery",
      timestamp: "2026-06-28T16:44:00Z",
      author: {
        name: "Matthias Meister",
        email: "mmeister86@users.noreply.github.com",
        username: "mmeister86",
      },
      committer: {
        name: "Matthias Meister",
        email: "mmeister86@users.noreply.github.com",
        username: "mmeister86",
      },
    },
  ],
  pusher: {
    name: "different-pusher",
    email: "different@example.com",
  },
  sender: {
    login: "different-sender",
    id: 123,
  },
};

describe("identity mapping helpers", () => {
  test("extracts commit author usernames from a real-style push payload", () => {
    expect(extractPushAuthorCandidates(realStylePushPayload)).toEqual([
      {
        sha: "10395d235a91f3eeec771877639c6ffb9a351fbc",
        githubLogin: "mmeister86",
      },
    ]);
  });

  test("canonicalizes GitHub logins before matching users", () => {
    expect(canonicalizeGithubLogin(" MMeister86 ")).toBe("mmeister86");
  });

  test("verifies a valid GitHub webhook sha256 signature", async () => {
    const body = JSON.stringify({ commits: [] });
    const signature = await signBody("task5-secret", body);

    await expect(
      verifyGitHubWebhookSignature({
        body,
        signature,
        secret: "task5-secret",
      }),
    ).resolves.toBe(true);
  });

  test("rejects an invalid GitHub webhook sha256 signature", async () => {
    await expect(
      verifyGitHubWebhookSignature({
        body: JSON.stringify({ commits: [] }),
        signature: "sha256=not-the-right-digest",
        secret: "task5-secret",
      }),
    ).resolves.toBe(false);
  });

  test("rejects webhook signatures when the secret is missing", async () => {
    await expect(
      verifyGitHubWebhookSignature({
        body: JSON.stringify({ commits: [] }),
        signature: `sha256=${"0".repeat(64)}`,
        secret: "",
      }),
    ).resolves.toBe(false);
  });

  test("returns a parse error for malformed webhook JSON", () => {
    expect(parseWebhookJson("{not-json")).toEqual({
      ok: false,
      error: "invalid_json",
    });
  });

  test("parses valid webhook JSON", () => {
    expect(parseWebhookJson('{"commits":[]}')).toEqual({
      ok: true,
      value: { commits: [] },
    });
  });

  test("classifies a matched commit author as resolved", () => {
    const [candidate] = extractPushAuthorCandidates(realStylePushPayload);

    expect(classifyAuthorCandidate(candidate, "seeded-user-id")).toEqual({
      kind: "resolved",
      sha: "10395d235a91f3eeec771877639c6ffb9a351fbc",
      githubLogin: "mmeister86",
      userId: "seeded-user-id",
    });
  });

  test("canonicalizes matched author candidates during classification", () => {
    expect(
      classifyAuthorCandidate(
        {
          sha: "10395d235a91f3eeec771877639c6ffb9a351fbc",
          githubLogin: "MMeister86",
        },
        "seeded-user-id",
      ),
    ).toEqual({
      kind: "resolved",
      sha: "10395d235a91f3eeec771877639c6ffb9a351fbc",
      githubLogin: "mmeister86",
      userId: "seeded-user-id",
    });
  });

  test("marks commits without an author username as unattributed", () => {
    const [candidate] = extractPushAuthorCandidates({
      ...realStylePushPayload,
      commits: [
        {
          ...realStylePushPayload.commits[0],
          author: {
            name: "Matthias Meister",
            email: "mmeister86@users.noreply.github.com",
          },
        },
      ],
    });

    expect(classifyAuthorCandidate(candidate, null)).toEqual({
      kind: "unattributed",
      sha: "10395d235a91f3eeec771877639c6ffb9a351fbc",
      githubLogin: null,
      reason: "missing_commit_author_username",
    });
  });

  test("does not use pusher or sender as fallback identity", () => {
    expect(
      extractPushAuthorCandidates({
        ...realStylePushPayload,
        commits: [
          {
            ...realStylePushPayload.commits[0],
            author: {
              name: "Matthias Meister",
              email: "mmeister86@users.noreply.github.com",
            },
          },
        ],
      }),
    ).toEqual([
      {
        sha: "10395d235a91f3eeec771877639c6ffb9a351fbc",
        githubLogin: null,
      },
    ]);
  });

  test("summarizes identity mapping proof for webhook logs", () => {
    expect(
      summarizeAuthorResolutions([
        {
          kind: "resolved",
          sha: "10395d235a91f3eeec771877639c6ffb9a351fbc",
          githubLogin: "mmeister86",
          userId: "seeded-user-id",
        },
        {
          kind: "unattributed",
          sha: "unmatched-sha",
          githubLogin: "unknown-user",
          reason: "no_matching_user",
        },
      ]),
    ).toEqual({
      resolved: [
        {
          sha: "10395d235a91f3eeec771877639c6ffb9a351fbc",
          githubLogin: "mmeister86",
          userId: "seeded-user-id",
        },
      ],
      unattributed: [
        {
          sha: "unmatched-sha",
          githubLogin: "unknown-user",
          reason: "no_matching_user",
        },
      ],
    });
  });
});

async function signBody(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );

  return `sha256=${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}
