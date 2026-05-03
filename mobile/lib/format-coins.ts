/**
 * Compact coin counts for shop labels (e.g. 1M, 350k).
 * Not localized currency — display-only.
 */
export function formatShortCoins(n: number): string {
  if (n >= 1_000_000) {
    if (n % 1_000_000 === 0) return `${n / 1_000_000}M`
    return `${(n / 1_000_000).toFixed(1)}M`
  }
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}
