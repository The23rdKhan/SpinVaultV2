/**
 * SpinVault design tokens: master shell (light/dark) + machine skins (vegas / cyber / treasure).
 * Shell = collectible premium UI everywhere; skins affect Play / cabinet / reels / spin / celebrations only.
 */

export type CasinoThemeId = 'vegas' | 'cyber' | 'treasure'

/** RN supports #RRGGBBAA on modern iOS/Android; fallback returns the original string. */
export function hexWithAlpha(hex: string | undefined, alphaByte = '99'): string {
  if (typeof hex !== 'string' || !hex.startsWith('#') || hex.length !== 7) {
    return typeof hex === 'string' ? hex : '#64748b'
  }
  return `${hex}${alphaByte}`
}

/** Tier colors for cosmetics / loot (mode-specific for contrast). */
export interface RarityPalette {
  common: string
  rare: string
  epic: string
  legendary: string
  mythic: string
  limited: string
}

export const RARITY_PALETTE_LIGHT: RarityPalette = {
  common: '#64748B',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
  mythic: '#EC4899',
  limited: '#14B8A6',
}

export const RARITY_PALETTE_DARK: RarityPalette = {
  common: '#94A3B8',
  rare: '#60A5FA',
  epic: '#A78BFA',
  legendary: '#FBBF24',
  mythic: '#F472B6',
  limited: '#2DD4BF',
}

export function getRarityPalette(mode: 'dark' | 'light'): RarityPalette {
  return mode === 'dark' ? RARITY_PALETTE_DARK : RARITY_PALETTE_LIGHT
}

/**
 * MACHINE_OVERRIDE_KEYS — the complete, exhaustive list of tokens that a
 * machine skin is permitted to change. Every other SemanticPalette key belongs
 * to the Global Brand Shell and must not be altered by a skin.
 *
 * Intended consumers of skin-overridable tokens:
 *   ✅ SlotMachine.tsx     — cabinetBg, cabinetBorder, machineAccent
 *   ✅ ReelGrid.tsx        — reelBg, reelBorder, machineAccent, win (reel win highlight)
 *   ✅ ControlDeck.tsx     — cabinetBg, cabinetBorder, spinButtonStart, spinButtonEnd
 *   ✅ WinDisplay.tsx      — jackpot, win (win celebration overlay)
 *   ✅ Marquee.tsx         — jackpot (jackpot ticker glow)
 *   ✅ RecentSpinsRow.tsx  — jackpot, win (spin history chips on Play screen)
 *   ✅ InfoModal.tsx       — jackpot (payout table — machine context)
 *
 * ⚠️  DO NOT use t.jackpot or t.machineAccent in:
 *   ✗ Profile / account screens
 *   ✗ Daily rewards / missions / wheel (use t.gold for premium reward indicators)
 *   ✗ Onboarding / auth screens
 *   ✗ Shop coin pack listings
 *   ✗ Legal / support screens
 *   Reason: Vegas skin maps jackpot → red (#ef4444), which reads as error/penalty
 *   outside the machine UI. Cyber maps it to pink/magenta.
 *
 * t.win is used more broadly (success/positive indicator across the app).
 * Its per-theme variants are all green shades — acceptable drift for a
 * "success" semantic color. This is an intentional design-system tradeoff.
 */
const MACHINE_OVERRIDE_KEYS = [
  'cabinetBg',
  'cabinetBorder',
  'reelBg',
  'reelBorder',
  'spinButtonStart',
  'spinButtonEnd',
  'jackpot',
  'win',
  'machineAccent',
] as const satisfies readonly (keyof SemanticPalette)[]

/**
 * Canonical semantic palette (shell + machine-mergeable play fields).
 */
export interface SemanticPalette {
  background: string
  surface: string
  surfaceElevated: string
  card: string
  cardSoft: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  border: string
  primary: string
  primaryForeground: string
  primarySoft: string
  secondary: string
  secondaryForeground: string
  accent: string
  accentSoft: string
  gold: string
  jackpot: string
  win: string
  bonus: string
  freeSpin: string
  destructive: string
  destructiveForeground: string
  locked: string
  unlocked: string
  shadow: string
  overlay: string
  tabBar: string
  popover: string
  popoverForeground: string
  input: string
  buttonPrimary: string
  buttonSecondary: string
  spinButtonStart: string
  spinButtonEnd: string
  /** Label color on spin gradient fills (machine skins); high contrast on saturated ramps. */
  spinButtonLabel: string
  cabinetBg: string
  cabinetBorder: string
  reelBg: string
  reelBorder: string
  /** In-play accent (neon / gold / teal) — overridden per machine skin. */
  machineAccent: string
}

export type CasinoPalette = SemanticPalette & LegacyAliases

/** Backwards-compatible names used across the codebase. */
export type LegacyAliases = {
  foreground: string
  cardForeground: string
  muted: string
  mutedForeground: string
  spinButtonTop: string
  spinButtonBottom: string
  inputBackground: string
}

