import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="hidden flex-col justify-between border-r border-border p-10 md:flex md:w-1/2">
        <div className="flex items-center gap-2">
          <ChipMark className="h-[18px] w-[18px] text-accent" />
          <span
            className="font-sans font-semibold uppercase text-text"
            style={{ fontSize: "13px", letterSpacing: "0.03em" }}
          >
            POKERDEX
          </span>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p
              className="font-mono font-medium uppercase text-muted"
              style={{ fontSize: "10px", letterSpacing: "0.12em" }}
            >
              A place for rule makers
            </p>
            <h1
              className="font-sans font-medium text-text"
              style={{ fontSize: "36px", letterSpacing: "-0.03em", lineHeight: "1.15" }}
            >
              Sign in to see
              <br />
              where the month
              <br />
              landed.
            </h1>
          </div>

          <div className="flex gap-8">
            <StatItem label="Active Sites" value="4" />
            <StatItem label="Last Update" value="2h ago" />
            <StatItem label="Current Bal" value="+€637" />
            <StatItem label="Location" value="Rome" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <SignIn />
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p
        className="font-mono font-medium uppercase text-muted"
        style={{ fontSize: "10px", letterSpacing: "0.12em" }}
      >
        {label}
      </p>
      <p
        className="font-mono text-text"
        style={{ fontSize: "15px", fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </p>
    </div>
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
