# Stack Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pnpm dev` run the app and render a Convex query result on a Clerk-authenticated Next.js App Router page.

**Architecture:** Keep the root layout as a Server Component and add one narrow Client Component boundary for Clerk-backed Convex auth. Add a minimal public Convex query that derives the current viewer from `ctx.auth.getUserIdentity()` and returns `null` when unauthenticated. Replace the generated landing page with a small app shell that exposes sign-in/sign-out controls and a client widget that subscribes to the Convex query.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk `@clerk/nextjs`, Convex `1.42.x`, pnpm, Tailwind CSS 4.

---

## Current State

- `package.json` already has `next`, `react`, `@clerk/nextjs`, and `convex`.
- `.env.local` already defines `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
- `.env.local` does not currently show `CLERK_JWT_ISSUER_DOMAIN`; add it before deploying Convex auth config.
- `convex/` currently contains generated files and guidelines only; there is no app query yet.
- `app/page.tsx` is still the generated Next.js starter page.
- There is a stale `package-lock.json`; because the project standard is pnpm-only, remove it during implementation unless the user says it must stay.
- Working tree already has uncommitted setup changes. Preserve them and commit only the final reviewed TASK-1 changes.

## Documentation Used

- Context7 Convex docs for Next.js App Router + Clerk: wrap the app with `<ClerkProvider>` and a Convex client provider so Convex can receive Clerk tokens.
- Local Next.js 16 docs in `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`: root layout is required and must contain `<html>` and `<body>`.
- Local Next.js 16 docs in `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`: pages and layouts are Server Components by default; use `"use client"` only for interactive/hooks code.
- Convex local AI guidelines in `convex/_generated/ai/guidelines.md`: create `convex/auth.config.ts` for auth, include validators for all functions, and derive identity server-side via `ctx.auth.getUserIdentity()`.

## File Structure

- Modify: `package.json`
  - Add `typecheck`, `convex:dev`, and `convex:deploy-once` scripts.
  - Keep `dev` as the Next.js dev server command so acceptance criterion #1 stays literal.
- Delete: `package-lock.json`
  - Remove npm lockfile after confirming pnpm lockfile is present.
- Create: `components/ConvexClientProvider.tsx`
  - Client-only provider that creates one `ConvexReactClient` and passes Clerk `useAuth` to `ConvexProviderWithClerk`.
- Modify: `app/layout.tsx`
  - Wrap `children` with `<ClerkProvider>` and `<ConvexClientProvider>`.
  - Update app metadata and keep root `<html>` / `<body>`.
- Create: `convex/auth.config.ts`
  - Configure Clerk issuer for Convex JWT validation.
- Create: `convex/viewer.ts`
  - Public authenticated smoke-test query with no database dependency.
- Create: `app/ViewerStatus.tsx`
  - Client widget that uses `Authenticated`, `Unauthenticated`, `AuthLoading`, and `useQuery(api.viewer.current, {})`.
- Modify: `app/page.tsx`
  - Replace starter page with a minimal Commit Leaderboard app screen using Clerk controls and `ViewerStatus`.
- Modify: `.env.local`
  - Add `CLERK_JWT_ISSUER_DOMAIN=https://...` only if missing. Use the Clerk issuer domain from the Clerk dashboard/JWT template, not a guessed value.

## Task 1: Normalize Scripts And Package Manager

**Files:**
- Modify: `package.json`
- Delete: `package-lock.json`

- [ ] **Step 1: Write the package-script expectation**

Open `package.json` and confirm scripts will include these exact keys after implementation:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "convex:dev": "convex dev",
    "convex:deploy-once": "convex dev --once"
  }
}
```

- [ ] **Step 2: Verify the current scripts are incomplete**

Run:

```bash
pnpm run typecheck
```

Expected: FAIL with a pnpm message that `typecheck` is missing.

- [ ] **Step 3: Update package scripts**

Edit `package.json` so the `scripts` object is exactly:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "convex:dev": "convex dev",
  "convex:deploy-once": "convex dev --once"
}
```

- [ ] **Step 4: Remove the npm lockfile**

Run:

```bash
rm package-lock.json
```

Expected: `package-lock.json` is removed and `pnpm-lock.yaml` remains.

- [ ] **Step 5: Verify scripts**

Run:

```bash
pnpm run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(task-1): normalize pnpm scripts"
```

## Task 2: Add Clerk-Backed Convex Provider

**Files:**
- Create: `components/ConvexClientProvider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing typecheck target**

Run:

```bash
pnpm run typecheck
```

Expected: PASS before this slice, confirming a clean baseline.

- [ ] **Step 2: Add the provider component**

Create `components/ConvexClientProvider.tsx`:

```tsx
"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
```

- [ ] **Step 3: Wrap root layout**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Commit Leaderboard",
  description: "A live leaderboard for shipping momentum.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 4: Verify provider typing**

Run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx components/ConvexClientProvider.tsx
git commit -m "feat(task-1): wire Clerk to Convex provider"
```

## Task 3: Add Authenticated Convex Smoke Query

**Files:**
- Create: `convex/auth.config.ts`
- Create: `convex/viewer.ts`
- Modify: `.env.local`

- [ ] **Step 1: Confirm the missing auth config fails the acceptance path**

Run:

```bash
test -f convex/auth.config.ts
```

Expected: FAIL before implementation because the file does not exist.

- [ ] **Step 2: Add the Clerk issuer env variable if missing**

If `.env.local` does not include `CLERK_JWT_ISSUER_DOMAIN`, add:

```dotenv
CLERK_JWT_ISSUER_DOMAIN=https://<your-clerk-issuer-domain>
```

