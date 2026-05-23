// All functions take userId first and run inside withUser(). No query against
// `sites` may run outside a withUser block (RLS contract, see architecture).
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { sites } from "@/db/schema";
import { withUser } from "@/db/with-user";

export async function getSiteById(userId: string, siteId: string) {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(sites)
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  });
}

// Returns one entry per active (non-archived) site with the balance from that
// site's most recent balance_update event (decision 1 — deposits/withdrawals
// do NOT affect this value). Sites with no balance_update return balance 0.
export async function getCurrentBalances(
  userId: string,
): Promise<Array<{ siteId: string; name: string; balance: number; createdAt: Date }>> {
  return withUser(userId, async (tx) => {
    type RawRow = {
      site_id: string;
      name: string;
      created_at: Date | string;
      balance: string | null;
    };
    const raw = await tx.execute(sql`
      SELECT
        s.id          AS site_id,
        s.name        AS name,
        s.created_at  AS created_at,
        e.balance     AS balance
      FROM sites s
      LEFT JOIN LATERAL (
        SELECT balance FROM events
        WHERE site_id = s.id
          AND user_id = ${userId}
          AND type = 'balance_update'
        ORDER BY occurred_at DESC, created_at DESC
        LIMIT 1
      ) e ON true
      WHERE s.user_id = ${userId} AND s.archived = false
      ORDER BY s.created_at ASC
    `);
    return (raw as unknown as RawRow[]).map((r) => ({
      siteId: r.site_id,
      name: r.name,
      balance: r.balance !== null ? Number.parseFloat(r.balance) : 0,
      createdAt: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
    }));
  });
}
