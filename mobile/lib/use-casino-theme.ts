import { useMemo } from 'react'
import { getCasinoPalette, type CasinoPalette } from '@/theme/tokens'
import { useAppearance } from './appearance-context'
import { useGame } from './game-context'

/**
 * Resolved palette for the active machine theme (`GameProvider`) and light/dark (`AppearanceProvider`).
 * Must be used under both providers.
 */
export function useCasinoTheme(): CasinoPalette {
  const { currentTheme } = useGame()
  const { resolvedMode } = useAppearance()
  return useMemo(
    () => getCasinoPalette(currentTheme, resolvedMode),
    [currentTheme, resolvedMode]
  )
}
