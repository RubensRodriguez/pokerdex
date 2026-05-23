import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formats an absolute EUR amount, symbol-first, it-IT grouping. e.g. 5182.8 → "€5.182,80"
// Accept string because Drizzle returns numeric columns as strings.
export function formatEur(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  const safe = Number.isFinite(n) ? n : 0;
  const body = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return `€${body}`;
}

// Formats a signed P&L delta. e.g. 637.2 → "+€637,20", -42.5 → "−€42,50", 0 → "€0,00"
// Uses U+2212 MINUS SIGN (−), not hyphen-minus.
export function formatEurDelta(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (safe === 0) return formatEur(0);
  const sign = safe > 0 ? "+" : "−";
  return `${sign}${formatEur(Math.abs(safe))}`;
}
