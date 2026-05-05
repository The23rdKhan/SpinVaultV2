import type { AppTheme } from '@/lib/use-casino-theme'

/** Nine distinguishable accent strokes for payline diagrams / overlays (semantic tokens only). */
export function paylineAccentColors(t: AppTheme): string[] {
  return [
    t.gold,
    t.win,
    t.freeSpin,
    t.bonus,
    t.machineAccent,
    t.primary,
    t.jackpot,
    t.accent,
    t.destructive,
  ]
}
