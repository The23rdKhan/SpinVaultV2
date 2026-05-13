/**
 * Win celebration **visual** variants — selection only; does not affect RNG, payouts, or wallet.
 * Pairs with `WinDisplay`, `SlotSymbol`, and `PaylineOverlay` for variety without duplicate systems.
 */

import type { WinType } from '@shared/slot/evaluate-spin'

export type AppWinType = 'none' | 'normal' | 'bigWin' | 'megaWin' | 'jackpot' | 'bonusTrigger'

export type AppThemeId = 'vegas' | 'cyber' | 'treasure' | (string & {})

export type WinEffectKey =
  | 'symbolPulse'
  | 'paylineGlow'
  | 'coinBurst'
  | 'coinRain'
  | 'confetti'
  | 'sparkleSweep'
  | 'screenFlash'
  | 'screenShake'
  | 'spotlight'
  | 'jackpotBurst'
  | 'vaultOpen'
  | 'portalOpen'
  | 'neonPulse'
  | 'treasureBurst'

export type WinAnimationVariant = {
  id: string
  winType: AppWinType
  themeId: AppThemeId | 'common'
  headline: string
  subheadline?: string
  durationMs: number
  skippableAfterMs: number
  weight: number
  intensity: 'subtle' | 'medium' | 'high' | 'legendary'
  overlayMode: 'none' | 'compact' | 'center' | 'fullScreen' | 'bonus'
  effects: WinEffectKey[]
}

const HEAVY_EFFECTS: WinEffectKey[] = ['screenShake', 'jackpotBurst']

function isHeavyForRm(v: WinAnimationVariant): boolean {
  return v.effects.some((e) => HEAVY_EFFECTS.includes(e) || e === 'coinRain')
}

function weightedPick(pool: WinAnimationVariant[]): WinAnimationVariant | null {
  if (pool.length === 0) return null
  const w = pool.reduce((s, v) => s + v.weight, 0)
  let r = Math.random() * w
  for (const v of pool) {
    r -= v.weight
    if (r <= 0) return v
  }
  return pool[pool.length - 1]!
}

/**
 * Maps the last spin to an animation bucket for `pickWinAnimationVariant`.
 *
 * When `lastSpinFreeSpinsWon > 0` or `lastScatterCount >= 3`, returns **`bonusTrigger`** so
 * visual selection prefers bonus / free-spin celebration presets. That intentionally takes
 * priority over the normal / bigWin / megaWin / jackpot payout tier for **animation choice only**:
 * unlocking free spins is treated as a special transition moment. The evaluator `lastWinType`
 * and payout logic elsewhere are unchanged — this function does not alter wallet or tier math.
 */
export function getAnimationWinType(params: {
  lastWinType: WinType
  lastSpinFreeSpinsWon?: number
  lastScatterCount?: number
}): AppWinType {
  const { lastWinType, lastSpinFreeSpinsWon = 0, lastScatterCount = 0 } = params
  if (lastSpinFreeSpinsWon > 0 || lastScatterCount >= 3) return 'bonusTrigger'
  if (lastWinType === 'none') return 'none'
  return lastWinType as AppWinType
}

