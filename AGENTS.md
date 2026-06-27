
# agents.md — Commit Leaderboard

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


Rulebook for the coding agents. The machine has both frameworks installed; use both:

- **obra/superpowers** (`github.com/obra/superpowers`) — development *methodology*;
  skills auto-trigger.
- **msitarzewski/agency-agents** (`github.com/msitarzewski/agency-agents`) —
  *specialist personas* in `~/.claude/agents/`.

---

## Methodology — superpowers (mandatory)

- All coding is **test-driven** and **subagent-driven**. RED-GREEN-REFACTOR: write the
  failing test first, watch it fail, write the minimal code to pass, refactor, commit.
  Code written before its test gets deleted. No exceptions.
- Run every change through the superpowers flow: brainstorming → writing-plans →
  **feature-branch per task** → subagent-driven-development → test-driven-development →
  requesting-code-review → finishing-a-development-branch (merge to main, never
  directly to staging).
- Use **dispatching-parallel-agents** for independent tasks — each on its own feature
  branch (`feat/github-app`, `feat/scoring`, `feat/leaderboard-page`,
  `feat/rank-card`), reviewed and merged to main sequentially. Default to parallel
  whenever tasks don't share files.
- Hold the line on YAGNI, DRY, complexity reduction, and **evidence over claims**
  (verify it works — don't assert it). The scoring function in particular must be
  proven against a table of input→expected cases.

## Specialists — agency-agents (invoke per task, keep the roster minimal)

- *Scope/validation:* Product Manager, Sprint Prioritizer.
- *Build:* Rapid Prototyper (the DOM/identity spikes), Backend Architect (Convex
  schema + scoring + webhook ingest), Frontend Developer (Next.js + shadcn board),
  Minimal Change Engineer (small diffs).
- *Quality gate:* Code Reviewer, Reality Checker (production-readiness), Evidence
  Collector (visual proof of the core action — the board updating live).
- *Launch:* UI Designer (landing + rank card), Growth Hacker, Twitter/X Engager.

## Workflow & tasks

- Every change starts as a task in `backlog.md`. No task → no work. superpowers' plans
  expand a task into steps; `backlog.md` stays the single source of truth for status.
- Tasks are small, outcome-named, traceable; reference the task id in commits.
- A task is done only when its tests are green and the acceptance check passes.

## Code philosophy

- Write the least code that ships the task. Deleting beats adding.
- Keep the **scoring logic a pure, dependency-free function** — it is the most-tested
  unit in the codebase and the first RED-GREEN-REFACTOR target.
- Modular and colocated; no premature abstraction, no speculative generality.
- Prefer framework/library defaults over custom solutions.
- No dead code, no unused deps, no "we might need this later".

## Stack conventions

- **Package manager: always pnpm** (`pnpm dlx`, `pnpm add`). Never npm/yarn.
- **Next.js** (latest, App Router). Server Components by default; client only when
  needed. The public leaderboard page is server-rendered and reads Convex reactively.
- **Convex (cloud)** for ALL data and backend logic — no separate API layer. Scoring,
  ingest, and the leaderboard query live here.
- **Clerk (auth) via `ConvexProviderWithClerk`** — JWT-based, validated by Convex via
  `ctx.auth.getUserIdentity()`. Clerk's GitHub OAuth identifies *who the user is*;
  it is **separate** from the GitHub App install (repo read access + webhooks). Wrap
  the app `<ClerkProvider>` → `<ConvexProviderWithClerk>`; set `auth.config.ts` with
  `CLERK_JWT_ISSUER_DOMAIN`.
- **GitHub App (new core component).** Two jobs, don't conflate them:
  - *Webhooks* — push / pull_request / pull_request_review events hit a Convex HTTP
    action. Verify `X-Hub-Signature-256` (HMAC), dedupe by `X-GitHub-Delivery` / SHA.
  - *Installation tokens* — sign the App JWT (Node runtime Convex action) to mint an
    installation token for the one-time backfill and for fetching commit `stats`
    (the push payload has no line counts).
  - **Permissions: `Contents: read` is required** — GitHub has no metadata-only
    permission for commit data, so subscribing to `push` and reading commit `stats`
    both need `Contents: read`, which grants read access to the code itself. Mitigate
    with **per-repo selection at install** (the user picks exactly which public/private
    repos count). Read **only** commit metadata + line counts via the commits API;
    **never request diff/patch media types, never fetch file contents, never store
    code.** State this precisely in the Datenschutzerklärung — the app *has* code-read
    access but reads and stores only commit metadata, and private-repo source of EU
    users raises the privacy posture (get this copy right).
- **Rate limiting (`@convex-dev/rate-limiter`).** Guard the webhook ingest path and
  the per-commit `stats` fetches against bursts; respect the installation rate limit
  (≥5,000/h, scales with repo count).
- **shadcn/ui + Tailwind** (latest). Use primitives; don't hand-roll. Three-color
  palette (black / white / one accent).
- **shadcnblocks (Pro license).** For the landing sections (hero, comparison,
  testimonials, footer), install prebuilt blocks via CLI instead of hand-building:
  `pnpm dlx shadcn@latest add @shadcnblocks/<block>`. `SHADCNBLOCKS_API_KEY`
  (`sk_live_…`) in `.env.local`; `@shadcnblocks` registry in `components.json`. Use
  **Free / Basic / Pro blocks only — never Premium-tier.**
- **Rank card = OG image.** Generate the shareable card as a dynamic OG image
  (Next.js `ImageResponse`), cached. This is the viral lever — make it look great.
- **Analytics: Rybbit (self-hosted).** Track visit → connect → share. No Google
  Analytics or other third-party trackers; cookieless keeps the Datenschutz simple.
- **Legal pages (DE).** Impressum + Datenschutzerklärung are required: a public site
  operated by a German sole proprietor that processes personal data (GitHub logins,
  commit author data, IPs in logs) needs both even without payment. Two static routes,
  linked in the footer.
- **Payments: out of scope for v1.** No Stripe in the initial build. If monetization
  is ever added, it's a one-time fee via **Stripe Managed Payments** (Merchant of
  Record) — config, not a billing build — and only after organic traction.
