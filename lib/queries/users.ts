import "server-only";

import { count } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

export async function countUsers(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(users);
  return row?.value ?? 0;
}
