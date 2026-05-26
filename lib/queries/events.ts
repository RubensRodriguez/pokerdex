// All functions take userId first and run inside withUser(). No query against
// `events` may run outside a withUser block (RLS contract, see architecture).
import { fromZonedTime } from "date-fns-tz";
import { and, asc, desc, eq, sql as drizzleSql } from "drizzle-orm";

import { events } from "@/db/schema";
import { withUser } from "@/db/with-user";

export const RECENT_EVENTS_LIMIT = 20;

export interface RecentEvent {
  id: string;
  siteId: string;
  siteName: string;
  type: "balance_update" | "deposit" | "withdrawal";
  balance: number | null;
  amount: number | null;
  delta: number | null;
  occurredAt: Date;
}

export interface DateEventEntry {
  id: string;
  type: "balance_update" | "deposit" | "withdrawal";
  balance: number | null;
  amount: number | null;
  occurredAt: Date;
  predecessorBalance: number | null;
}

export interface SiteDateEvents {
  siteId: string;
  siteName: string;
  events: DateEventEntry[];
}

export async function getCurrentBalance(userId: string, siteId: string): Promise<number | null> {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select({ balance: events.balance })
      .from(events)
      .where(
        and(
          eq(events.userId, userId),
          eq(events.siteId, siteId),
          eq(events.type, "balance_update"),
        ),
      )
      .orderBy(desc(events.occurredAt))
      .limit(1);
    return rows[0] ? Number.parseFloat(rows[0].balance!) : null;
  });
}

export async function getLastUpdate(
  userId: string,
  siteId: string,
): Promise<{ balance: number; occurredAt: Date } | null> {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select({ balance: events.balance, occurredAt: events.occurredAt })
      .from(events)
      .where(
        and(
          eq(events.userId, userId),
          eq(events.siteId, siteId),
          eq(events.type, "balance_update"),
        ),
      )
      .orderBy(desc(events.occurredAt))
      .limit(1);
    if (!rows[0]) return null;
    return {
      balance: Number.parseFloat(rows[0].balance!),
      occurredAt: rows[0].occurredAt,
    };
  });
}

// Returns all balance_update events for the user (no archived filter — archived
// sites' history still contributes to the chart). Ordered by siteId, then
// occurredAt asc so deriveNetPnlSeries can process per-site baselines correctly.
// windowDays is accepted for API symmetry; we return all rows and let the chart
// function slice the window (simplest correct approach per spec).
export async function getBalanceUpdatesForChart(
  userId: string,
  _windowDays: number,
): Promise<Array<{ siteId: string; balance: number; occurredAt: Date }>> {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select({
        siteId: events.siteId,
        balance: events.balance,
        occurredAt: events.occurredAt,
      })
      .from(events)
      .where(and(eq(events.userId, userId), eq(events.type, "balance_update")))
      .orderBy(asc(events.siteId), asc(events.occurredAt));
    return rows.map((r) => ({
      siteId: r.siteId,
      balance: Number.parseFloat(r.balance!),
      occurredAt: r.occurredAt,
    }));
  });
}

