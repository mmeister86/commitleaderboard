# Identity Mapping

TASK-5 proves the mapping used for push webhook commits:

1. Read each pushed commit from the GitHub `push` payload.
2. Use only `commit.author.username` as the GitHub login candidate.
3. Canonicalize the login with trim + lowercase.
4. Resolve the canonical login against `users.githubLogin` via the
   `by_github_login` Convex index.
5. If a user is found, the commit can be attributed to that user.

The TASK-3 proof payload came from the private test repository
`mmeister86/commit-leaderboard-private-test`. A real push commit such as
`10395d235a91f3eeec771877639c6ffb9a351fbc` should resolve to the seeded
`mmeister86` user when that user exists in Convex.

## Unattributed Fallback

A pushed commit is treated as unattributed and is not scoreable when:

- `commit.author.username` is missing, null, empty, or whitespace.
- No `users` row exists for the canonicalized `commit.author.username`.

Do not fall back to `pusher`, `sender`, committer details, author email, or repo
owner. Those fields can represent the person or app that pushed, delivered, or
owns the repo, not necessarily the commit author whose work should be scored.

TASK-7 webhook ingest should skip unattributed commits instead of guessing. If
needed later, unmatched commits can be counted in operational logs, but they
must not create `contributions` rows until an explicit, verified user mapping
exists.
