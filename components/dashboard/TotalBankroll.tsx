import { cn , formatEur, formatEurDelta } from "@/lib/utils";

interface StatColProps {
  label: string;
  value: string;
  delta?: number;
}

function StatCol({ label, value, delta }: StatColProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;
  return (
    <div className="px-5 xl:px-6 border-r border-border last:border-r-0 flex flex-col justify-center gap-0.5 min-w-0">
      <p className="font-mono text-[10px] font-medium tracking-[0.10em] uppercase text-muted whitespace-nowrap">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-[13px] tabular-nums whitespace-nowrap",
          isPositive ? "text-positive" : isNegative ? "text-negative" : "text-text",
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface TotalBankrollProps {
  total: number;
  pnl30d: number;
  pnlMtd: number;
  pnlWtd: number;
  sessions30d: number;
  winDays: number;
  activeDays: number;
  lastUpdateLabel: string;
}

export function TotalBankroll({
  total,
  pnl30d,
  pnlMtd,
  pnlWtd,
  sessions30d,
  winDays,
  activeDays,
  lastUpdateLabel,
}: TotalBankrollProps) {
  return (
    <div className="flex items-stretch gap-0 flex-wrap">
      {/* Main KPI block */}
      <div className="pr-6 xl:pr-8 flex flex-col justify-center gap-0.5">
        <p className="font-mono text-[10px] font-medium tracking-[0.10em] uppercase text-muted">
          Bankroll · EUR
        </p>
        <p className="font-mono text-[44px] font-medium leading-none tracking-[-0.015em] text-text tabular-nums">
          {formatEur(total)}
        </p>
      </div>

      {/* Stat columns — hidden on mobile */}
      <div className="hidden lg:flex items-stretch border-l border-border pl-6 xl:pl-8">
        <StatCol label="30D" value={formatEurDelta(pnl30d)} delta={pnl30d} />
        <StatCol label="MTD" value={formatEurDelta(pnlMtd)} delta={pnlMtd} />
        <StatCol label="WTD" value={formatEurDelta(pnlWtd)} delta={pnlWtd} />
        <StatCol label="Sessions · 30D" value={String(sessions30d)} />
        <StatCol label="Win Days" value={activeDays > 0 ? `${winDays}/${activeDays}` : "—"} />
        <StatCol label="Last" value={lastUpdateLabel} />
      </div>

      {/* Mobile: show 30D delta below the figure */}
      <div className="flex lg:hidden w-full mt-1">
        <p className="font-mono text-sm tabular-nums">
          <span
            className={pnl30d > 0 ? "text-positive" : pnl30d < 0 ? "text-negative" : "text-muted"}
          >
            {formatEurDelta(pnl30d)}
          </span>{" "}
          <span className="text-muted">ultimi 30 giorni</span>
        </p>
      </div>
    </div>
  );
}