- **Email (Resend): out of scope for v1.** The core loop needs no transactional email.
  If added later, use `@convex-dev/resend` with a dedicated free Resend Team.
- **Hosting & DNS.** Vercel hosts; manage DNS in Vercel (point nameservers at Vercel).
  Convex stays cloud.
- **Branch & deploy strategy:**
  - `main` — integration branch, tested locally only, never deployed directly.
  - `feat/*` — one per task/agent, short-lived, merged to main via PR after review.
  - `staging` — the only Vercel-deployed branch. Never commit directly; update via
    `git push origin main:staging` after green local tests on main.
- **No dependency or service beyond this stack without a one-line justification in the
  task.**

## Always-current docs

- Before using any library API (Convex, Clerk, GitHub App / Octokit, Next OG), pull
  current docs via **Context7** — versions move fast, don't code from memory.

## Guardrails

- Typed throughout · no secrets in client code · webhook signatures always verified ·
  the core action (connect → score → live board) is polished and handles its obvious
  error/empty states (empty board, unattributed commits, failed install) · the rank
  card looks great · everything off the core path stays minimal until it blocks ship.

## Definition of done (per task)

- Tests green · core action still works end-to-end · typechecks · no new unused code ·
  passed Code Reviewer / Reality Checker · task marked done in `backlog.md`.

<!-- BACKLOG.MD GUIDELINES START -->
<CRITICAL_INSTRUCTION>

## Backlog.md Workflow

This project uses Backlog.md for task and project management.

**For every user request in this project, run `backlog instructions overview` before answering or taking action.**

Use the overview to decide whether to search, read, create, or update Backlog tasks.

Use the detailed guides when needed:
- `backlog instructions task-creation` for creating or splitting tasks
- `backlog instructions task-execution` for planning and implementation workflow
- `backlog instructions task-finalization` for completion and handoff

Use `backlog <command> --help` before running unfamiliar commands. Help shows options, fields, and examples.

Do not edit Backlog task, draft, document, decision, or milestone markdown files directly. Use the `backlog` CLI so metadata, relationships, and history stay consistent.

</CRITICAL_INSTRUCTION>
<!-- BACKLOG.MD GUIDELINES END -->
