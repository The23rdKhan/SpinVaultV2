import { hexWithAlpha } from '@/theme/tokens'
import { VAULT_REEL_PALETTE } from './symbol-win-glow-colors'

/** Payline stroke accents — vault gem palette first; avoids generic teal-only lines in light mode. */
export function paylineAccentColors(mode: 'dark' | 'light'): string[] {
  const p = VAULT_REEL_PALETTE
  return [
    p.gold,
    hexWithAlpha(p.teal, mode === 'light' ? 'DD' : 'CC'),
    p.purple,
    hexWithAlpha(p.blue, mode === 'light' ? 'EE' : 'CC'),
    p.deepGold,
    hexWithAlpha(p.gold, mode === 'light' ? 'BB' : '99'),
    hexWithAlpha(p.purple, 'AA'),
    hexWithAlpha(p.teal, '99'),
    hexWithAlpha(p.blue, 'AA'),
  ]
}
