import { sql } from "drizzle-orm";

import { db } from "./index";

/**
 * Runs the provided callback inside a transaction that:
 *   1. Switches the active role to `authenticated` (no BYPASSRLS),
 *   2. Sets the request.jwt.claims session variable to the Clerk user ID,
 *   3. Executes the callback with the transaction handle.
 *
 * Every read or write against sites/events/images MUST go through this helper.
 * Queries outside withUser run as the default role (superuser) and bypass RLS.
 */
export async function withUser<T>(
  clerkUserId: string,
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  if (!clerkUserId) {
    throw new Error("withUser called without a Clerk user ID");
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated`);
    await tx.execute(
      sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: clerkUserId })}, true)`,
    );
    return fn(tx);
  });
}
