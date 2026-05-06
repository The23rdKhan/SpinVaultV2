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

// =============================================================================
// THEME LAYER ARCHITECTURE
// =============================================================================
//
// SpinVault uses a two-layer theme system:
//
//  ┌─────────────────────────────────────────────────────────────────────────┐
//  │  LAYER 1 — GLOBAL BRAND SHELL (always SpinVault)                       │
//  │                                                                         │
//  │  Controls: onboarding, login, register, forgot/reset password,         │
//  │            profile, account, support, legal docs, tab bar,              │
//  │            app icon, splash screen, navigation chrome.                  │
//  │                                                                         │
//  │  Token source: MASTER_SEMANTIC_LIGHT / MASTER_SEMANTIC_DARK in         │
//  │                mobile/theme/tokens.ts                                   │
//  │                                                                         │
//  │  Hooks:  getSpinVaultShellBackground(mode)   ← use for loading gates   │
//  │          getSpinVaultShellPrimary(mode)       ← use for gate spinners   │
//  │          useAppearance()                      ← light/dark mode only    │
//  │                                                                         │
//  │  Rule:   Shell screens MUST NOT call useCasinoTheme() if they need to  │
//  │          guarantee brand-stable appearance regardless of selected theme. │
//  │          In practice most shell screens call useCasinoTheme() safely    │
//  │          because machine skins only override MACHINE_OVERRIDE_KEYS      │
//  │          (see Layer 2). However, app gate / loading routes should       │
//  │          continue using getSpinVaultShell* to avoid the GameProvider    │
//  │          dependency entirely.                                           │
//  └─────────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────────┐
//  │  LAYER 2 — MACHINE SKIN (user-purchased slot theme)                    │
//  │                                                                         │
//  │  Controls: slot machine cabinet, reel background, reel border,         │
//  │            spin button gradient, payline highlight, win/jackpot         │
//  │            celebration colors, corner pulse accents.                    │
//  │                                                                         │
//  │  Skin-overridable tokens (MACHINE_OVERRIDE_KEYS in tokens.ts):         │
//  │    cabinetBg · cabinetBorder · reelBg · reelBorder                     │
//  │    spinButtonStart · spinButtonEnd · jackpot · win · machineAccent     │
//  │                                                                         │
//  │  Hook:  useCasinoTheme()  ← merges Layer 1 shell + Layer 2 skin        │
//  │                                                                         │
//  │  Rule:   Only slot-machine components (SlotMachine, ReelGrid,          │
//  │          ControlDeck, WinDisplay, Marquee, PaylineOverlay) and the      │
//  │          Play screen should consume skin-overridable tokens directly.   │
//  │                                                                         │
//  │  ⚠️  Avoid using t.jackpot or t.machineAccent in reward/profile/       │
//  │      onboarding UI. Vegas skin maps t.jackpot → red (#ef4444),         │
//  │      which reads as a penalty color outside the machine context.        │
//  │      Use t.gold (always #D4AF37, shell-stable) for premium rewards.    │
//  └─────────────────────────────────────────────────────────────────────────┘
//
//  SHELL-STABLE TOKENS (never overridden by any machine skin):
//    background · surface · surfaceElevated · card · cardSoft
//    textPrimary · textSecondary · textMuted
//    border · primary · primaryForeground · primarySoft
//    secondary · secondaryForeground · accent · accentSoft
//    gold · bonus · freeSpin · destructive · destructiveForeground
//    locked · unlocked · shadow · overlay · tabBar · input
//    popover · popoverForeground
//
// =============================================================================

export interface AppTheme extends CasinoPalette {
  /** Scroll / grouped surface — aliases `background` for legacy stacked layouts. */
  groupedBackground: string
  separator: string
  fillSecondary: string
  glassStroke: string
  rarity: RarityPalette
}

/** Adds iOS-HIG-style extra shell tokens that don't exist in `CasinoPalette`. */
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
 * Returns the fully resolved palette for the active machine skin and light/dark mode.
 *
 * This hook merges the Global Brand Shell (Layer 1) with the user's purchased
 * machine skin (Layer 2). See the THEME LAYER ARCHITECTURE comment block above
 * for guidance on which tokens are safe to use in shell screens vs. machine UI.
 *
 * Must be used within both `AppearanceProvider` and `GameProvider`.
 *
 * For loading gate routes that render before `GameProvider` is mounted, use
 * `getSpinVaultShellBackground` / `getSpinVaultShellPrimary` from `@/theme/tokens` instead.
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
