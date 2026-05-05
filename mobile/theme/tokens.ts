/**
 * SpinVault design tokens: master shell (light/dark) + machine skins (vegas / cyber / treasure).
 * Shell = collectible premium UI everywhere; skins affect Play / cabinet / reels / spin / celebrations only.
 */

export type CasinoThemeId = 'vegas' | 'cyber' | 'treasure'

/** RN supports #RRGGBBAA on modern iOS/Android; fallback returns the original string. */
export function hexWithAlpha(hex: string, alphaByte = '99'): string {
  return hex.startsWith('#') && hex.length === 7 ? `${hex}${alphaByte}` : hex
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

/** Keys machine skins may override (Play / celebration only — never shell text, tabs, or auth). */
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

/** SpinVault master shell — bright premium light default (never overridden by machine skins). */
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
  primary: '#0F9F8C',
  primaryForeground: '#FFFFFF',
  primarySoft: '#DDF8F3',
  secondary: '#F4F0E8',
  secondaryForeground: '#1F2933',
  accent: '#D4AF37',
  accentSoft: '#FFF1C2',
  gold: '#D4AF37',
  jackpot: '#F6B800',
  win: '#16A34A',
  bonus: '#8B5CF6',
  freeSpin: '#06B6D4',
  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',
  locked: '#9CA3AF',
  unlocked: '#16A34A',
  shadow: 'rgba(31, 41, 51, 0.14)',
  overlay: 'rgba(31, 41, 51, 0.48)',
  tabBar: '#FFFFFF',
  popover: '#FFFFFF',
  popoverForeground: '#1F2933',
  input: '#FFFDF7',
  buttonPrimary: '#0F9F8C',
  buttonSecondary: '#FFFFFF',
  spinButtonStart: '#0F9F8C',
  spinButtonEnd: '#0A7D70',
  spinButtonLabel: '#FFFFFF',
  cabinetBg: '#F5F0E6',
  cabinetBorder: '#D4AF37',
  reelBg: '#FFFFFF',
  reelBorder: '#E7D8B8',
  machineAccent: '#0F9F8C',
}

/** SpinVault master shell — cinematic dark alternate. */
const MASTER_SEMANTIC_DARK: SemanticPalette = {
  background: '#071311',
  surface: '#0D1B18',
  surfaceElevated: '#132822',
  card: '#10201D',
  cardSoft: '#17342D',
  textPrimary: '#F8FAFC',
  textSecondary: '#B8C7C2',
  textMuted: '#78908A',
  border: '#27443C',
  primary: '#14B8A6',
  primaryForeground: '#071311',
  primarySoft: '#123F38',
  secondary: '#1A2E2A',
  secondaryForeground: '#F8FAFC',
  accent: '#D4AF37',
  accentSoft: '#3B2F12',
  gold: '#D4AF37',
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
  tabBar: '#0D1B18',
  popover: '#132822',
  popoverForeground: '#F8FAFC',
  input: '#132822',
  buttonPrimary: '#14B8A6',
  buttonSecondary: '#132822',
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
      machineAccent: '#A67C00',
      cabinetBg: '#f0ebe4',
      cabinetBorder: '#a67c00',
      reelBg: '#ffffff',
      reelBorder: '#a67c00',
      spinButtonStart: '#c45c5c',
      spinButtonEnd: '#a84444',
      jackpot: '#dc2626',
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
      machineAccent: '#0891b2',
      cabinetBg: '#eef2f7',
      cabinetBorder: '#0891b2',
      reelBg: '#ffffff',
      reelBorder: '#0891b2',
      spinButtonStart: '#a21caf',
      spinButtonEnd: '#86198f',
      jackpot: '#c026d3',
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
      machineAccent: '#0f766e',
      cabinetBg: '#ecfdfb',
      cabinetBorder: '#0f766e',
      reelBg: '#ffffff',
      reelBorder: '#0f766e',
      spinButtonStart: '#14b8a6',
      spinButtonEnd: '#0d9488',
      jackpot: '#d97706',
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
