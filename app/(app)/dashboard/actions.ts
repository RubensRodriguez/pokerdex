"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { getCurrentBalance, insertBalanceUpdate } from "@/lib/queries/events";
import { getSiteById } from "@/lib/queries/sites";
import { newUpdateSchema } from "@/lib/validation/events";

export type CreateBalanceResult =
  | { status: "ok" }
  | { status: "noop" }
  | { status: "error"; message: string };

export async function createBalanceUpdate(input: unknown): Promise<CreateBalanceResult> {
  // 1. Auth
  const { userId } = await auth();
  if (!userId) return { status: "error", message: "Non autenticato" };

  // 2. Validate (server-side; client validation is UX only)
  const parsed = newUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Dati non validi" };
  }
  const { balance } = parsed.data;

  // Site ID comes from the server env, never from the client payload.
  const siteId = process.env.SEED_SITE_ID;
  if (!siteId) return { status: "error", message: "SEED_SITE_ID non configurato" };

  // 3. Query — confirm the site belongs to this user, no-op check, insert.
  const site = await getSiteById(userId, siteId);
  if (!site) return { status: "error", message: "Sito non trovato" };

  const current = await getCurrentBalance(userId, siteId);
  if (current !== null && Math.round(current * 100) === Math.round(balance * 100)) {
    return { status: "noop" }; // invariant #7
  }

  await insertBalanceUpdate(userId, {
    siteId,
    balance,
    occurredAt: new Date(),
  });

  // 4. Revalidate
  revalidatePath("/dashboard");
  return { status: "ok" };
}
