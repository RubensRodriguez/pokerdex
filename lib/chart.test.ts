import { describe, it, expect } from "vitest";

import { deriveChartPoints, type BalanceUpdateEvent } from "./chart";

function ev(siteId: string, balance: string, localDate: string, hour = 12): BalanceUpdateEvent {
  return {
    siteId,
    balance,
    localDate,
    occurredAt: new Date(`${localDate}T${String(hour).padStart(2, "0")}:00:00Z`),
  };
}

describe("deriveChartPoints — invariant #4 baseline cases", () => {
  it("case 1: brand-new user, one site, one entry → single point at 0", () => {
    const events = [ev("stars", "200.00", "2026-01-10")];
    const points = deriveChartPoints(events);
    expect(points).toEqual([{ date: "2026-01-10", cumulative: 0 }]);
  });

  it("case 2: second site added mid-history → its baseline does not move the line", () => {
    const events = [
      ev("stars", "200.00", "2026-01-10"), // baseline stars: 0
      ev("stars", "350.00", "2026-01-20"), // +150  → cum 150
      ev("snai", "500.00", "2026-02-01"), // baseline snai: 0 → cum still 150
      ev("snai", "600.00", "2026-02-05"), // +100 → cum 250
    ];
    const points = deriveChartPoints(events);
    expect(points).toEqual([
      { date: "2026-01-10", cumulative: 0 },
      { date: "2026-01-20", cumulative: 150 },
      { date: "2026-02-01", cumulative: 150 }, // <- key assertion: no jump
      { date: "2026-02-05", cumulative: 250 },
    ]);
  });

  it("case 3: editing the first entry keeps it a zero baseline", () => {
    const events = [
      ev("stars", "250.00", "2026-01-10"), // edited baseline: still 0
      ev("stars", "350.00", "2026-01-20"), // now +100 (from 250), not +150
    ];
    const points = deriveChartPoints(events);
    expect(points).toEqual([
      { date: "2026-01-10", cumulative: 0 },
      { date: "2026-01-20", cumulative: 100 },
    ]);
  });

  it("case 4: deleting the first entry promotes the next to baseline", () => {
    const events = [
      ev("stars", "350.00", "2026-01-20"), // promoted baseline: 0
      ev("stars", "500.00", "2026-01-30"), // +150
    ];
    const points = deriveChartPoints(events);
    expect(points).toEqual([
      { date: "2026-01-20", cumulative: 0 },
      { date: "2026-01-30", cumulative: 150 },
    ]);
  });
});

describe("deriveChartPoints — success criterion #3 (deposits already excluded)", () => {
  it("balance 500→600 then 600→750 yields +100 then +150 cumulative", () => {
    const events = [
      ev("stars", "500.00", "2026-03-01"), // baseline: 0
      ev("stars", "600.00", "2026-03-02"), // +100 → cum 100
      // (a deposit of 200 happened here; not passed to this function)
      ev("stars", "750.00", "2026-03-03"), // +150 → cum 250
    ];
    const points = deriveChartPoints(events);
    expect(points).toEqual([
      { date: "2026-03-01", cumulative: 0 },
      { date: "2026-03-02", cumulative: 100 },
      { date: "2026-03-03", cumulative: 250 },
    ]);
  });
});

describe("deriveChartPoints — robustness", () => {
  it("returns [] for empty input", () => {
    expect(deriveChartPoints([])).toEqual([]);
  });

  it("re-sorts defensively when input is not chronological", () => {
    const events = [
      ev("stars", "350.00", "2026-01-20"),
      ev("stars", "200.00", "2026-01-10"), // earlier, passed second
    ];
    const points = deriveChartPoints(events);
    expect(points).toEqual([
      { date: "2026-01-10", cumulative: 0 },
      { date: "2026-01-20", cumulative: 150 },
    ]);
  });

  it("sums multiple sites updated on the same local day into one point", () => {
    const events = [
      ev("stars", "200.00", "2026-01-10", 10), // baseline 0
      ev("snai", "500.00", "2026-01-10", 11), // baseline 0
      ev("stars", "260.00", "2026-01-15", 10), // +60
      ev("snai", "540.00", "2026-01-15", 11), // +40  → same day, summed
    ];
    const points = deriveChartPoints(events);
    expect(points).toEqual([
      { date: "2026-01-10", cumulative: 0 },
      { date: "2026-01-15", cumulative: 100 }, // 60 + 40
    ]);
  });

  it("throws on an unparseable balance", () => {
    const events = [ev("stars", "not-a-number", "2026-01-10")];
    expect(() => deriveChartPoints(events)).toThrow(/unparseable balance/);
  });
});
