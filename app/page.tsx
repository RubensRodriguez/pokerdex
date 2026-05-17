export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex items-center gap-3">
        <ChipMark className="h-[22px] w-[22px] text-accent" />
        <h1
          className="font-sans font-semibold text-text"
          style={{ fontSize: "28px", letterSpacing: "0.03em" }}
        >
          POKERDEX
        </h1>
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
