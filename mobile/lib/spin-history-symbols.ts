import { SYMBOLS, type SlotSymbol } from '@/lib/game-context'

/**
 * Resolves a spin-audit middle-row token to a symbol.
 * New rows store `symbol.id`; legacy rows stored `symbol.emoji`.
 */
export function resolveSpinHistorySymbol(token: string): SlotSymbol | undefined {
  if (!token || token === '?') return undefined
  const byId = SYMBOLS.find((s) => s.id === token)
  if (byId) return byId
  return SYMBOLS.find((s) => s.emoji === token)
}

export function formatSpinHistorySymbolsA11y(tokens: string[]): string {
  return tokens
    .map((t) => resolveSpinHistorySymbol(t)?.name ?? t)
    .join(', ')
}