// Returns the most recent N events of all types, newest first, with derived
// delta for balance_update rows (null for deposits/withdrawals).
export async function getRecentEvents(
  userId: string,
  limit = RECENT_EVENTS_LIMIT,
): Promise<RecentEvent[]> {
  return withUser(userId, async (tx) => {
    type RawRow = {
      id: string;
      site_id: string;
      site_name: string;
      type: string;
      balance: string | null;
      amount: string | null;
      delta: string | null;
      occurred_at: Date | string;
    };
    const raw = await tx.execute(drizzleSql`
      SELECT
        inner_q.id,
        inner_q.site_id,
        inner_q.site_name,
        inner_q.type,
        inner_q.balance,
        inner_q.amount,
        inner_q.occurred_at,
        CASE
          WHEN inner_q.type = 'balance_update' AND inner_q.prev_balance IS NULL THEN 0.0
          WHEN inner_q.type = 'balance_update' THEN inner_q.balance::float8 - inner_q.prev_balance::float8
          ELSE NULL
        END AS delta
      FROM (
        SELECT
          e.id,
          e.site_id,
          s.name AS site_name,
          e.type,
          e.balance,
          e.amount,
          e.occurred_at,
          e.created_at,
          CASE WHEN e.type = 'balance_update' THEN (
            SELECT prev.balance FROM events prev
            WHERE prev.site_id = e.site_id
              AND prev.user_id = ${userId}
              AND prev.type = 'balance_update'
              AND (
                prev.occurred_at < e.occurred_at
                OR (prev.occurred_at = e.occurred_at AND prev.created_at < e.created_at)
              )
            ORDER BY prev.occurred_at DESC, prev.created_at DESC
            LIMIT 1
          ) ELSE NULL END AS prev_balance
        FROM events e
        JOIN sites s ON s.id = e.site_id
        WHERE e.user_id = ${userId}
      ) inner_q
      ORDER BY inner_q.occurred_at DESC, inner_q.created_at DESC
      LIMIT ${limit}
    `);
    return (raw as unknown as RawRow[]).map((r) => ({
      id: r.id,
      siteId: r.site_id,
      siteName: r.site_name,
      type: r.type as RecentEvent["type"],
      balance: r.balance !== null ? Number.parseFloat(r.balance) : null,
      amount: r.amount !== null ? Number.parseFloat(r.amount) : null,
      delta: r.delta !== null ? Number.parseFloat(r.delta) : null,
      occurredAt: r.occurred_at instanceof Date ? r.occurred_at : new Date(String(r.occurred_at)),
    }));
  });
}