Use the actual Clerk issuer domain configured for Convex JWTs. Do not commit real secret values.

- [ ] **Step 3: Add Convex auth config**

Create `convex/auth.config.ts`:

```ts
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

- [ ] **Step 4: Add viewer query**

Create `convex/viewer.ts`:

```ts
import { query } from "./_generated/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      return null;
    }

    return {
      name: identity.name ?? null,
      email: identity.email ?? null,
      tokenIdentifier: identity.tokenIdentifier,
    };
  },
});
```

- [ ] **Step 5: Push Convex functions and regenerate API references**

Run:

```bash
pnpm run convex:deploy-once
```

Expected: PASS. Generated `convex/_generated/api.*` files include `viewer.current`.

- [ ] **Step 6: Verify TypeScript**

Run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add convex/auth.config.ts convex/viewer.ts convex/_generated .env.local
git commit -m "feat(task-1): add authenticated Convex viewer query"
```

If `.env.local` is ignored, do not force-add it; instead add an implementation note that `CLERK_JWT_ISSUER_DOMAIN` must be present locally and in deployment env.

## Task 4: Render The Clerk And Convex Smoke UI

**Files:**
- Create: `app/ViewerStatus.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write the failing import check**

Run:

```bash
pnpm run typecheck
```

Expected: PASS before this slice.

- [ ] **Step 2: Add the client status widget**

Create `app/ViewerStatus.tsx`:

```tsx
"use client";

import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { api } from "@/convex/_generated/api";

export function ViewerStatus() {
  const viewer = useQuery(api.viewer.current, {});

  return (
    <section className="w-full rounded border border-zinc-200 bg-white p-6 text-sm shadow-sm">
      <AuthLoading>
        <p className="text-zinc-600">Checking your session...</p>
      </AuthLoading>
      <Unauthenticated>
        <p className="font-medium text-zinc-950">Sign in to test Clerk + Convex.</p>
        <p className="mt-2 text-zinc-600">
          The page is loaded, but Convex has no authenticated identity yet.
        </p>
      </Unauthenticated>
      <Authenticated>
        {viewer === undefined ? (
          <p className="text-zinc-600">Loading Convex viewer...</p>
        ) : viewer === null ? (
          <p className="text-zinc-600">Convex returned no viewer identity.</p>
        ) : (
          <div className="space-y-2">
            <p className="font-medium text-zinc-950">Convex query authenticated.</p>
            <dl className="grid gap-2 text-zinc-700">
              <div>
                <dt className="font-medium text-zinc-950">Name</dt>
                <dd>{viewer.name ?? "No name on token"}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-950">Email</dt>
                <dd>{viewer.email ?? "No email on token"}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-950">Token</dt>
                <dd className="break-all font-mono text-xs">{viewer.tokenIdentifier}</dd>
              </div>
            </dl>
          </div>
        )}
      </Authenticated>
    </section>
  );
}
```

- [ ] **Step 3: Replace the starter page**

Replace `app/page.tsx` with:

```tsx
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import { ViewerStatus } from "./ViewerStatus";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-1 flex-col bg-zinc-50 px-6 py-8 text-zinc-950">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-500">Commit Leaderboard</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              Stack skeleton
            </h1>
          </div>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </header>

        <ViewerStatus />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify static checks**

Run:

```bash
pnpm run typecheck
pnpm run lint
```

Expected: both PASS.

- [ ] **Step 5: Verify local dev server starts**

Run:

```bash
pnpm dev
```

Expected: Next.js dev server starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 6: Verify authenticated Convex query manually**

Open the local URL and test:

```text
1. Signed out: page renders and shows "Sign in to test Clerk + Convex."
2. Click Sign in and authenticate with Clerk.
3. Signed in: the widget shows "Convex query authenticated."
4. The widget displays at least one identity field from Convex.
```

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/ViewerStatus.tsx
git commit -m "feat(task-1): render authenticated stack smoke test"
```

## Task 5: Backlog Verification And Handoff

**Files:**
- Backlog task: `TASK-1`

- [ ] **Step 1: Check acceptance criterion #1**

After `pnpm dev` starts successfully, run:

```bash
backlog task edit TASK-1 --check-ac 1
```

- [ ] **Step 2: Check acceptance criterion #2**

After a signed-in browser session shows the Convex viewer query result, run:

```bash
backlog task edit TASK-1 --check-ac 2
```

- [ ] **Step 3: Add implementation notes**

Run:

```bash
backlog task edit TASK-1 --append-notes $'Implemented a minimal Clerk + Convex smoke path: ClerkProvider -> ConvexProviderWithClerk -> authenticated viewer query -> page widget.\nVerified pnpm dev, typecheck, lint, convex dev --once, and signed-in browser rendering.'
```

- [ ] **Step 4: Do not close without user confirmation**

Leave `TASK-1` in `In Progress` until the user confirms manual testing. Only after explicit confirmation run:

```bash
backlog task edit TASK-1 --final-summary "Set up the stack skeleton and verified an authenticated Convex query renders through Clerk." -s "Done"
```

## Self-Review

- Spec coverage: AC #1 is covered by Task 4 Step 5 and Task 5 Step 1. AC #2 is covered by Tasks 2-4 and Task 5 Step 2.
- Placeholder scan: The only placeholder is the required local value `https://<your-clerk-issuer-domain>`, which cannot be invented safely; the implementation step explicitly requires the real Clerk issuer domain.
- Type consistency: Provider name, Convex function reference `api.viewer.current`, and component imports are consistent across tasks.
- Scope control: This plan does not add schema, scoring, GitHub App work, shadcn, landing page, analytics, legal pages, or deployment. Those remain later backlog tasks.
