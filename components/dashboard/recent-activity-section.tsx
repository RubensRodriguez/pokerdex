"use client";

import { format } from "date-fns-tz";
import { useState } from "react";

import { loadEventsForDate } from "@/app/(app)/dashboard/actions";
import { DayEditorModal } from "@/components/day-editor-modal";
import { RecentEventsList } from "@/components/recent-events-list";
import type { RecentEvent, SiteDateEvents } from "@/lib/queries/events";

interface RecentActivitySectionProps {
  events: RecentEvent[];
  timezone: string;
}

// Next.js serialises Date props to ISO strings crossing the server→client boundary.
function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

export function RecentActivitySection({ events, timezone }: RecentActivitySectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [siteDateEvents, setSiteDateEvents] = useState<SiteDateEvents[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  function localDateOf(event: RecentEvent): string {
    return format(toDate(event.occurredAt), "yyyy-MM-dd", { timeZone: timezone });
  }

  function handleEventClick(event: RecentEvent) {
    const date = localDateOf(event);
    // Open modal immediately with empty content, then load events async.
    setEditDate(date);
    setSiteDateEvents([]);
    setLoadError(null);
    setModalOpen(true);
    setIsLoading(true);

    loadEventsForDate({ localDate: date, timezone })
      .then((result) => {
        if (Array.isArray(result)) {
          setSiteDateEvents(result);
        } else {
          setLoadError(result.error);
        }
      })
      .catch(() => {
        setLoadError("Errore nel caricamento degli eventi. Riprova.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  function handleEdited() {
    if (!editDate) return;
    loadEventsForDate({ localDate: editDate, timezone })
      .then((result) => {
        if (Array.isArray(result)) setSiteDateEvents(result);
      })
      .catch(() => undefined);
  }

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] font-medium tracking-[0.11em] uppercase text-muted">
        Attività recente
      </p>

      <RecentEventsList events={events} timezone={timezone} onEventClick={handleEventClick} />

      <DayEditorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editDate={editDate || new Date().toISOString().slice(0, 10)}
        siteDateEvents={siteDateEvents}
        timezone={timezone}
        isLoading={isLoading}
        loadError={loadError}
        onEdited={handleEdited}
      />
    </div>
  );
}
