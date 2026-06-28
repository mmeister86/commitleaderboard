import {
  Show,
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
            <p className="text-sm font-medium text-zinc-500">
              Commit Leaderboard
            </p>
            <h1 className="text-3xl font-semibold tracking-normal">
              Stack skeleton
            </h1>
          </div>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </header>

        <ViewerStatus />
      </div>
    </main>
  );
}
