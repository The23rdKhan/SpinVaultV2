import { useMemo } from 'react'
import {
  getCasinoPalette,
  getRarityPalette,
  hexWithAlpha,
  type CasinoPalette,
  type RarityPalette,
} from '@/theme/tokens'
import { useAppearance } from './appearance-context'
import { useGame } from './game-context'

export interface AppTheme extends CasinoPalette {
  /** Scroll / grouped surface — aliases `background` for legacy stacked layouts. */
  groupedBackground: string
  separator: string
  fillSecondary: string
  glassStroke: string
  rarity: RarityPalette
}

function shellTokens(palette: CasinoPalette, mode: 'dark' | 'light'): Pick<
  AppTheme,
  'groupedBackground' | 'separator' | 'fillSecondary' | 'glassStroke'
> {
  return {
    groupedBackground: palette.background,
    separator:
      mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.22)',
    fillSecondary:
      mode === 'dark' ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.10)',
    glassStroke:
      mode === 'dark' ? 'rgba(255,255,255,0.12)' : hexWithAlpha(palette.border, '33'),
  }
}

/**
 * Resolved palette for the active machine theme (`GameProvider`) and light/dark (`AppearanceProvider`).
 * Must be used under both providers.
 */
export function useCasinoTheme(): AppTheme {
  const { currentTheme } = useGame()
  const { resolvedMode } = useAppearance()
  return useMemo(() => {
    const palette = getCasinoPalette(currentTheme, resolvedMode)
    return {
      ...palette,
      ...shellTokens(palette, resolvedMode),
      rarity: getRarityPalette(resolvedMode),
    }
  }, [currentTheme, resolvedMode])
}
