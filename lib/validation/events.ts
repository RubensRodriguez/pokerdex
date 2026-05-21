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
