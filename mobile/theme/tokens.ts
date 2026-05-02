/** Semantic colors mirrored from web `globals.css` (oklch → hex approximations). */
export type CasinoThemeId = 'vegas' | 'cyber' | 'treasure'

/** RN supports #RRGGBBAA on modern iOS/Android; fallback returns the original string. */
export function hexWithAlpha(hex: string, alphaByte = '99'): string {
  return hex.startsWith('#') && hex.length === 7 ? `${hex}${alphaByte}` : hex
}

export interface CasinoPalette {
  background: string
  foreground: string
  card: string
  cardForeground: string
  primary: string
  primaryForeground: string
  muted: string
  mutedForeground: string
  border: string
  cabinetBg: string
  cabinetBorder: string
  reelBg: string
  reelBorder: string
  win: string
  jackpot: string
  destructive: string
  spinButtonTop: string
  spinButtonBottom: string
}

export const CASINO_PALETTES: Record<
  CasinoThemeId,
  { dark: CasinoPalette; light: CasinoPalette }
> = {
  vegas: {
    dark: {
      background: '#141110',
      foreground: '#f5f0e6',
      card: '#1c1614',
      cardForeground: '#f5f0e6',
      primary: '#d4af37',
      primaryForeground: '#141110',
      muted: '#2a221f',
      mutedForeground: '#a89888',
      border: '#6b5344',
      cabinetBg: '#0f0c0b',
      cabinetBorder: '#b8860b',
      reelBg: '#0a0908',
      reelBorder: '#9a7b48',
      win: '#34d399',
      jackpot: '#ef4444',
      destructive: '#c94c4c',
      spinButtonTop: '#b03030',
      spinButtonBottom: '#8b2323',
    },
    light: {
      background: '#faf7f2',
      foreground: '#1c1917',
      card: '#ffffff',
      cardForeground: '#1c1917',
      primary: '#a67c00',
      primaryForeground: '#faf7f2',
      muted: '#ebe6df',
      mutedForeground: '#57534e',
      border: '#d6cfc4',
      cabinetBg: '#f0ebe4',
      cabinetBorder: '#a67c00',
      reelBg: '#ffffff',
      reelBorder: '#a67c00',
      win: '#059669',
      jackpot: '#dc2626',
      destructive: '#b91c1c',
      spinButtonTop: '#c45c5c',
      spinButtonBottom: '#a84444',
    },
  },
  cyber: {
    dark: {
      background: '#0c0d18',
      foreground: '#e8f4ff',
      card: '#12142a',
      cardForeground: '#e8f4ff',
      primary: '#22d3ee',
      primaryForeground: '#0c0d18',
      muted: '#1e2140',
      mutedForeground: '#8ba4c7',
      border: '#3d5a80',
      cabinetBg: '#080914',
      cabinetBorder: '#22d3ee',
      reelBg: '#060712',
      reelBorder: '#22d3ee',
      win: '#4ade80',
      jackpot: '#e879f9',
      destructive: '#f472b6',
      spinButtonTop: '#c026d3',
      spinButtonBottom: '#86198f',
    },
    light: {
      background: '#f4f7fb',
      foreground: '#1e1b2e',
      card: '#ffffff',
      cardForeground: '#1e1b2e',
      primary: '#0891b2',
      primaryForeground: '#ffffff',
      muted: '#e2e8f0',
      mutedForeground: '#475569',
      border: '#cbd5e1',
      cabinetBg: '#eef2f7',
      cabinetBorder: '#0891b2',
      reelBg: '#ffffff',
      reelBorder: '#0891b2',
      win: '#16a34a',
      jackpot: '#c026d3',
      destructive: '#db2777',
      spinButtonTop: '#a21caf',
      spinButtonBottom: '#86198f',
    },
  },
  treasure: {
    dark: {
      background: '#0f1719',
      foreground: '#f0ead8',
      card: '#152023',
      cardForeground: '#f0ead8',
      primary: '#2dd4bf',
      primaryForeground: '#0f1719',
      muted: '#1e2e32',
      mutedForeground: '#9ca89e',
      border: '#3d5c5c',
      cabinetBg: '#0c1214',
      cabinetBorder: '#d4a84b',
      reelBg: '#0a1012',
      reelBorder: '#c9983a',
      win: '#4ade80',
      jackpot: '#fbbf24',
      destructive: '#c94c4c',
      spinButtonTop: '#14b8a6',
      spinButtonBottom: '#0d9488',
    },
    light: {
      background: '#f4faf9',
      foreground: '#134e4a',
      card: '#ffffff',
      cardForeground: '#134e4a',
      primary: '#0f766e',
      primaryForeground: '#ffffff',
      muted: '#e0f2f1',
      mutedForeground: '#475569',
      border: '#99f6e4',
      cabinetBg: '#ecfdfb',
      cabinetBorder: '#0f766e',
      reelBg: '#ffffff',
      reelBorder: '#0f766e',
      win: '#059669',
      jackpot: '#d97706',
      destructive: '#b91c1c',
      spinButtonTop: '#14b8a6',
      spinButtonBottom: '#0d9488',
    },
  },
}

export function getCasinoPalette(
  theme: CasinoThemeId,
  mode: 'dark' | 'light'
): CasinoPalette {
  return CASINO_PALETTES[theme][mode]
}