// Returns all events on a given local date (YYYY-MM-DD), grouped by site.
// Converts the local date to a UTC range before querying (invariant #5).
export async function getEventsForDate(
  userId: string,
  localDate: string,
  timezone: string,
): Promise<SiteDateEvents[]> {
  return withUser(userId, async (tx) => {
    const dayStartUtc = fromZonedTime(`${localDate}T00:00:00`, timezone);
    const parts = localDate.split("-").map(Number);
    const nextMs = Date.UTC(parts[0]!, parts[1]! - 1, parts[2]! + 1);
    const nextDate = new Date(nextMs);
    const nextDateStr = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDate.getUTCDate()).padStart(2, "0")}`;
    const dayEndUtc = fromZonedTime(`${nextDateStr}T00:00:00`, timezone);
    // Use ISO strings in raw SQL — Drizzle's sql`` template does not auto-serialize
    // JS Date objects, so passing them directly produces "[object Object]" in the query.
    const dayStartIso = dayStartUtc.toISOString();
    const dayEndIso = dayEndUtc.toISOString();

    type RawRow = {
      id: string;
      site_id: string;
      site_name: string;
      type: string;
      balance: string | null;
      amount: string | null;
      occurred_at: Date | string;
      prev_balance: string | null;
    };
    const raw = await tx.execute(drizzleSql`
      SELECT
        e.id,
        e.site_id,
        s.name AS site_name,
        e.type,
        e.balance,
        e.amount,
        e.occurred_at,
        CASE WHEN e.type = 'balance_update' THEN (
          SELECT prev.balance FROM events prev
          WHERE prev.site_id = e.site_id
            AND prev.user_id = ${userId}
            AND prev.type = 'balance_update'
            AND (
              prev.occurred_at < e.occurred_at
              OR (prev.occurred_at = e.occurred_at AND prev.created_at < e.created_at)
            )
          ORDER BY prev.occurred_at DESC, prev.created_at DESC
          LIMIT 1
        ) ELSE NULL END AS prev_balance
      FROM events e
      JOIN sites s ON s.id = e.site_id
      WHERE e.user_id = ${userId}
        AND e.occurred_at >= ${dayStartIso}::timestamptz
        AND e.occurred_at < ${dayEndIso}::timestamptz
      ORDER BY e.site_id ASC, e.occurred_at ASC, e.created_at ASC
    `);

    const bySite = new Map<string, SiteDateEvents>();
    for (const r of raw as unknown as RawRow[]) {
      if (!bySite.has(r.site_id)) {
        bySite.set(r.site_id, { siteId: r.site_id, siteName: r.site_name, events: [] });
      }
      bySite.get(r.site_id)!.events.push({
        id: r.id,
        type: r.type as DateEventEntry["type"],
        balance: r.balance !== null ? Number.parseFloat(r.balance) : null,
        amount: r.amount !== null ? Number.parseFloat(r.amount) : null,
        occurredAt: r.occurred_at instanceof Date ? r.occurred_at : new Date(String(r.occurred_at)),
        predecessorBalance: r.prev_balance !== null ? Number.parseFloat(r.prev_balance) : null,
      });
    }
    return Array.from(bySite.values());
  });
}

// Updates a single balance_update row. Filters by id AND user_id.
export async function updateBalanceUpdateRow(
  userId: string,
  eventId: string,
  params: { balance: number; occurredAtUtc: Date },
): Promise<void> {
  return withUser(userId, async (tx) => {
    await tx
      .update(events)
      .set({
        balance: params.balance.toFixed(2),
        occurredAt: params.occurredAtUtc,
      })
      .where(and(eq(events.id, eventId), eq(events.userId, userId)));
  });
}

// Updates a single deposit/withdrawal row. Filters by id AND user_id.
export async function updateMoneyMovementRow(
  userId: string,
  eventId: string,
  params: { amount: number; type: "deposit" | "withdrawal"; occurredAtUtc: Date },
): Promise<void> {
  return withUser(userId, async (tx) => {
    await tx
      .update(events)
      .set({
        amount: params.amount.toFixed(2),
        type: params.type,
        occurredAt: params.occurredAtUtc,
      })
      .where(and(eq(events.id, eventId), eq(events.userId, userId)));
  });
}

// Deletes one event row, filtered by id AND user_id. No cascade — derivation
// handles re-baseline on read (invariant #2).
export async function deleteEventRow(userId: string, eventId: string): Promise<void> {
  return withUser(userId, async (tx) => {
    await tx.delete(events).where(and(eq(events.id, eventId), eq(events.userId, userId)));
  });
}

type BatchItem =
  | {
      action: "update_balance";
      eventId: string;
      balance: number;
      predecessorBalance: number | null;
      occurredAtUtc: Date;
    }
  | {
      action: "update_transaction";
      eventId: string;
      amount: number;
      transactionType: "deposit" | "withdrawal";
      occurredAtUtc: Date;
    };

// Saves multiple edits atomically in one withUser transaction (invariant #8).
// A3 check: if a balance_update's new balance equals its predecessorBalance (and
// predecessorBalance is not null, i.e. it's not the site's baseline), drop the row.
export async function batchSaveEdits(userId: string, items: BatchItem[]): Promise<void> {
  await withUser(userId, async (tx) => {
    for (const item of items) {
      if (item.action === "update_balance") {
        const isA3Drop =
          item.predecessorBalance !== null &&
          Math.round(item.balance * 100) === Math.round(item.predecessorBalance * 100);
        if (isA3Drop) {
          await tx
            .delete(events)
            .where(and(eq(events.id, item.eventId), eq(events.userId, userId)));
        } else {
          await tx
            .update(events)
            .set({ balance: item.balance.toFixed(2), occurredAt: item.occurredAtUtc })
            .where(and(eq(events.id, item.eventId), eq(events.userId, userId)));
        }
      } else {
        await tx
          .update(events)
          .set({
            amount: item.amount.toFixed(2),
            type: item.transactionType,
            occurredAt: item.occurredAtUtc,
          })
          .where(and(eq(events.id, item.eventId), eq(events.userId, userId)));
      }
    }
  });
}

export async function insertBalanceUpdate(
  userId: string,
  params: { siteId: string; balance: number; occurredAt: Date },
): Promise<void> {
  return withUser(userId, async (tx) => {
    await tx.insert(events).values({
      userId,
      siteId: params.siteId,
      type: "balance_update",
      balance: params.balance.toFixed(2),
      amount: null,
      occurredAt: params.occurredAt,
    });
  });
}
