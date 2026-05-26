import { z } from "zod";

export const newUpdateSchema = z.object({
  balance: z
    .number({ error: "Inserisci un importo valido" })
    .nonnegative("Il saldo non può essere negativo")
    .finite("Inserisci un importo valido")
    .refine((n) => parseFloat(n.toFixed(2)) === n, {
      message: "Massimo due decimali",
    }),
});

export type NewUpdateInput = z.infer<typeof newUpdateSchema>;

const eurAmount = z
  .number({ error: "Inserisci un importo valido" })
  .nonnegative("L'importo non può essere negativo")
  .finite("Inserisci un importo valido")
  .refine((n) => parseFloat(n.toFixed(2)) === n, { message: "Massimo due decimali" });

export const updateBalanceUpdateSchema = z.object({
  eventId: z.string().uuid(),
  balance: eurAmount,
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
});
export type UpdateBalanceUpdateInput = z.infer<typeof updateBalanceUpdateSchema>;

export const deleteEventSchema = z.object({
  eventId: z.string().uuid(),
});
export type DeleteEventInput = z.infer<typeof deleteEventSchema>;

export const updateTransactionSchema = z.object({
  eventId: z.string().uuid(),
  amount: eurAmount,
  type: z.enum(["deposit", "withdrawal"]),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
});
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const loadEventsForDateSchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
});
export type LoadEventsForDateInput = z.infer<typeof loadEventsForDateSchema>;

const batchEditItemSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_balance"),
    eventId: z.string().uuid(),
    balance: eurAmount,
    predecessorBalance: z.number().nullable(),
  }),
  z.object({
    action: z.literal("update_transaction"),
    eventId: z.string().uuid(),
    amount: eurAmount,
    transactionType: z.enum(["deposit", "withdrawal"]),
  }),
]);

export const saveEditsForDateSchema = z.object({
  items: z.array(batchEditItemSchema).min(1),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
});
export type SaveEditsForDateInput = z.infer<typeof saveEditsForDateSchema>;
