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
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"
      />
    </svg>
  );
}
