// All functions take userId first and run inside withUser(). No query against
// `sites` may run outside a withUser block (RLS contract, see architecture).
import { and, eq } from "drizzle-orm";

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