/** SpinVault master shell — bright premium light (vault gold / gem accents on cream). */
const MASTER_SEMANTIC_LIGHT: SemanticPalette = {
  background: '#FFF8EA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFDF7',
  card: '#FFFFFF',
  cardSoft: '#FFF4D6',
  textPrimary: '#1F2933',
  textSecondary: '#52616B',
  textMuted: '#8A94A6',
  border: '#E7D8B8',
  primary: '#20D6C7',
  primaryForeground: '#1F2933',
  primarySoft: '#DDF8F3',
  secondary: '#F4F0E8',
  secondaryForeground: '#1F2933',
  accent: '#FFD76A',
  accentSoft: '#FFF1C2',
  gold: '#C9972B',
  jackpot: '#DC2626',
  win: '#16A34A',
  bonus: '#A855F7',
  freeSpin: '#20D6C7',
  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',
  locked: '#9CA3AF',
  unlocked: '#16A34A',
  shadow: 'rgba(31, 41, 51, 0.14)',
  overlay: 'rgba(31, 41, 51, 0.48)',
  /** Matches light tab gradient bottom (parchment) — not pure white. */
  tabBar: '#EFE1C4',
  popover: '#FFFFFF',
  popoverForeground: '#1F2933',
  input: '#FFFDF7',
  buttonPrimary: '#20D6C7',
  buttonSecondary: '#FFFFFF',
  spinButtonStart: '#C9972B',
  spinButtonEnd: '#A67C00',
  spinButtonLabel: '#FFFFFF',
  cabinetBg: '#F7EED8',
  cabinetBorder: '#C9972B',
  reelBg: '#FFF8EA',
  reelBorder: '#E7D8B8',
  machineAccent: '#C9972B',
}

/** SpinVault master shell — cinematic dark alternate (vault navy; complements reel symbols). */
const MASTER_SEMANTIC_DARK: SemanticPalette = {
  background: '#07111E',
  surface: '#0C1622',
  surfaceElevated: '#111C28',
  card: '#0E1924',
  cardSoft: '#152433',
  textPrimary: '#FFF4D6',
  textSecondary: '#C9D4CE',
  textMuted: '#7A9089',
  border: '#2A3D4A',
  primary: '#14B8A6',
  primaryForeground: '#03070D',
  primarySoft: '#123F38',
  secondary: '#1A2E2A',
  secondaryForeground: '#F8FAFC',
  accent: '#FFD76A',
  accentSoft: '#3B2F12',
  gold: '#FFD76A',
  jackpot: '#FFD700',
  win: '#22C55E',
  bonus: '#A855F7',
  freeSpin: '#22D3EE',
  destructive: '#F87171',
  destructiveForeground: '#101010',
  locked: '#64748B',
  unlocked: '#22C55E',
  shadow: 'rgba(0, 0, 0, 0.45)',
  overlay: 'rgba(7, 19, 17, 0.62)',
  tabBar: '#03070D',
  popover: '#111C28',
  popoverForeground: '#FFF4D6',
  input: '#111C28',
  buttonPrimary: '#14B8A6',
  buttonSecondary: '#111C28',
  spinButtonStart: '#14B8A6',
  spinButtonEnd: '#0F766E',
  spinButtonLabel: '#FFFFFF',
  cabinetBg: '#0C1513',
  cabinetBorder: '#27443C',
  reelBg: '#071311',
  reelBorder: '#27443C',
  machineAccent: '#14B8A6',
}

type MachineSkin = Partial<Pick<SemanticPalette, (typeof MACHINE_OVERRIDE_KEYS)[number]>>

/**
 * Machine skins: cabinet / reels / spin / celebration hues + machineAccent only.
 */
const MACHINE_SKINS: Record<CasinoThemeId, { dark: MachineSkin; light: MachineSkin }> = {
  vegas: {
    dark: {
      machineAccent: '#D4AF37',
      cabinetBg: '#0f0c0b',
      cabinetBorder: '#b8860b',
      reelBg: '#0a0908',
      reelBorder: '#9a7b48',
      spinButtonStart: '#b03030',
      spinButtonEnd: '#8b2323',
      jackpot: '#ef4444',
      win: '#34d399',
    },
    light: {
      machineAccent: '#C9972B',
      cabinetBg: '#F7EED8',
      cabinetBorder: '#C9972B',
      reelBg: '#FFF8EA',
      reelBorder: '#E7D8B8',
      spinButtonStart: '#DC2626',
      spinButtonEnd: '#B91C1C',
      jackpot: '#DC2626',
      win: '#059669',
    },
  },
  cyber: {
    dark: {
      machineAccent: '#22d3ee',
      cabinetBg: '#080914',
      cabinetBorder: '#22d3ee',
      reelBg: '#060712',
      reelBorder: '#22d3ee',
      spinButtonStart: '#c026d3',
      spinButtonEnd: '#86198f',
      jackpot: '#e879f9',
      win: '#4ade80',
    },
    light: {
      machineAccent: '#4DBBFF',
      cabinetBg: '#F0F7FF',
      cabinetBorder: '#4DBBFF',
      reelBg: '#FFF8EA',
      reelBorder: '#93C5FD',
      spinButtonStart: '#A855F7',
      spinButtonEnd: '#7C3AED',
      jackpot: '#A855F7',
      win: '#16a34a',
    },
  },
  treasure: {
    dark: {
      machineAccent: '#2dd4bf',
      cabinetBg: '#0c1214',
      cabinetBorder: '#d4a84b',
      reelBg: '#0a1012',
      reelBorder: '#c9983a',
      spinButtonStart: '#14b8a6',
      spinButtonEnd: '#0d9488',
      jackpot: '#fbbf24',
      win: '#4ade80',
    },
    light: {
      machineAccent: '#C9972B',
      cabinetBg: '#FFF8EA',
      cabinetBorder: '#C9972B',
      reelBg: '#FFFDF7',
      reelBorder: '#E7D8B8',
      spinButtonStart: '#20D6C7',
      spinButtonEnd: '#0D9488',
      jackpot: '#FFD76A',
      win: '#059669',
    },
  },
}

