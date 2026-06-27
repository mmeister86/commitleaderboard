# backlog.md — Commit Leaderboard

Single source of truth for task status. Smallest viable tasks, each with a one-line
acceptance check. Front-loaded on the core action; landing / share / legal in the back
half. Hour estimates are guides; the feature freeze triggers at ~60h logged.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 1 — Lock & set up (Sessions 1–3, ~9h)

- [ ] **T01 — Repo + stack skeleton.** Next.js (App Router) + Convex + Clerk wired,
  pnpm, agents.md + backlog.md committed.
  *Accept:* `pnpm dev` runs; a Convex query renders on a page authed via Clerk.
- [ ] **T02 — Vercel project + DNS + staging deploy.** commitleaderboard.com on Vercel,
  DNS in Vercel, `staging` branch auto-deploys.
  *Accept:* pushing `main:staging` deploys a live placeholder at the domain.
- [ ] **T03 — GitHub App registered.** App created with `Contents: read` (required for
  commit data) + PR/review event subscriptions, per-repo selection enabled, webhook
  URL; client id/secret + private key in env.
  *Accept:* App installs on a **private** test repo with repo selection; webhook
  deliveries reach a logging endpoint.
- [ ] **T04 — Convex schema.** `users`, `contributions`, `scores`, `installations`
  with indexes per the spec.
  *Accept:* schema deploys; tables visible in the Convex dashboard.
- [ ] **T05 — Spike: identity mapping.** Prove commit author → GitHub login →
  Clerk user mapping on real payloads.
  *Accept:* a real push event resolves to the correct seeded user, with a documented
  fallback for unattributed commits.

## Phase 2 — Core action (Sessions 4–18, ~45h)

- [ ] **T06 — Scoring function (pure, TDD).** Implement `computeScore` with a table of
  input→expected cases covering log dampening, daily cap, quality signals, streak,
  and the anti-gaming filters.
  *Accept:* all unit tests green; gaming vectors (one huge commit, many tiny commits,
  empty commits, bot commits) provably score as designed.
- [ ] **T07 — Webhook ingest.** Convex HTTP action: verify HMAC, dedupe by delivery/
  SHA, normalize push/PR/review into `contributions`.
  *Accept:* duplicate deliveries insert once; a push writes the right rows.
- [ ] **T08 — Recompute on ingest.** After each event, recompute the user's
  current-period `scores` row.
  *Accept:* a new commit updates the user's points/streak deterministically.
- [ ] **T09 — Commit size fetch.** Mint installation token, fetch `/commits/{sha}`
  stats only when size is needed, rate-limited. **Never request diff/patch media types
  or file contents** — metadata + line counts only.
  *Accept:* line counts populate `contributions.lines`; no code/diff is ever fetched or
  stored; rate limiter caps bursts.
- [ ] **T10 — Backfill on install.** One-time pull of the last N days of commits when
  the App is installed.
  *Accept:* a freshly connected user appears on the board within seconds.
- [ ] **T11 — Connect flow (Clerk + App install).** UI: sign in, then install the
  GitHub App with **per-repo selection (public + private)**, link installation→user;
  make clear which repos count and that only commit metadata is read.
  *Accept:* a new user connects with a private repo selected and sees their rank.
- [ ] **T12 — Public leaderboard query + page.** Reactive `getLeaderboard` (weekly +
  all-time), server-rendered page, no login.
  *Accept:* the board renders top-N and **updates live** as scores change.
- [ ] **T13 — Lovable moment polish.** The connect→pop-onto-board→number-ticks-up
  moment, plus empty/error states.
  *Accept:* on connect, the user visibly lands on the board; empty board and failed
  install are handled gracefully.

## Phase 3 — Landing & polish (Sessions 19–24, ~18h) — ⛔ feature freeze ~60h / session 20

- [ ] **T14 — Rank card (OG image).** Dynamic, great-looking shareable card via
  `ImageResponse`, cached.
  *Accept:* `/card/[user]` returns a correct, on-brand OG image.
- [ ] **T15 — One-tap share to X.** Share button prefills a post with the card + link.
  *Accept:* tapping share opens X with image + commitleaderboard.com.
- [ ] **T16 — Landing page.** Hero = live board + one CTA; pull block; how-it-works;
  comparison; testimonial slots; footer. Use shadcnblocks (Free/Basic/Pro).
  *Accept:* landing renders the live board as hero with a working Connect CTA.
- [ ] **T17 — Personal profile page.** Your stats, streak, history-in-season, share.
  *Accept:* `/u/[login]` shows correct stats and the share action.

## Phase 4 — Legal, analytics & launch (Sessions 25–30, ~18h)

- [ ] **T18 — Impressum + Datenschutzerklärung.** Two static routes, footer-linked;
  privacy text is **accurate**: the app holds `Contents: read` (code-read access) but
  reads and stores only commit metadata + line counts, never diffs/code; private-repo
  source of EU users is in scope, so treat this as the sensitive page.
  *Accept:* both pages live and linked; copy precisely matches actual data access
  (consider a professional review — not legal advice).
- [ ] **T19 — Rybbit analytics.** Self-hosted; track visit → connect → share.
  *Accept:* the three funnel events show up in Rybbit.
- [ ] **T20 — Seed the board (cold-start).** Onboard the founder + a handful of
  build-in-public friends so day one isn't empty.
  *Accept:* the public board shows ≥8 real participants before launch.
- [ ] **T21 — Launch.** `git push origin main:staging`; publish the build-in-public
  post with your own rank card.
  *Accept:* site is live, board updates in real time, launch post is out.

---

### Parking lot (do NOT build in v1)

Payments / one-time fee · team/org private boards · private-repo scoring · leagues &
brackets · multi-platform (GitLab/Bitbucket) · deep analytics & long history · badges /
achievements / embeddable widget · digest emails · cross-period streak table /
time-decay variant · profile themes · mobile app.
