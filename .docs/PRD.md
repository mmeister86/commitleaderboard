# Commit Leaderboard — PRD

**Project type:** Fun / build-in-public side project. Not a flip candidate. No paywall
in v1, no kill metric. Ship it because it's fun and shareable, then move on.
**Domain:** commitleaderboard.com (secured)

---

## Locked scope

- **One user:** Deliberately broad — any developer with a GitHub account who enjoys a
  bit of gamification and friendly competition, from indie hackers and
  build-in-public folks to the founder himself. Conscious deviation from the usual
  one-ICP rule: the appeal is universal and the project is for fun.
- **The pull (not a pain):** Shipping code is invisible and a little lonely. A live,
  public scoreboard turns daily commits into a game — a streak to protect and a rank
  to show off.
- **One core action:** Connect GitHub → your commits get scored → you appear on, and
  climb, a live public leaderboard.
- **Shipped means:** Live at commitleaderboard.com, Connect works end-to-end, commits
  ingested + scored live, the public board updates in real time, a shareable rank
  card exists, Impressum + Datenschutzerklärung live. No payments. No kill metric.

---

## 1. One-liner

See where you rank — a live leaderboard for your GitHub commits.

## 2. The user & the pull

Broad developer audience by design. The desire is real and already proven by behavior:
build-in-public culture on X, the obsession with GitHub contribution graphs and
streaks, profile-README stat widgets, and yearly "dev wrapped" recaps people love to
share. Devs already broadcast their shipping; this makes it live, ranked, and social.
No narrow ICP — the toy is the point.

## 3. Core action / happy path

1. Land on commitleaderboard.com → the live board is right there (it's the demo).
2. Click **Connect GitHub** → sign in (Clerk) + install the GitHub App on chosen repos.
3. Backfill runs → your score appears within seconds and you see your rank.
4. Keep committing → webhooks update your score live; your streak grows.
5. Tap **Share** → a rank card posts to X (the viral loop).

**Lovable moment:** the instant after connecting when your avatar pops onto the live
board and the number ticks up — "oh, I'm on the board, and I'm #34." It lands because
it's *live* (Convex reactivity), *instant* (backfill on install), and *immediately
shareable* (one-tap rank card).

## 4. In scope for v1 (max 5)

- **GitHub App connect (public + private repos)** — Clerk login + app install with
  per-repo selection. Counting commits requires GitHub's **`Contents: read`**
  permission (there is no metadata-only path for commit data), so the app *can* read
  code but only ever reads commit metadata + line counts and **never fetches diffs,
  patches, or file contents, and never stores code.**
- **Ingest + scoring** — the agreed algorithm (log dampening, daily cap, quality
  signals, streak multiplier); weekly season + all-time.
- **Public live leaderboard page** — weekly + all-time, updates in real time.
- **Personal profile + shareable rank card** — OG image, one-tap share to X.
- **Impressum + Datenschutzerklärung** — heavier posture: the app holds read access to
  private source code of (EU) users, even though it only reads/stores commit metadata.
  Get this copy precise (not legal advice).

## 5. Explicitly OUT of scope (parking lot — longer than in-scope)

- Any payment / paywall (revisit a one-time fee **only** if it goes viral).
- Team / org private boards; company accounts.
- Reading diffs / patches / file contents (the app holds `Contents: read` but must
  never call those endpoints — metadata + line counts only).
- Leagues / brackets by follower count or skill tier.
- Multi-platform (GitLab, Bitbucket).
- Deep per-user analytics dashboards; history beyond current seasons.
- Badges, achievements gallery, embeddable board widget, "Made with" embed.
- Notification / digest emails (Resend) — not part of the core loop.
- Cross-period "current streak" table; time-decay scoring variant.
- Profile customization, themes.
- Anti-abuse beyond the basics already baked into scoring (bot filter, dedupe, caps).
- Mobile app.

## 6. Definition of Shipped (binary)

- Deployed on Vercel at commitleaderboard.com (via `staging` branch).
- Connect GitHub works end-to-end: login + app install + backfill.
- Commits ingested via webhook, scored live, board updates in real time — and the
  lovable moment lands (you pop onto the board on connect).
- Shareable rank card renders (OG image) and links back to the site.
- Impressum + Datenschutzerklärung live and linked in the footer.
- Rybbit tracking visit → connect → share.
- Build-in-public launch post published.
- No payment. No kill metric — success = it's live and people share it.

## 7. Data model (Convex)

Per the scoring spec:

- `users` — clerkId, githubLogin, githubUserId, avatarUrl. Indexes: by_clerk,
  by_github_login.
- `contributions` — one deduplicated row per scoreable action (commit / pr_merged /
  review / issue_closed): userId, period, day, kind, externalId, repo, lines,
  onDefaultBranch, createdAt. Indexes: by_external (idempotency), by_user_period.
- `scores` — materialized leaderboard row per (user, period): points, streak,
  commits, updatedAt. Indexes: by_user_period, by_period_points (ordered read).
- `installations` — githubInstallationId ↔ userId, so backfill + webhook events map
  to a user.

## 8. Screens (max 5)

1. **Landing = the live board.** Purpose: hook + proof in one. Primary action:
   Connect GitHub.
2. **Connect / onboarding.** Purpose: Clerk login + GitHub App install. Primary
   action: install the app.
3. **Public leaderboard.** Purpose: the game. Weekly + all-time tabs. Primary action:
   find yourself / share.
4. **Personal profile + rank card.** Purpose: your stats + the shareable. Primary
   action: share to X.
5. **Legal.** Impressum + Datenschutzerklärung.

## 9. Landing page spec

The board **is** the hero and the demo — no canned demo to build. The live public
board (read-only public query, cheap to serve, no login) is the play-before-you-
connect moment and the social proof at once.

- **Hero:** headline + subhead + live top-N board + one CTA ("Connect GitHub").
- **Pull block:** "You ship every day — now show it."
- **How it works:** 3 steps (connect → commit → climb).
- **No pricing block** (free).
- **Comparison** vs the alternative (manual streak counters / the bare contribution
  graph): live, ranked, shareable.
- **Testimonial slots:** fill with early users' shared rank cards.
- **Footer:** Impressum + Datenschutz links, shareable.
- **Palette:** black text, white background, one accent for the CTA.

## 10. Monetization (deferred)

None in v1. If it earns real organic traction, the lightest experiment is a one-time
fee for a cosmetic extra (custom board, profile flair) via **Stripe Managed Payments**
(Merchant of Record — handles VAT). Explicitly out of scope until virality is proven.

## 11. Plan (90h / 30 sessions, side-project pace)

Hours logged matter, not calendar days. **Feature freeze at ~60h (~session 20).**
Because there's no payment integration, the freed time goes where the real risk and
the real lever are: **GitHub App robustness** (identity mapping, webhook idempotency,
rate limits) and the **share card** (the viral mechanic).

## 12. Launch & build-in-public

Launch on X build-in-public — the artifact you post is literally your own rank card.
CTA: connect at commitleaderboard.com. **Cold-start fix:** seed the board with
yourself plus a handful of build-in-public friends so day one isn't an empty board.
Proof = people posting their cards.

## 13. Review (no kill metric, by design)

No stop-on-number. The only discipline is the **feature freeze** so it ships and you
move to the next 30-day project instead of gold-plating. Optional soft trigger (only
if you feel like it): if people share rank cards organically without you nudging,
*then* consider a one-time-fee experiment. Otherwise it stays a free fun project. The
only decision to make now: ship it, don't polish it forever.
