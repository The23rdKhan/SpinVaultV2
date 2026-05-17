import { hexWithAlpha } from '@/theme/tokens'
import type { AppTheme } from '@/lib/use-casino-theme'

/** Payline stroke accents — soft vault palette; red reserved for top-tier overlays elsewhere. */
export function paylineAccentColors(t: AppTheme): string[] {
  return [
    '#FFD76A',
    hexWithAlpha('#20D6C7', 'CC'),
    '#A855F7',
    hexWithAlpha(t.bonus, 'CC'),
    t.machineAccent,
    t.primary,
    hexWithAlpha('#FFD76A', '99'),
    hexWithAlpha('#4DBBFF', 'CC'),
    hexWithAlpha(t.gold, 'BB'),
  ]
}
