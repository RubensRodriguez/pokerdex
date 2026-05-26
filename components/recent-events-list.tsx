"use client";

import { it } from "date-fns/locale";
import { format } from "date-fns-tz";

import type { RecentEvent } from "@/lib/queries/events";
import { cn, formatEur, formatEurDelta } from "@/lib/utils";

interface RecentEventsListProps {
  events: RecentEvent[];
  timezone: string;
  onEventClick: (event: RecentEvent) => void;
}

function typeBadge(type: RecentEvent["type"]): string {
  if (type === "balance_update") return "Saldo";
  if (type === "deposit") return "Deposito";
  return "Prelievo";
}

function EventValue({ event }: { event: RecentEvent }) {
  if (event.type === "balance_update") {
    const delta = event.delta ?? 0;
    const isPositive = delta > 0;
    const isNegative = delta < 0;
    return (
      <span className="font-mono text-xs tabular-nums flex items-center gap-1.5">
        <span className="text-text">{formatEur(event.balance ?? 0)}</span>
        {delta !== 0 && (
          <span
            className={cn(
              isPositive ? "text-positive" : isNegative ? "text-negative" : "text-muted",
            )}
          >
            ({formatEurDelta(delta)})
          </span>
        )}
      </span>
    );
  }

  const amount = event.amount ?? 0;
  const sign = event.type === "deposit" ? "+" : "−";
  return (
    <span className="font-mono text-xs tabular-nums text-text">
      {sign}
      {formatEur(amount)}
    </span>
  );
}

export function RecentEventsList({ events, timezone, onEventClick }: RecentEventsListProps) {
  if (events.length === 0) {
    return (
      <p className="font-mono text-xs text-muted py-4">
        Nessun aggiornamento registrato. Tocca + per iniziare.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {events.map((event) => {
        const localDate = format(event.occurredAt, "d MMM", {
          timeZone: timezone,
          locale: it,
        });
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onEventClick(event)}
            className="w-full flex items-center gap-3 py-2.5 px-0 text-left hover:bg-surface-2/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <span className="font-mono text-[11px] text-muted tabular-nums w-[44px] shrink-0">
              {localDate}
            </span>
            <span className="text-xs text-text min-w-0 flex-1 truncate">{event.siteName}</span>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-2 text-muted">
              {typeBadge(event.type)}
            </span>
            <EventValue event={event} />
          </button>
        );
      })}
    </div>
  );
}
