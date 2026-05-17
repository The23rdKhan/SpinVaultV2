import type { SlotSymbol } from '@/lib/game-context'

/** Canonical reel-symbol accent colors (shared by glows, paylines, light/dark machine chrome). */
export const VAULT_REEL_PALETTE = {
  gold: '#FFD76A',
  deepGold: '#C9972B',
  teal: '#20D6C7',
  purple: '#A855F7',
  blue: '#4DBBFF',
  redSeven: '#FF3B3B',
} as const

/** Per-symbol win ring / halo colors — visual only. */
export interface SymbolWinGlow {
  ring: string
  shadow: string
  /** Optional low-opacity accent (e.g. jackpot red on seven). */
  accent?: string
}

const SYMBOL_WIN_GLOW_DARK: Record<string, SymbolWinGlow> = {
  seven: { ring: VAULT_REEL_PALETTE.gold, shadow: VAULT_REEL_PALETTE.gold, accent: VAULT_REEL_PALETTE.redSeven },
  lemon: { ring: VAULT_REEL_PALETTE.gold, shadow: VAULT_REEL_PALETTE.deepGold },
  diamond: { ring: VAULT_REEL_PALETTE.blue, shadow: VAULT_REEL_PALETTE.teal },
  cherry: { ring: VAULT_REEL_PALETTE.purple, shadow: VAULT_REEL_PALETTE.purple },
  bell: { ring: VAULT_REEL_PALETTE.teal, shadow: VAULT_REEL_PALETTE.gold },
  orange: { ring: VAULT_REEL_PALETTE.gold, shadow: VAULT_REEL_PALETTE.deepGold },
  grape: { ring: VAULT_REEL_PALETTE.gold, shadow: VAULT_REEL_PALETTE.purple },
  wild: { ring: VAULT_REEL_PALETTE.gold, shadow: VAULT_REEL_PALETTE.deepGold },
  scatter: { ring: VAULT_REEL_PALETTE.purple, shadow: VAULT_REEL_PALETTE.gold },
}

/** Slightly deeper rings on white reel tiles so halos match symbol art in light mode. */
const SYMBOL_WIN_GLOW_LIGHT: Record<string, SymbolWinGlow> = {
  seven: { ring: VAULT_REEL_PALETTE.deepGold, shadow: VAULT_REEL_PALETTE.gold, accent: '#DC2626' },
  lemon: { ring: VAULT_REEL_PALETTE.deepGold, shadow: VAULT_REEL_PALETTE.gold },
  diamond: { ring: '#2E9AE0', shadow: VAULT_REEL_PALETTE.blue },
  cherry: { ring: '#9333EA', shadow: VAULT_REEL_PALETTE.purple },
  bell: { ring: '#0D9488', shadow: VAULT_REEL_PALETTE.teal },
  orange: { ring: VAULT_REEL_PALETTE.deepGold, shadow: VAULT_REEL_PALETTE.gold },
  grape: { ring: VAULT_REEL_PALETTE.deepGold, shadow: VAULT_REEL_PALETTE.purple },
  wild: { ring: VAULT_REEL_PALETTE.deepGold, shadow: VAULT_REEL_PALETTE.gold },
  scatter: { ring: '#9333EA', shadow: VAULT_REEL_PALETTE.deepGold },
}

export function getSymbolWinGlow(
  symbol: SlotSymbol,
  mode: 'dark' | 'light' = 'dark',
): SymbolWinGlow {
  const table = mode === 'light' ? SYMBOL_WIN_GLOW_LIGHT : SYMBOL_WIN_GLOW_DARK
  if (symbol.isWild) return table.wild
  if (symbol.isScatter) return table.scatter
  const keyed = table[symbol.id]
  return keyed ?? table.diamond
}
