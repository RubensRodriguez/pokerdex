"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { createBalanceUpdate } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { newUpdateSchema, type NewUpdateInput } from "@/lib/validation/events";

export function NewUpdateModal({ currentBalance }: { currentBalance: number | null }) {
  const [open, setOpen] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewUpdateInput>({
    resolver: zodResolver(newUpdateSchema),
    defaultValues: {
      balance: currentBalance ?? 0,
    },
  });

  async function onSubmit(values: NewUpdateInput) {
    setServerMsg(null);
    const res = await createBalanceUpdate(values);
    if (res.status === "ok") {
      setOpen(false);
      reset({ balance: values.balance });
    } else if (res.status === "noop") {
      setServerMsg("Nessuna modifica: il saldo è invariato.");
    } else {
      setServerMsg(res.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nuovo aggiornamento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiorna saldo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="balance">Saldo attuale (€)</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              inputMode="decimal"
              {...register("balance", { valueAsNumber: true })}
            />
            {errors.balance && <p className="text-sm text-red-500">{errors.balance.message}</p>}
          </div>
          {serverMsg && <p className="text-sm">{serverMsg}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvataggio…" : "Salva"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
