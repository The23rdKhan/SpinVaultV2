import type { SlotSymbol } from '@/lib/game-context'

/** Per-symbol win ring / halo colors — visual only. */
export interface SymbolWinGlow {
  ring: string
  shadow: string
  /** Optional low-opacity accent (e.g. jackpot red on seven). */
  accent?: string
}

export const SYMBOL_WIN_GLOW = {
  seven: { ring: '#FFD76A', shadow: '#FFD76A', accent: '#FF3B3B' },
  lemon: { ring: '#FFD76A', shadow: '#C9972B' },
  diamond: { ring: '#4DBBFF', shadow: '#20D6C7' },
  cherry: { ring: '#A855F7', shadow: '#A855F7' },
  bell: { ring: '#20D6C7', shadow: '#FFD76A' },
  orange: { ring: '#FFD76A', shadow: '#C9972B' },
  grape: { ring: '#FFD76A', shadow: '#A855F7' },
  wild: { ring: '#FFD76A', shadow: '#C9972B' },
  scatter: { ring: '#A855F7', shadow: '#FFD76A' },
} as const satisfies Record<string, SymbolWinGlow>

export function getSymbolWinGlow(symbol: SlotSymbol): SymbolWinGlow {
  if (symbol.isWild) return SYMBOL_WIN_GLOW.wild
  if (symbol.isScatter) return SYMBOL_WIN_GLOW.scatter
  const keyed = SYMBOL_WIN_GLOW[symbol.id as keyof typeof SYMBOL_WIN_GLOW]
  return keyed ?? SYMBOL_WIN_GLOW.diamond
}
