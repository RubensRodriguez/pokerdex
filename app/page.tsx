import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

import { countUsers } from "@/lib/queries/users";

export default async function Home() {
  const [userCount, user] = await Promise.all([countUsers(), currentUser()]);
  const email = user?.emailAddresses[0]?.emailAddress ?? "(no email)";

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <ChipMark className="h-[22px] w-[22px] text-accent" />
          <h1
            className="font-sans font-semibold uppercase text-text"
            style={{ fontSize: "28px", letterSpacing: "0.03em" }}
          >
            POKERDEX
          </h1>
        </div>
        <div
          className="flex flex-col items-center gap-2 font-mono text-muted"
          style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums" }}
        >
          <p>Users: {userCount}</p>
          <div className="flex items-center gap-2">
            <span>Logged in as {email}</span>
            <UserButton />
          </div>
        </div>
      </div>
    </main>
  );
}

function ChipMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 13.48 2.11 A 10 10 0 1 0 10.52 2.11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
