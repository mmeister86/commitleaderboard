"use client";

import { useUser } from "@clerk/nextjs";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { api } from "@/convex/_generated/api";

export function ViewerStatus() {
  const viewer = useQuery(api.viewer.current, {});
  const { isLoaded: isClerkLoaded, user } = useUser();

  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.find(
      (emailAddress) => emailAddress.id === user.primaryEmailAddressId,
    )?.emailAddress ??
    null;
  const name = user?.fullName ?? null;
  const username = user?.username ?? null;

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
        {viewer === undefined || !isClerkLoaded ? (
          <p className="text-zinc-600">Loading Clerk and Convex...</p>
        ) : viewer === null ? (
          <p className="text-zinc-600">Convex returned no viewer identity.</p>
        ) : (
          <div className="space-y-2">
            <p className="font-medium text-zinc-950">
              Convex query authenticated.
            </p>
            <dl className="grid gap-2 text-zinc-700">
              <div>
                <dt className="font-medium text-zinc-950">Clerk name</dt>
                <dd>{name ?? "No name on Clerk profile"}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-950">Clerk username</dt>
                <dd>{username ?? "No username on Clerk profile"}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-950">Clerk email</dt>
                <dd>{email ?? "No email on Clerk profile"}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-950">
                  Convex auth token
                </dt>
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
