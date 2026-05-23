// Deterministic color palette for per-site identity dots on the dashboard.
// Colors match the named-site palette in ui-context.md (same hues, ordered to
// avoid clash when multiple sites appear together).
const SITE_PALETTE = [
  "#d4b056", // chip gold  — PokerStars
  "#7aa9d4", // sky blue   — iPoker
  "#c97a7a", // coral      — Sisal
  "#7ac99a", // green      — 888 Poker
  "#b07ad4", // purple     — partypoker
  "#d49a7a", // sand       — GGPoker
  "#7ad4b0", // teal       — WPT Global
  "#9999a0", // slate      — Snai Poker
];

export function siteColor(index: number): string {
  return SITE_PALETTE[index % SITE_PALETTE.length]!;
}
