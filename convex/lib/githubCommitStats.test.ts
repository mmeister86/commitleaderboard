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
    const jwt = await createGitHubAppJwt({
      appId: "12345",
      nowSeconds: 1_800_000_000,
      privateKey: [
        "-----BEGIN RSA PRIVATE KEY-----",
        "MIICXQIBAAKBgQDucsGHTV+Xk5dIIyW7seyBD6gzwwlj9wLRgUWonb9fQJzXgiNq",
        "jlAyK9TvV+kBOsgNJ0/8r5yI91u9IZUt6Kx2nc7Xvh64adP4FF+nAg80UYnJMHmq",
        "58cdPgmQMIFgwodJqjwmd67sSwHc6oMYs1axP1nuCRxi8OVbFfT1GhVtMQIDAQAB",
        "AoGBANlGzD5ELOTr4iAjltCPcliwMa7o+/eRL4pEZ3scMzPSpphhx2/jOgRdmGx4",
        "CKPMMlp6BhLU2qib7YZLwanRqMOy4KBuYnXr4i5eKJ4K8IdfrDbmtnDS1aP72aeG",
        "Fd5S4ZrmxgSYyGh9og1mMdiIzC1pZpJWp0+OSax+0sE+jR/ZAkEA/ZcqxF/9TZbC",
        "Mu3X0KsKM9gpUFnDId4vzIVvPbqk1Xj5ucRAjn6mvQPtf27GwgVl+ZUfKWnuclzs",
        "Jk4pAZuDtwJBAPC2wcm6mNtwbaIs77+4OkSRhbsDICxsOqji3IX4kiKJ2/QiSNas",
        "fVNwtuzyhz39DHSSgfryEguFYLXZ8n3FplcCQAl65zxkIkIOSsBAp/rDCiSaBiFc",
        "2bCgb8UDj/8MxTC9zwgk0A0DqxQR24USDRgfv4ovCvUvYpyf4Kwl696Fg80CQDw8",
        "f6ILn9TJ/aVnuVcwsuQVxnFWBucW7lb07lpYKbma5f/h1HhkEbifrCb/SfipKkTB",
        "pOU3Tmyzo8/eCmCO5WECQQDBW3s7pEYY9XXSyrkfFcR/vnfqP3vg1qLYJ+7CSjZH",
        "8bIx6gcJXaEKzOC4Jngxo355IbHrUxvtJ2qfl4Yi8nxx",
        "-----END RSA PRIVATE KEY-----",
      ].join("\n"),
    });

    expect(jwt.split(".")).toHaveLength(3);
  });
});
