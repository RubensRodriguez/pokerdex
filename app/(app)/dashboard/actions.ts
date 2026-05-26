"use server";

import { auth } from "@clerk/nextjs/server";
import { fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";

import {
  batchSaveEdits,
  deleteEventRow,
  getEventsForDate,
  getCurrentBalance,
  insertBalanceUpdate,
  updateBalanceUpdateRow,
  updateMoneyMovementRow,
  type SiteDateEvents,
} from "@/lib/queries/events";
import { getSiteById } from "@/lib/queries/sites";
import { getUser } from "@/lib/queries/users";
import {
  deleteEventSchema,
  loadEventsForDateSchema,
  newUpdateSchema,
  saveEditsForDateSchema,
  updateBalanceUpdateSchema,
  updateTransactionSchema,
} from "@/lib/validation/events";

export type CreateBalanceResult =
  | { status: "ok" }
  | { status: "noop" }
  | { status: "error"; message: string };

export async function createBalanceUpdate(input: unknown): Promise<CreateBalanceResult> {
  const { userId } = await auth();
  if (!userId) return { status: "error", message: "Non autenticato" };

  const parsed = newUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Dati non validi" };
  }
  const { balance } = parsed.data;

  const siteId = process.env.SEED_SITE_ID;
  if (!siteId) return { status: "error", message: "SEED_SITE_ID non configurato" };

  const site = await getSiteById(userId, siteId);
  if (!site) return { status: "error", message: "Sito non trovato" };

  const current = await getCurrentBalance(userId, siteId);
  if (current !== null && Math.round(current * 100) === Math.round(balance * 100)) {
    return { status: "noop" };
  }

  await insertBalanceUpdate(userId, { siteId, balance, occurredAt: new Date() });

  revalidatePath("/dashboard");
  return { status: "ok" };
}

export type MutationResult = { status: "ok" } | { status: "error"; message: string };

function toOccurredAtUtc(localDate: string, timezone: string): Date {
  return fromZonedTime(`${localDate}T12:00:00`, timezone);
}

export async function updateBalanceUpdate(input: unknown): Promise<MutationResult> {
  const { userId } = await auth();
  if (!userId) return { status: "error", message: "Non autenticato" };

  const parsed = updateBalanceUpdateSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Dati non validi" };

  const { eventId, balance, localDate, timezone } = parsed.data;
  const occurredAtUtc = toOccurredAtUtc(localDate, timezone);

  await updateBalanceUpdateRow(userId, eventId, { balance, occurredAtUtc });

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { status: "ok" };
}

export async function deleteBalanceUpdate(input: unknown): Promise<MutationResult> {
  const { userId } = await auth();
  if (!userId) return { status: "error", message: "Non autenticato" };

  const parsed = deleteEventSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Dati non validi" };

  await deleteEventRow(userId, parsed.data.eventId);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { status: "ok" };
}

export async function updateTransaction(input: unknown): Promise<MutationResult> {
  const { userId } = await auth();
  if (!userId) return { status: "error", message: "Non autenticato" };

  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Dati non validi" };

  const { eventId, amount, type, localDate, timezone } = parsed.data;
  const occurredAtUtc = toOccurredAtUtc(localDate, timezone);

  await updateMoneyMovementRow(userId, eventId, { amount, type, occurredAtUtc });

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { status: "ok" };
}

export async function deleteTransaction(input: unknown): Promise<MutationResult> {
  const { userId } = await auth();
  if (!userId) return { status: "error", message: "Non autenticato" };

  const parsed = deleteEventSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Dati non validi" };

  await deleteEventRow(userId, parsed.data.eventId);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { status: "ok" };
}

export async function loadEventsForDate(
  input: unknown,
): Promise<SiteDateEvents[] | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Non autenticato" };

  const parsed = loadEventsForDateSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const { localDate, timezone } = parsed.data;
  try {
    return await getEventsForDate(userId, localDate, timezone);
  } catch {
    return { error: "Errore nel caricamento degli eventi" };
  }
}

// Commits all edits for a day in one DB transaction (invariant #8).
export async function saveEditsForDate(input: unknown): Promise<MutationResult> {
  const { userId } = await auth();
  if (!userId) return { status: "error", message: "Non autenticato" };

  const parsed = saveEditsForDateSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Dati non validi" };

  const { items, localDate, timezone } = parsed.data;
  const occurredAtUtc = toOccurredAtUtc(localDate, timezone);

  const batchItems = items.map((item) => {
    if (item.action === "update_balance") {
      return {
        action: "update_balance" as const,
        eventId: item.eventId,
        balance: item.balance,
        predecessorBalance: item.predecessorBalance,
        occurredAtUtc,
      };
    }
    return {
      action: "update_transaction" as const,
      eventId: item.eventId,
      amount: item.amount,
      transactionType: item.transactionType,
      occurredAtUtc,
    };
  });

  await batchSaveEdits(userId, batchItems);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { status: "ok" };
}

export async function getUserTimezone(): Promise<string> {
  const { userId } = await auth();
  if (!userId) return "Europe/Rome";
  const user = await getUser(userId);
  return user?.timezone ?? "Europe/Rome";
}