function applyMachineSkin(
  shell: SemanticPalette,
  theme: CasinoThemeId,
  mode: 'dark' | 'light'
): SemanticPalette {
  const skin = MACHINE_SKINS[theme][mode]
  const next = { ...shell }
  for (const key of MACHINE_OVERRIDE_KEYS) {
    const v = skin[key]
    if (v !== undefined) {
      ;(next as Record<string, string>)[key] = v
    }
  }
  return next
}

function mergeSemantic(mode: 'dark' | 'light', theme: CasinoThemeId): SemanticPalette {
  const shell = mode === 'light' ? MASTER_SEMANTIC_LIGHT : MASTER_SEMANTIC_DARK
  return applyMachineSkin(shell, theme, mode)
}

function finalizePalette(semantic: SemanticPalette): CasinoPalette {
  const legacy: LegacyAliases = {
    foreground: semantic.textPrimary,
    cardForeground: semantic.textPrimary,
    muted: semantic.cardSoft,
    mutedForeground: semantic.textMuted,
    spinButtonTop: semantic.spinButtonStart,
    spinButtonBottom: semantic.spinButtonEnd,
    inputBackground: semantic.input,
  }
  return { ...semantic, ...legacy }
}

function buildPalette(theme: CasinoThemeId, mode: 'dark' | 'light'): CasinoPalette {
  return finalizePalette(mergeSemantic(mode, theme))
}

export const CASINO_PALETTES: Record<
  CasinoThemeId,
  { dark: CasinoPalette; light: CasinoPalette }
> = {
  vegas: {
    dark: buildPalette('vegas', 'dark'),
    light: buildPalette('vegas', 'light'),
  },
  cyber: {
    dark: buildPalette('cyber', 'dark'),
    light: buildPalette('cyber', 'light'),
  },
  treasure: {
    dark: buildPalette('treasure', 'dark'),
    light: buildPalette('treasure', 'light'),
  },
}

export function getCasinoPalette(theme: CasinoThemeId, mode: 'dark' | 'light'): CasinoPalette {
  return CASINO_PALETTES[theme][mode]
}

/** Root chrome / loading: SpinVault shell only (ignore machine skin). */
export function getSpinVaultShellBackground(mode: 'dark' | 'light'): string {
  return mode === 'light' ? MASTER_SEMANTIC_LIGHT.background : MASTER_SEMANTIC_DARK.background
}

/** Primary brand teal for indicators tied to shell (e.g. gate loading). */
export function getSpinVaultShellPrimary(mode: 'dark' | 'light'): string {
  return mode === 'light' ? MASTER_SEMANTIC_LIGHT.primary : MASTER_SEMANTIC_DARK.primary
}

// ---------------------------------------------------------------------------
// Brand color reference — SpinVault identity
// ---------------------------------------------------------------------------
//
// Shell palette (both modes):
//   Gold accent        #D4AF37  → t.gold / t.accent
//   Jackpot yellow     #F6B800 (light) / #FFD700 (dark) → t.jackpot
//
// Shell palette (light mode):
//   Warm cream bg      #FFF8EA  → t.background
//   Teal primary       #0F9F8C  → t.primary
//   Text primary       #1F2933  → t.textPrimary
//
// Shell palette (dark mode):
//   Vault navy bg      #07111E  → t.background (tab gradient base)
//   Teal primary       #14B8A6  → t.primary
//   Text primary       #F8FAFC  → t.textPrimary
//
// Splash / launch screen only (NOT a runtime theme token):
//   Splash background  #140707  — hardcoded in app.config.ts splash.backgroundColor
//                                 and android.adaptiveIcon.backgroundColor
//   This is a one-time cinematic red-black shown only during app launch.
//   It does not map to any SemanticPalette token.
//
// Usage rules:
//   1. Always use semantic token names (t.gold, t.primary, t.accent) in components.
//   2. Never hardcode theme hex values in components except the splash/adaptive-icon config.
//   3. Machine skins may override only the keys listed in MACHINE_OVERRIDE_KEYS.
//   4. Shell tokens (textPrimary, background, card, etc.) are never overridden by skins.
// ---------------------------------------------------------------------------
