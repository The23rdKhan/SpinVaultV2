/**
 * Vault / win-tier strings shared by WinDisplay, InfoModal, Marquee, spin history, profile, and a11y.
 * Single source of truth for product-facing labels and the vault coin mark.
 *
 * ## Engine `win_type` vs UI copy (naming contract)
 * - `normal`   → UI: “Win”
 * - `bigWin`   → UI: “Big Win”
 * - `megaWin`  → UI: “Jackpot” (10×–24.9× **total return vs line bet**)
 * - `jackpot`  → UI: “Mega Jackpot” (25×+)
 * - **Jackpot Mode** (center-row / flat prize) is **not** a `win_type` — use `JACKPOT_MODE_*` strings.
 *
 * Always use `getWinTypeDisplayTitle` / `getWinTypeBadgeUpper` for tier copy so labels stay consistent.
 */
import type { WinType } from '@shared/slot/evaluate-spin'

/** V + U+023B — compact “vault coins” mark in the under-1× win overlay. */
export const VAULT_COIN_MARK = 'V\u023B'

/** Center-row feature (flat prize) — not the 10× “Jackpot” win band. */
export const JACKPOT_MODE_LABEL = 'Jackpot Mode'

/** Marquee card / ticker uppercase line (center-row prize branding). */
export const JACKPOT_MODE_MARQUEE_TITLE = 'JACKPOT MODE'

/** Ticker while `isJackpotMode` is true (after center-row hit, until the next spin resolves). */
export const MARQUEE_JACKPOT_MODE_ACTIVE =
  '🔥 JACKPOT MODE — Center row cleared! Vault refilling — keep spinning for climbing prizes.'

/** One-shot burst over the reels when the center-row jackpot lands (title line). */
export const JACKPOT_MODE_BURST_TITLE = 'JACKPOT MODE'

/** Subline under the burst title. */
export const JACKPOT_MODE_BURST_SUB = 'Center row vault unlocked'

/** Ticker while reels are resolving (synced to `isSpinning`). */
export const MARQUEE_SPIN_PHASE_PAID = '🎰 Reels running — good luck!'
export const MARQUEE_SPIN_PHASE_FREE = '🎰 Free spin in play — hang tight!'

/** Brief post-spin tease: exactly two scatters, bonus not triggered. */
export const MARQUEE_SCATTER_SO_CLOSE = '✦ So close — 2 scatters. One more for 10 free spins!'

/** Win celebration titles (match engine `win_type`: normal → bigWin → megaWin → jackpot). */
export const WIN_TIER_DISPLAY_TITLE = {
  win: 'Win',
  bigWin: 'Big Win',
  /** 10×–24.9× return vs bet (`megaWin`). */
  jackpot: 'Jackpot',
  /** 25×+ return vs bet (`jackpot`). */
  megaJackpot: 'Mega Jackpot',
} as const

const ENGINE_WIN_TYPES = new Set<WinType>(['none', 'normal', 'bigWin', 'megaWin', 'jackpot'])

/** True when `value` is a valid evaluator `WinType` string (e.g. from DB or ledger parsing). */
export function isEngineWinType(value: string): value is WinType {
  return ENGINE_WIN_TYPES.has(value as WinType)
}

/**
 * Human-readable title for a spin’s **`win_type`** (return-vs-bet band), not Jackpot Mode.
 * Use {@link getWinTypeDisplayTitleOrRaw} for untrusted strings.
 */
export function getWinTypeDisplayTitle(winType: WinType): string {
  switch (winType) {
    case 'none':
      return 'No win'
    case 'normal':
      return WIN_TIER_DISPLAY_TITLE.win
    case 'bigWin':
      return WIN_TIER_DISPLAY_TITLE.bigWin
    case 'megaWin':
      return WIN_TIER_DISPLAY_TITLE.jackpot
    case 'jackpot':
      return WIN_TIER_DISPLAY_TITLE.megaJackpot
    default: {
      const _exhaustive: never = winType
      return _exhaustive
    }
  }
}

/** Title for API/DB values that may be unknown — falls back to the raw string. */
export function getWinTypeDisplayTitleOrRaw(winTypeRaw: string): string {
  return isEngineWinType(winTypeRaw) ? getWinTypeDisplayTitle(winTypeRaw) : winTypeRaw
}

/**
 * Uppercase chip text for compact UI (spin history). Empty for `none`.
 */
export function getWinTypeBadgeUpper(winType: WinType): string {
  switch (winType) {
    case 'none':
      return ''
    case 'normal':
      return 'WIN'
    case 'bigWin':
      return 'BIG WIN'
    case 'megaWin':
      return 'JACKPOT'
    case 'jackpot':
      return 'MEGA JACKPOT'
    default: {
      const _exhaustive: never = winType
      return _exhaustive
    }
  }
}

export type WinTierPaytableColorKey = 'textPrimary' | 'primary' | 'win' | 'jackpot'

/** Paytable “Win tiers” rows — labels from {@link getWinTypeDisplayTitle}; ranges match `evaluate-spin` bands. */
export function getWinTierPaytableRows(): readonly {
  winType: Exclude<WinType, 'none'>
  label: string
  range: string
  colorKey: WinTierPaytableColorKey
}[] {
  return [
    { winType: 'normal', label: getWinTypeDisplayTitle('normal'), range: '0.5× – 4.9× bet', colorKey: 'textPrimary' },
    { winType: 'bigWin', label: getWinTypeDisplayTitle('bigWin'), range: '5× – 9.9× bet', colorKey: 'primary' },
    {
      winType: 'megaWin',
      label: getWinTypeDisplayTitle('megaWin'),
      range: '10× – 24.9× bet',
      colorKey: 'win',
    },
    {
      winType: 'jackpot',
      label: getWinTypeDisplayTitle('jackpot'),
      range: '25×+ total return vs bet',
      colorKey: 'jackpot',
    },
  ] as const
}

/** Ticker: match sevens hook (uses marquee title, not mixed-case feature label). */
export const MARQUEE_MATCH_SEVENS_LINE = `Match 5 SEVENS for ${JACKPOT_MODE_MARQUEE_TITLE}`

/** Ticker when a center-row hit just happened (single static line). */
export const MARQUEE_JACKPOT_HIT_STATIC = `🏆 JACKPOT MODE HIT! Vault prize resets…  ·  ${MARQUEE_MATCH_SEVENS_LINE}  ·  3 SCATTERS = 10 FREE SPINS`

/** Ticker when not in post-hit window. */
export const MARQUEE_DEFAULT_STATIC = `${MARQUEE_MATCH_SEVENS_LINE}  ·  3 SCATTERS = 10 FREE SPINS  ·  WILD substitutes any symbol`

/** First rotating segment after a hit. */
export const MARQUEE_JACKPOT_HIT_SEGMENT_FRESH = '🏆 JACKPOT MODE HIT! Fresh prize starting…'

/** VoiceOver / TalkBack for the under-1× compact overlay. */
export function formatSubtleWinAccessibilityLabel(coins: number, returnVsBet: number): string {
  const mult = Number(returnVsBet.toFixed(4))
  return `Under 1 times your line bet. ${mult} times return vs line bet. ${VAULT_COIN_MARK} ${coins.toLocaleString()} Vault Coins.`
}
