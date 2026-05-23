// Pure derivation of the cumulative net-P&L chart series from balance-update
// events. No I/O, no currency formatting. See spec.
//
// Invariants enforced here:
//   #2 deltas are derived, never stored — these functions are the only source of them.
//   #3 only balance_update events reach these functions (caller filters).
//   #4 each site's earliest balance_update is a zero-contribution baseline.
//   #5 timezone conversion via date-fns-tz (deriveNetPnlSeries only).

import { format } from "date-fns-tz";

export interface BalanceUpdateEvent {
  siteId: string;
  balance: string;
  occurredAt: Date;
  localDate: string;
}

export interface ChartPoint {
  date: string;
  cumulative: number;
}

export function deriveChartPoints(events: BalanceUpdateEvent[]): ChartPoint[] {
  if (events.length === 0) return [];

  // Defensive global sort: occurredAt asc, siteId as stable tiebreaker.
  const sorted = [...events].sort((a, b) => {
    const t = a.occurredAt.getTime() - b.occurredAt.getTime();
    if (t !== 0) return t;
    return a.siteId < b.siteId ? -1 : a.siteId > b.siteId ? 1 : 0;
  });

  // Track the last seen balance per site to compute per-site deltas.
  // A site absent from this map has not yet had its baseline -> delta 0.
  const lastBalanceBySite = new Map<string, number>();

  // Accumulate deltas per local day, then build cumulative points.
  // Using an ordered map keyed by date; insertion order follows the
  // sorted events, which are chronological, so day order is preserved.
  const deltaByDay = new Map<string, number>();

  for (const e of sorted) {
    const balance = Number.parseFloat(e.balance);
    if (Number.isNaN(balance)) {
      throw new Error(`deriveChartPoints: unparseable balance "${e.balance}" for site ${e.siteId}`);
    }

    const prev = lastBalanceBySite.get(e.siteId);
    // Baseline (first update for this site) contributes exactly 0.
    const delta = prev === undefined ? 0 : balance - prev;
    lastBalanceBySite.set(e.siteId, balance);

    deltaByDay.set(e.localDate, (deltaByDay.get(e.localDate) ?? 0) + delta);
  }

  // Build cumulative series in day order.
  const points: ChartPoint[] = [];
  let running = 0;
  for (const [date, dayDelta] of deltaByDay) {
    running += dayDelta;
    // Guard floating-point drift to cents.
    running = Math.round(running * 100) / 100;
    points.push({ date, cumulative: running });
  }

  return points;
}

// Derives a continuous trailing-window cumulative net P&L series for the chart.
// Algorithm:
//   1. Sort events by siteId then occurredAt — processes each site's baseline first.
//   2. Compute per-event deltas: delta[0]=0 per site (baseline invariant #4).
//   3. Convert each event's UTC occurredAt to a local date in opts.timezone.
//   4. Build a continuous array of windowDays local dates (oldest → today).
//   5. Accumulate only deltas whose local date falls inside the window.
//   6. Return cumulative points (length === windowDays) and total (final value).
export function deriveNetPnlSeries(
  events: Array<{ siteId: string; balance: number; occurredAt: Date }>,
  opts: { timezone: string; windowDays: number; now?: Date },
): { points: Array<{ date: string; cumulative: number }>; total: number } {
  const { timezone, windowDays } = opts;
  const now = opts.now ?? new Date();

  // Build continuous window of local date strings, oldest → today.
  // Parse today's local date string then subtract whole days (DST-safe).
  const todayStr = format(now, "yyyy-MM-dd", { timeZone: timezone });
  const parts = todayStr.split("-").map(Number);
  const todayMidnightMs = Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!);

  const windowDates: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(todayMidnightMs - i * 86_400_000);
    windowDates.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    );
  }

  const windowStart = windowDates[0]!;
  const windowEnd = windowDates[windowDates.length - 1]!;

  // Initialize delta accumulator for every day in the window.
  const dayDeltas = new Map<string, number>();
  for (const d of windowDates) dayDeltas.set(d, 0);

  // Sort: group by siteId, then chronological within each site.
  const sorted = [...events].sort((a, b) => {
    if (a.siteId !== b.siteId) return a.siteId < b.siteId ? -1 : 1;
    return a.occurredAt.getTime() - b.occurredAt.getTime();
  });

  const lastBalanceBySite = new Map<string, number>();
  for (const e of sorted) {
    const prev = lastBalanceBySite.get(e.siteId);
    const delta = prev === undefined ? 0 : e.balance - prev; // invariant #4
    lastBalanceBySite.set(e.siteId, e.balance);

    const localDate = format(e.occurredAt, "yyyy-MM-dd", { timeZone: timezone });
    if (localDate >= windowStart && localDate <= windowEnd) {
      dayDeltas.set(localDate, (dayDeltas.get(localDate) ?? 0) + delta);
    }
  }

  // Build cumulative points over the full window.
  const points: Array<{ date: string; cumulative: number }> = [];
  let running = 0;
  for (const d of windowDates) {
    running += dayDeltas.get(d) ?? 0;
    running = Math.round(running * 100) / 100;
    points.push({ date: d, cumulative: running });
  }

  return { points, total: points[points.length - 1]?.cumulative ?? 0 };
}
