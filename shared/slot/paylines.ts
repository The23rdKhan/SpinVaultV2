/**
 * Canonical 9 payline paths for SpinVault (row index per column).
 * 0 = top row, 1 = middle, 2 = bottom — must match reel grid row order in the app.
 * Imported by `evaluate-spin.ts` (engine) and mobile `LinesModal` / `InfoModal`.
 */
export const SLOT_PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1], // 1 — middle row
  [0, 0, 0, 0, 0], // 2 — top row
  [2, 2, 2, 2, 2], // 3 — bottom row
  [0, 1, 2, 1, 0], // 4 — V shape
  [2, 1, 0, 1, 2], // 5 — inverted V
  [0, 0, 1, 2, 2], // 6 — diagonal down
  [2, 2, 1, 0, 0], // 7 — diagonal up
  [1, 0, 0, 0, 1], // 8 — top bump
  [1, 2, 2, 2, 1], // 9 — bottom bump
]

/** Short names for UI (Lines modal, compact lists). */
export const PAYLINE_SHORT_LABELS: readonly string[] = [
  'Middle row',
  'Top row',
  'Bottom row',
  'V shape',
  'Inverted V',
  'Diagonal down',
  'Diagonal up',
  'Top bump',
  'Bottom bump',
]

/**
 * Which payline indices (0-based) share the same row path as the winning segment
 * on reels 0 … positions.length−1. Empty if positions are not a left-anchored run
 * of at least 3 columns (engine rule for line wins).
 */
export function paylineIndicesForMatchedPrefix(positions: readonly [number, number][]): number[] {
  if (positions.length < 3) return []
  const sorted = [...positions].sort((a, b) => a[0] - b[0])
  if (sorted[0]![0] !== 0) return []
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]![0] !== sorted[i - 1]![0] + 1) return []
  }
  const rowByCol = sorted.map((p) => p[1])
  const hits: number[] = []
  SLOT_PAYLINES.forEach((path, idx) => {
    let ok = true
    for (let c = 0; c < rowByCol.length; c++) {
      if (path[c] !== rowByCol[c]) {
        ok = false
        break
      }
    }
    if (ok) hits.push(idx)
  })
  return hits
}
