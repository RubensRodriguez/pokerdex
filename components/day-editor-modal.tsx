"use client";

import { it } from "date-fns/locale";
import { format } from "date-fns-tz";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import {
  deleteBalanceUpdate,
  deleteTransaction,
  saveEditsForDate,
} from "@/app/(app)/dashboard/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { DateEventEntry, SiteDateEvents } from "@/lib/queries/events";
import { cn, formatEur, formatEurDelta } from "@/lib/utils";

interface DayEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDate: string;
  siteDateEvents: SiteDateEvents[];
  timezone: string;
  isLoading?: boolean;
  loadError?: string | null;
  onEdited: () => void;
}

interface EditState {
  balance?: number;
  amount?: number;
}

function formatLocalDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return format(dt, "d MMMM yyyy", { locale: it, timeZone: "UTC" });
}

function DeltaReadout({
  balance,
  predecessorBalance,
}: {
  balance: number;
  predecessorBalance: number | null;
}) {
  if (predecessorBalance === null) return null;
  const delta = balance - predecessorBalance;
  const isPos = delta > 0;
  const isNeg = delta < 0;
  return (
    <span
      className={cn(
        "font-mono text-[11px] tabular-nums ml-1",
        isPos ? "text-positive" : isNeg ? "text-negative" : "text-muted",
      )}
    >
      {formatEurDelta(delta)}
    </span>
  );
}

interface DeleteConfirm {
  eventId: string;
  type: DateEventEntry["type"];
  label: string;
}

export function DayEditorModal({
  open,
  onOpenChange,
  editDate,
  siteDateEvents,
  timezone,
  isLoading = false,
  loadError = null,
  onEdited,
}: DayEditorModalProps) {
  const [localDate, setLocalDate] = useState(editDate);
  const [edits, setEdits] = useState<Map<string, EditState>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [deleting, setDeleting] = useState(false);

  function getBalance(entry: DateEventEntry): number {
    return edits.get(entry.id)?.balance ?? entry.balance ?? 0;
  }

  function getAmount(entry: DateEventEntry): number {
    return edits.get(entry.id)?.amount ?? entry.amount ?? 0;
  }

  function setEditBalance(id: string, value: number) {
    setEdits((prev) => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id), balance: value });
      return next;
    });
  }

  function setEditAmount(id: string, value: number) {
    setEdits((prev) => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id), amount: value });
      return next;
    });
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);

    const items: Array<
      | {
          action: "update_balance";
          eventId: string;
          balance: number;
          predecessorBalance: number | null;
        }
      | {
          action: "update_transaction";
          eventId: string;
          amount: number;
          transactionType: "deposit" | "withdrawal";
        }
    > = [];

    for (const site of siteDateEvents) {
      for (const entry of site.events) {
        if (entry.type === "balance_update") {
          items.push({
            action: "update_balance",
            eventId: entry.id,
            balance: getBalance(entry),
            predecessorBalance: entry.predecessorBalance,
          });
        } else {
          items.push({
            action: "update_transaction",
            eventId: entry.id,
            amount: getAmount(entry),
            transactionType: entry.type,
          });
        }
      }
    }

    if (items.length === 0) {
      onOpenChange(false);
      setSaving(false);
      return;
    }

    const result = await saveEditsForDate({ items, localDate, timezone });
    setSaving(false);

    if (result.status === "error") {
      setSaveError(result.message);
      return;
    }

    onEdited();
    onOpenChange(false);
    setEdits(new Map());
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return;
    setDeleting(true);
    const action =
      deleteConfirm.type === "balance_update" ? deleteBalanceUpdate : deleteTransaction;
    const result = await action({ eventId: deleteConfirm.eventId });
    setDeleting(false);
    setDeleteConfirm(null);
    if (result.status === "error") {
      setSaveError(result.message);
      return;
    }
    onEdited();
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) setEdits(new Map());
          onOpenChange(o);
        }}
      >
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica &mdash; {formatLocalDate(localDate)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase tracking-[0.10em] text-muted">
              Data
            </label>
            <Input
              type="date"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-5 mt-2">
            {isLoading && (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-8 rounded bg-surface-2 animate-pulse" />
                ))}
              </div>
            )}
            {!isLoading && loadError && <p className="text-xs text-negative">{loadError}</p>}
            {!isLoading && !loadError && siteDateEvents.length === 0 && (
              <p className="text-xs text-muted">Nessun evento trovato per questa data.</p>
            )}
            {!isLoading &&
              siteDateEvents.map((site) => (
                <div key={site.siteId} className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.10em] text-muted border-b border-border pb-1">
                    {site.siteName}
                  </p>
                  {site.events.map((entry) => (
                    <EventRow
                      key={entry.id}
                      entry={entry}
                      balance={getBalance(entry)}
                      amount={getAmount(entry)}
                      onBalanceChange={(v) => setEditBalance(entry.id, v)}
                      onAmountChange={(v) => setEditAmount(entry.id, v)}
                      onDeleteRequest={(label) =>
                        setDeleteConfirm({ eventId: entry.id, type: entry.type, label })
                      }
                    />
                  ))}
                </div>
              ))}
          </div>

          {saveError && <p className="text-xs text-negative mt-2">{saveError}</p>}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio…" : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(o) => {
          if (!o) setDeleteConfirm(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo evento?</AlertDialogTitle>
            <AlertDialogDescription>{deleteConfirm?.label}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? "Eliminazione…" : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface EventRowProps {
  entry: DateEventEntry;
  balance: number;
  amount: number;
  onBalanceChange: (v: number) => void;
  onAmountChange: (v: number) => void;
  onDeleteRequest: (label: string) => void;
}

function EventRow({
  entry,
  balance,
  amount,
  onBalanceChange,
  onAmountChange,
  onDeleteRequest,
}: EventRowProps) {
  const typeLabel =
    entry.type === "balance_update" ? "Saldo" : entry.type === "deposit" ? "Deposito" : "Prelievo";

  const deleteLabel =
    entry.type === "balance_update"
      ? `Saldo ${formatEur(entry.balance ?? 0)}`
      : `${typeLabel} ${formatEur(entry.amount ?? 0)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted w-[52px] shrink-0">{typeLabel}</span>

      {entry.type === "balance_update" ? (
        <div className="flex-1 flex items-center gap-1 min-w-0">
          <Input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={balance}
            onChange={(e) => onBalanceChange(parseFloat(e.target.value) || 0)}
            className="font-mono text-xs h-7 px-2 flex-1"
          />
          <DeltaReadout balance={balance} predecessorBalance={entry.predecessorBalance} />
        </div>
      ) : (
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
          className="font-mono text-xs h-7 px-2 flex-1"
        />
      )}

      <button
        type="button"
        onClick={() => onDeleteRequest(deleteLabel)}
        className="shrink-0 p-1 text-muted hover:text-negative transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
        aria-label={`Elimina ${deleteLabel}`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