const COMMON_VARIANTS: WinAnimationVariant[] = [
  {
    id: 'normal_symbol_glow',
    winType: 'normal',
    themeId: 'common',
    headline: 'NICE WIN',
    durationMs: 700,
    skippableAfterMs: 280,
    weight: 3,
    intensity: 'subtle',
    overlayMode: 'none',
    effects: ['symbolPulse', 'paylineGlow', 'sparkleSweep'],
  },
  {
    id: 'normal_coin_sparkle',
    winType: 'normal',
    themeId: 'common',
    headline: 'WIN',
    durationMs: 820,
    skippableAfterMs: 320,
    weight: 2,
    intensity: 'subtle',
    overlayMode: 'compact',
    effects: ['coinBurst', 'symbolPulse'],
  },
  {
    id: 'big_coin_burst',
    winType: 'bigWin',
    themeId: 'common',
    headline: 'BIG WIN',
    durationMs: 3200,
    skippableAfterMs: 500,
    weight: 2,
    intensity: 'high',
    overlayMode: 'center',
    effects: ['coinBurst', 'sparkleSweep', 'screenFlash'],
  },
  {
    id: 'big_gold_sweep',
    winType: 'bigWin',
    themeId: 'common',
    headline: 'BIG WIN',
    durationMs: 3000,
    skippableAfterMs: 500,
    weight: 2,
    intensity: 'medium',
    overlayMode: 'center',
    effects: ['sparkleSweep', 'paylineGlow', 'coinBurst'],
  },
  {
    id: 'mega_coin_rain',
    winType: 'megaWin',
    themeId: 'common',
    headline: 'MEGA WIN',
    durationMs: 4200,
    skippableAfterMs: 700,
    weight: 2,
    intensity: 'legendary',
    overlayMode: 'fullScreen',
    effects: ['coinRain', 'confetti', 'spotlight'],
  },
  {
    id: 'mega_screen_flash',
    winType: 'megaWin',
    themeId: 'common',
    headline: 'MEGA WIN',
    durationMs: 4000,
    skippableAfterMs: 700,
    weight: 2,
    intensity: 'high',
    overlayMode: 'fullScreen',
    effects: ['screenFlash', 'coinBurst', 'spotlight'],
  },
  {
    id: 'jackpot_fireworks',
    winType: 'jackpot',
    themeId: 'common',
    headline: 'JACKPOT',
    durationMs: 7800,
    skippableAfterMs: 2000,
    weight: 2,
    intensity: 'legendary',
    overlayMode: 'fullScreen',
    effects: ['jackpotBurst', 'coinRain', 'confetti', 'spotlight'],
  },
  {
    id: 'jackpot_vault_open',
    winType: 'jackpot',
    themeId: 'common',
    headline: 'JACKPOT',
    durationMs: 7600,
    skippableAfterMs: 2000,
    weight: 2,
    intensity: 'legendary',
    overlayMode: 'fullScreen',
    effects: ['vaultOpen', 'coinRain', 'screenFlash'],
  },
  {
    id: 'bonus_free_spins',
    winType: 'bonusTrigger',
    themeId: 'common',
    headline: 'BONUS UNLOCKED',
    subheadline: 'FREE SPINS AWARDED',
    durationMs: 2800,
    skippableAfterMs: 500,
    weight: 4,
    intensity: 'high',
    overlayMode: 'bonus',
    effects: ['portalOpen', 'sparkleSweep', 'coinBurst'],
  },
]

