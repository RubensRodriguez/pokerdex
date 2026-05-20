// EXCEPTION: The two functions in this file do not take a userId argument.
// They are called from the Clerk webhook, which is the operation that
// creates or destroys the user row itself. No other code in lib/queries/
// may follow this pattern.

import "server-only";

import { count, eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

export async function countUsers(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(users);
  return row?.value ?? 0;
}

export async function createUserFromClerk(params: {
  clerkUserId: string;
  email: string;
}): Promise<void> {
  await db
    .insert(users)
    .values({
      id: params.clerkUserId,
      email: params.email,
      timezone: "Europe/Rome",
      density: "comfortable",
    })
    .onConflictDoNothing({ target: users.id });
}

export async function deleteUserFromClerk(clerkUserId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, clerkUserId));
}
