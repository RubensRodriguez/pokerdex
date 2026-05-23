import { formatEur } from "@/lib/utils";

interface SiteRow {
  name: string;
  balance: number;
  color: string;
  share?: number;
}

interface SitesSummaryCardProps {
  sites: SiteRow[];
  count: number;
}

export function SitesSummaryCard({ sites, count }: SitesSummaryCardProps) {
  return (
    <div>
      <p className="font-mono text-[10px] font-medium tracking-[0.10em] uppercase text-muted mb-3">
        Sites · {count}
      </p>
      <div>
        {sites.map((site) => (
          <div
            key={site.name}
            className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0"
          >
            {/* Rounded-square color badge per ui-context.md per-site identity */}
            <span
              className="flex-none w-[10px] h-[10px] rounded-[3px]"
              style={{ backgroundColor: site.color }}
            />
            <span className="flex-1 text-[13px] font-medium text-text truncate">{site.name}</span>
            {site.share !== undefined && (
              <span className="font-mono text-[11px] text-muted tabular-nums">
                {(site.share * 100).toFixed(1)}%
              </span>
            )}
            <span className="font-mono text-[13px] text-text tabular-nums">
              {formatEur(site.balance)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
