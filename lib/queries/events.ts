// All functions take userId first and run inside withUser(). No query against
// `events` may run outside a withUser block (RLS contract, see architecture).
import { and, desc, eq } from "drizzle-orm";

import { events } from "@/db/schema";
import { withUser } from "@/db/with-user";

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
