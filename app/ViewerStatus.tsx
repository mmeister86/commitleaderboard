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
        <p className="font-medium text-zinc-950">
          Sign in to test Clerk + Convex.
        </p>
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
            <p className="font-medium text-zinc-950">
              Convex query authenticated.
            </p>
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
                <dd className="break-all font-mono text-xs">
                  {viewer.tokenIdentifier}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Authenticated>
    </section>
  );
}
