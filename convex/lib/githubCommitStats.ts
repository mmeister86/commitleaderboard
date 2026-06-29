export type CommitMetadataRequest = {
  url: string;
  init: {
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
  };
};

export function extractCommitLineCount(payload: unknown): number | null {
  if (
    !isRecord(payload) ||
    !isRecord(payload.data) ||
    !isRecord(payload.data.repository) ||
    !isRecord(payload.data.repository.object)
  ) {
    return null;
  }

  const commit = payload.data.repository.object;
  const additions = commit.additions;
  const deletions = commit.deletions;

  if (
    typeof additions !== "number" ||
    !Number.isFinite(additions) ||
    typeof deletions !== "number" ||
    !Number.isFinite(deletions)
  ) {
    return null;
  }

  return additions + deletions;
}

export function buildCommitMetadataRequest({
  repo,
  sha,
  token,
}: {
  repo: string;
  sha: string;
  token: string;
}): CommitMetadataRequest {
  const [owner, repository] = splitRepo(repo);

  return {
    url: "https://api.github.com/graphql",
    init: {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        query:
          "query CommitLineStats($owner: String!, $name: String!, $oid: GitObjectID!) { repository(owner: $owner, name: $name) { object(oid: $oid) { __typename ... on Commit { additions deletions } } } }",
        variables: {
          owner,
          name: repository,
          oid: sha,
        },
      }),
    },
  };
}

export function shaFromCommitExternalId(externalId: string): string | null {
  const prefix = "github:commit:";

  if (!externalId.startsWith(prefix)) {
    return null;
  }

  const sha = externalId.slice(prefix.length);
  return sha === "" ? null : sha;
}

export async function createGitHubAppJwt({
  appId,
  privateKey,
  nowSeconds,
}: {
  appId: string;
  privateKey: string;
  nowSeconds: number;
}) {
  const header = base64UrlEncodeJson({ alg: "RS256", typ: "JWT" });
  const payload = base64UrlEncodeJson({
    iat: nowSeconds - 60,
    exp: nowSeconds + 9 * 60,
    iss: appId,
  });
  const unsignedToken = `${header}.${payload}`;
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  );

  return `${unsignedToken}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

export function buildInstallationTokenRequest({
  githubInstallationId,
  jwt,
}: {
  githubInstallationId: string;
  jwt: string;
}) {
  return {
    url: `https://api.github.com/app/installations/${encodeURIComponent(githubInstallationId)}/access_tokens`,
    init: {
      method: "POST" as const,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${jwt}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  };
}

export function extractInstallationToken(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  return typeof payload.token === "string" && payload.token.trim() !== ""
    ? payload.token
    : null;
}

function splitRepo(repo: string) {
  const [owner, repository, extra] = repo.split("/");

  if (
    owner === undefined ||
    owner === "" ||
    repository === undefined ||
    repository === "" ||
    extra !== undefined
  ) {
    throw new Error("Expected GitHub repo in owner/repo form");
  }

  return [owner, repository] as const;
}

async function importPrivateKey(privateKey: string) {
  const keyBytes = pemToArrayBuffer(privateKey);
  return await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function pemToArrayBuffer(privateKey: string) {
  const isPkcs1 = privateKey.includes("BEGIN RSA PRIVATE KEY");
  const label = isPkcs1 ? "RSA PRIVATE KEY" : "PRIVATE KEY";
  const base64 = privateKey
    .replace(`-----BEGIN ${label}-----`, "")
    .replace(`-----END ${label}-----`, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return isPkcs1 ? wrapPkcs1PrivateKeyInPkcs8(bytes) : bytes.buffer;
}

function wrapPkcs1PrivateKeyInPkcs8(pkcs1Key: Uint8Array) {
  const rsaEncryptionAlgorithm = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
    0x01, 0x05, 0x00,
  ]);
  const version = new Uint8Array([0x02, 0x01, 0x00]);
  const privateKey = derEncode(0x04, pkcs1Key);

  return derEncode(
    0x30,
    concatBytes(version, rsaEncryptionAlgorithm, privateKey),
  ).buffer;
}

function derEncode(tag: number, value: Uint8Array) {
  return concatBytes(new Uint8Array([tag]), derLength(value.length), value);
}

function derLength(length: number) {
  if (length < 128) {
    return new Uint8Array([length]);
  }

  const bytes = [];
  let remaining = length;

  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }

  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function concatBytes(...chunks: Uint8Array[]) {
  const output = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.length, 0),
  );
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function base64UrlEncodeJson(value: unknown) {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
