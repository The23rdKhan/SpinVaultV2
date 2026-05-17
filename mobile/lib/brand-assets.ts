/**
 * SpinVault brand raster assets (PNG). `vault-coin` is the in-app virtual currency
 * mark only — not a real-money or cash symbol.
 */
export const VAULT_COIN_PNG = require('@/assets/icons/vault-coin.png') as number

/** Horizontal SpinVault wordmark for headers and marketing surfaces. */
export const SPINVAULT_LOGO_HORIZONTAL_PNG = require('@/assets/logo-horizontal.png') as number

/** Intrinsic height ÷ width of trimmed `logo-horizontal.png` (keep in sync if asset changes). */
export const SPINVAULT_LOGO_HORIZONTAL_ASPECT = 146 / 677

/** VC wheel mark for compact headers (narrow phones). */
export const SPINVAULT_LOGO_MARK_PNG = require('@/assets/icons/logo-mark.png') as number

/** Tab header horizontal wordmark — fits 52pt custom header bar. */
export const TAB_HEADER_LOGO_HORIZONTAL = { width: 168, height: 40 } as const

/** Larger cap for Plus / Pro Max / iPad split (~≥420pt). */
export const TAB_HEADER_LOGO_HORIZONTAL_LARGE = { width: 188, height: 44 } as const

/** Tab header compact mark + text layout. */
export const TAB_HEADER_LOGO_MARK = { width: 40, height: 40 } as const

/** Below this width, use mark + text (iPhone SE / legacy small). */
export const TAB_HEADER_COMPACT_MAX_WIDTH = 375

/** Use large wordmark cap at this logical width and above. */
export const TAB_HEADER_LARGE_MIN_WIDTH = 420

/** Approx. space reserved for balance pill + settings + gaps (pt). */
export const TAB_HEADER_RIGHT_RESERVED_WIDTH = 210

/** Extra reserve when Dynamic Type / display zoom is large. */
export const TAB_HEADER_A11Y_FONT_SCALE_THRESHOLD = 1.15
