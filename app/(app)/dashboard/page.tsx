import { auth } from "@clerk/nextjs/server";
import { differenceInCalendarDays, startOfMonth, startOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { redirect } from "next/navigation";

import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { PnlChart } from "@/components/dashboard/PnlChart";
import { SitesSummaryCard } from "@/components/dashboard/SitesSummaryCard";
import { TotalBankroll } from "@/components/dashboard/TotalBankroll";
import { deriveNetPnlSeries } from "@/lib/chart";
import { getBalanceUpdatesForChart } from "@/lib/queries/events";
import { getCurrentBalances } from "@/lib/queries/sites";
import { getUser } from "@/lib/queries/users";
import { siteColor } from "@/lib/site-colors";

function relativeTime(date: Date | null): string {
  if (!date) return "—";
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "adesso";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  return `${Math.floor(hours / 24)}g fa`;
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user, sites] = await Promise.all([getUser(userId), getCurrentBalances(userId)]);

  if (sites.length === 0) {
    return (
      <main className="p-6 lg:p-8">
        <DashboardEmptyState />
      </main>
    );
  }

  const total = sites.reduce((s, x) => s + x.balance, 0);
  const timezone = user?.timezone ?? "Europe/Rome";
  const now = new Date();

  const updates = await getBalanceUpdatesForChart(userId, 30);

  // 30-day series (drives both chart and the 30D KPI)
  const { points, total: pnl30d } = deriveNetPnlSeries(updates, {
    timezone,
    windowDays: 30,
    now,
  });

  // MTD: days from the start of the current month to today (inclusive)
  const nowInTz = toZonedTime(now, timezone);
  const mtdDays = differenceInCalendarDays(nowInTz, startOfMonth(nowInTz)) + 1;
  const { total: pnlMtd } = deriveNetPnlSeries(updates, {
    timezone,
    windowDays: mtdDays,
    now,
  });

  // WTD: days from Monday to today (inclusive)
  const wtdDays = differenceInCalendarDays(nowInTz, startOfWeek(nowInTz, { weekStartsOn: 1 })) + 1;
  const { total: pnlWtd } = deriveNetPnlSeries(updates, {
    timezone,
    windowDays: wtdDays,
    now,
  });

  // Sessions in last 30 days (count of balance_update events)
  const cutoff30d = new Date(now.getTime() - 30 * 86_400_000);
  const sessions30d = updates.filter((u) => u.occurredAt >= cutoff30d).length;

  // Win days vs active days from the 30D series
  let winDays = 0;
  let activeDays = 0;
  let prevCumulative = 0;
  for (const p of points) {
    const delta = Math.round((p.cumulative - prevCumulative) * 100) / 100;
    if (delta !== 0) {
      activeDays++;
      if (delta > 0) winDays++;
    }
    prevCumulative = p.cumulative;
  }

  // Last update across all sites
  const lastUpdateAt =
    updates.length > 0
      ? updates.reduce(
          (max, u) => (u.occurredAt > max ? u.occurredAt : max),
          updates[0]!.occurredAt,
        )
      : null;

  const decorated = sites.map((s, i) => ({
    name: s.name,
    balance: s.balance,
    color: siteColor(i),
    share: total > 0 ? s.balance / total : 0,
  }));

  return (
    <main className="p-6 lg:p-8 space-y-6">
      <TotalBankroll
        total={total}
        pnl30d={pnl30d}
        pnlMtd={pnlMtd}
        pnlWtd={pnlWtd}
        sessions30d={sessions30d}
        winDays={winDays}
        activeDays={activeDays}
        lastUpdateLabel={relativeTime(lastUpdateAt)}
      />
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Chart — no card wrapper, sits directly on the page bg */}
        <div className="flex-1 lg:flex-[2]">
          <PnlChart points={points} />
        </div>
        {/* Sites summary — plain rows, no card border */}
        <div className="lg:flex-[1]">
          <SitesSummaryCard sites={decorated} count={sites.length} />
        </div>
      </div>
    </main>
  );
}
