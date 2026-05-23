import Link from "next/link";

export function DashboardEmptyState() {
  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] font-medium tracking-[0.11em] uppercase text-muted">
        Dashboard
      </p>
      <div className="border border-dashed border-accent-line rounded-xl p-8 flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-text-dim">
          Nessun sito configurato. Aggiungi un sito per iniziare a tracciare il tuo bankroll.
        </p>
        <Link
          href="/settings"
          className="pdx-btn pdx-btn-primary px-4 py-2 rounded-lg text-[13px] font-medium"
          style={{ background: "var(--accent)", color: "#0a0805" }}
        >
          Aggiungi un sito
        </Link>
      </div>
    </div>
  );
}