const THEME_VARIANTS: WinAnimationVariant[] = [
  {
    id: 'vegas_big_lights',
    winType: 'bigWin',
    themeId: 'vegas',
    headline: 'BIG WIN',
    durationMs: 3100,
    skippableAfterMs: 500,
    weight: 2,
    intensity: 'high',
    overlayMode: 'center',
    effects: ['sparkleSweep', 'screenFlash', 'coinBurst'],
  },
  {
    id: 'vegas_mega_spotlight',
    winType: 'megaWin',
    themeId: 'vegas',
    headline: 'MEGA WIN',
    durationMs: 4300,
    skippableAfterMs: 700,
    weight: 2,
    intensity: 'legendary',
    overlayMode: 'fullScreen',
    effects: ['spotlight', 'coinRain', 'confetti'],
  },
  {
    id: 'vegas_jackpot_showtime',
    winType: 'jackpot',
    themeId: 'vegas',
    headline: 'JACKPOT SHOWTIME',
    durationMs: 8000,
    skippableAfterMs: 2000,
    weight: 2,
    intensity: 'legendary',
    overlayMode: 'fullScreen',
    effects: ['jackpotBurst', 'coinRain', 'spotlight'],
  },
  {
    id: 'vegas_bonus_vault',
    winType: 'bonusTrigger',
    themeId: 'vegas',
    headline: 'BONUS VAULT OPENED',
    subheadline: 'FREE SPINS AWARDED',
    durationMs: 3000,
    skippableAfterMs: 500,
    weight: 3,
    intensity: 'high',
    overlayMode: 'bonus',
    effects: ['vaultOpen', 'coinBurst', 'sparkleSweep'],
  },
  {
    id: 'cyber_normal_neon',
    winType: 'normal',
    themeId: 'cyber',
    headline: 'SYSTEM WIN',
    durationMs: 900,
    skippableAfterMs: 320,
    weight: 2,
    intensity: 'subtle',
    overlayMode: 'compact',
    effects: ['neonPulse', 'paylineGlow', 'symbolPulse'],
  },
  {
    id: 'cyber_big_breach',
    winType: 'bigWin',
    themeId: 'cyber',
    headline: 'BIG BREACH',
    durationMs: 3300,
    skippableAfterMs: 500,
    weight: 2,
    intensity: 'high',
    overlayMode: 'center',
    effects: ['neonPulse', 'screenFlash', 'coinBurst'],
  },
  {
    id: 'cyber_mega_overload',
    winType: 'megaWin',
    themeId: 'cyber',
    headline: 'MEGA OVERLOAD',
    durationMs: 4400,
    skippableAfterMs: 700,
    weight: 2,
    intensity: 'legendary',
    overlayMode: 'fullScreen',
    effects: ['neonPulse', 'coinRain', 'spotlight'],
  },
  {
    id: 'cyber_jackpot_system',
    winType: 'jackpot',
    themeId: 'cyber',
    headline: 'SYSTEM JACKPOT',
    durationMs: 7900,
    skippableAfterMs: 2000,
    weight: 2,
    intensity: 'legendary',
    overlayMode: 'fullScreen',
    effects: ['jackpotBurst', 'neonPulse', 'screenFlash'],
  },
  {
    id: 'cyber_bonus_portal',
    winType: 'bonusTrigger',
    themeId: 'cyber',
    headline: 'PORTAL CHARGED',
    subheadline: 'FREE SPINS AWARDED',
    durationMs: 3000,
    skippableAfterMs: 500,
    weight: 3,
    intensity: 'high',
    overlayMode: 'bonus',
    effects: ['portalOpen', 'neonPulse', 'sparkleSweep'],
  },
  {
    id: 'treasure_normal_spark',
    winType: 'normal',
    themeId: 'treasure',
    headline: 'TREASURE FOUND',
    durationMs: 780,
    skippableAfterMs: 300,
    weight: 2,
    intensity: 'subtle',
    overlayMode: 'compact',
    effects: ['sparkleSweep', 'symbolPulse'],
  },
  {
    id: 'treasure_big_chest',
    winType: 'bigWin',
    themeId: 'treasure',
    headline: 'TREASURE BURST',
    durationMs: 3200,
    skippableAfterMs: 500,
    weight: 2,
    intensity: 'high',
    overlayMode: 'center',
    effects: ['treasureBurst', 'coinBurst', 'sparkleSweep'],
  },
  {
    id: 'treasure_mega_vault',
    winType: 'megaWin',
    themeId: 'treasure',
    headline: 'VAULT RAID',
    durationMs: 4500,
    skippableAfterMs: 700,
    weight: 2,
    intensity: 'legendary',
    overlayMode: 'fullScreen',
    effects: ['vaultOpen', 'coinRain', 'confetti'],
  },
  {
    id: 'treasure_jackpot_legend',
    winType: 'jackpot',
    themeId: 'treasure',
    headline: 'LEGENDARY VAULT',
    durationMs: 8100,
    skippableAfterMs: 2000,
    weight: 2,
    intensity: 'legendary',
    overlayMode: 'fullScreen',
    effects: ['jackpotBurst', 'vaultOpen', 'coinRain'],
  },
  {
    id: 'treasure_bonus_map',
    winType: 'bonusTrigger',
    themeId: 'treasure',
    headline: 'TREASURE BONUS',
    subheadline: 'FREE SPINS AWARDED',
    durationMs: 2900,
    skippableAfterMs: 500,
    weight: 3,
    intensity: 'high',
    overlayMode: 'bonus',
    effects: ['treasureBurst', 'sparkleSweep', 'coinBurst'],
  },
]

export function pickWinAnimationVariant(params: {
  winType: AppWinType
  themeId: string
  previousVariantId?: string | null
  reducedMotion?: boolean
}): WinAnimationVariant | null {
  const { winType, themeId, previousVariantId, reducedMotion } = params
  if (winType === 'none') return null

  const knownThemes = ['vegas', 'cyber', 'treasure'] as const
  const isKnownTheme = knownThemes.includes(themeId as (typeof knownThemes)[number])
  const themed = isKnownTheme
    ? THEME_VARIANTS.filter((v) => v.winType === winType && v.themeId === themeId)
    : []
  const common = COMMON_VARIANTS.filter((v) => v.winType === winType)

  let pool = [...themed, ...common]

  if (reducedMotion) {
    const light = pool.filter((v) => !isHeavyForRm(v) && v.intensity !== 'legendary')
    if (light.length > 0) pool = light
    else {
      const noShake = pool.filter((v) => !v.effects.includes('screenShake'))
      if (noShake.length > 0) pool = noShake
    }
  }

  const avoidDup = pool.filter((v) => v.id !== previousVariantId)
  if (avoidDup.length > 0) pool = avoidDup

  if (pool.length === 0) {
    const fallback = COMMON_VARIANTS.find((v) => v.winType === winType)
    return fallback ?? null
  }

  return weightedPick(pool)
}

export function variantSuggestsSymbolMotion(variant: WinAnimationVariant | null): boolean {
  return Boolean(variant?.effects.includes('symbolPulse'))
}

export type SymbolWinMotion = 'pulse' | 'bounce' | 'glow' | 'sparkle'

export function pickSymbolWinMotion(): SymbolWinMotion {
  const opts: SymbolWinMotion[] = ['pulse', 'bounce', 'glow', 'sparkle']
  return opts[Math.floor(Math.random() * opts.length)]!
}
