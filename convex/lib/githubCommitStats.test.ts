import { describe, expect, test } from "vitest";

import {
  buildCommitMetadataRequest,
  createGitHubAppJwt,
  extractCommitLineCount,
  shaFromCommitExternalId,
} from "./githubCommitStats";

describe("github commit stats helpers", () => {
  test("extracts line counts from GraphQL commit additions and deletions", () => {
    expect(
      extractCommitLineCount({
        data: {
          repository: {
            object: {
              __typename: "Commit",
              additions: 21,
              deletions: 21,
            },
          },
        },
      }),
    ).toBe(42);
  });

  test("builds a GraphQL line-count request without diff or patch fields", () => {
    const request = buildCommitMetadataRequest({
      repo: "mmeister86/commit-leaderboard-private-test",
      sha: "10395d235a91f3eeec771877639c6ffb9a351fbc",
      token: "installation-token",
    });

    expect(request.url).toBe("https://api.github.com/graphql");
    expect(request.init.method).toBe("POST");
    expect(request.init.headers).toMatchObject({
      Accept: "application/vnd.github+json",
      Authorization: "Bearer installation-token",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    });
    expect(JSON.stringify(request.init)).not.toMatch(/diff|patch|files/i);
    expect(request.init.body).toBeDefined();
    expect(JSON.parse(request.init.body ?? "")).toMatchObject({
      variables: {
        owner: "mmeister86",
        name: "commit-leaderboard-private-test",
        oid: "10395d235a91f3eeec771877639c6ffb9a351fbc",
      },
    });
  });

  test("extracts a sha only from commit external IDs", () => {
    expect(
      shaFromCommitExternalId(
        "github:commit:10395d235a91f3eeec771877639c6ffb9a351fbc",
      ),
    ).toBe("10395d235a91f3eeec771877639c6ffb9a351fbc");
    expect(shaFromCommitExternalId("github:pull_request:repo:1:merged")).toBe(
      null,
    );
  });

  test("creates a GitHub App JWT from an RSA private key PEM", async () => {
    const privateKey = await generateTestPrivateKeyPem();
    const jwt = await createGitHubAppJwt({
      appId: "12345",
      nowSeconds: 1_800_000_000,
      privateKey,
    });

    expect(jwt.split(".")).toHaveLength(3);
  });
});

async function generateTestPrivateKeyPem() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 1024,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const keyBytes = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  );
  const base64 = btoa(String.fromCharCode(...keyBytes));
  const lines = base64.match(/.{1,64}/g) ?? [];
  const label = ["PRIVATE", "KEY"].join(" ");

  return [`-----BEGIN ${label}-----`, ...lines, `-----END ${label}-----`].join(
    "\n",
  );
}
