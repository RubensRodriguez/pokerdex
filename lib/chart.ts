// Pure derivation of the cumulative net-P&L chart series from balance-update
// events. No I/O, no timezone math, no currency formatting. See spec.
//
// Invariants enforced here:
//   #2 deltas are derived, never stored — this function is the only source of them.
//   #3 only balance_update events reach this function (caller filters).
//   #4 each site's earliest balance_update is a zero-contribution baseline.

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
