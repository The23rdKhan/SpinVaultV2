/**
 * SpinVault brand identity constants — single source of truth.
 *
 * Usage guidelines:
 *  - APP_NAME          — primary UI label: navigation headers, loading screens, auth screens.
 *  - APP_SUBTITLE      — secondary label displayed beneath APP_NAME on the Play tab header and onboarding hero.
 *  - APP_TAGLINE       — primary marketing line: splash, onboarding kicker, promotional copy.
 *  - APP_TAGLINE_ALT   — alternative tagline for secondary contexts (shop, social).
 *  - APP_COMPLIANCE_LINE — short no-cash-value disclosure; use wherever IAP or coins are mentioned.
 *  - APP_FULL_NAME     — legal/formal usage only (legal docs, App Store description, privacy policy).
 *                        Do not use APP_FULL_NAME as the in-app display name.
 *
 * Trademark notes:
 *  - Do not append ™ or ® to any constant without explicit approval from legal counsel.
 *  - APP_FULL_NAME is a brand name, not a registered trademark unless confirmed otherwise.
 *  - See docs/legal-launch-checklist.md § Trademark / Brand Name Review for required actions.
 *
 * TODO(legal/launch): Confirm APP_FULL_NAME with legal counsel before App Store submission.
 * TODO(launch): Confirm final tagline copy with marketing before App Store submission.
 */

/** Primary app name. Used in navigation headers, loading screens, auth screens, and all in-app contexts. */
export const APP_NAME = 'SpinVault' as const

/**
 * Full formal name — legal documents, App Store listing description, and privacy policy only.
 * Do not use as the primary in-app display name.
 */
export const APP_FULL_NAME = 'SpinVault Lucky Slots' as const

/** Subtitle displayed beneath the app name on the Play tab header and the onboarding hero. */
export const APP_SUBTITLE = 'Lucky Slots' as const

/** Primary brand tagline. */
export const APP_TAGLINE = 'Spin. Win. Collect.' as const

/** Alternative tagline for secondary contexts such as the shop or social screens. */
export const APP_TAGLINE_ALT = 'Virtual coins. Real excitement.' as const

/**
 * Short compliance disclosure — no cash value.
 * Required adjacent to any coin balance, IAP, or reward copy.
 * Do not remove or shorten without legal review.
 */
export const APP_COMPLIANCE_LINE = 'Virtual coins only. No cash value.' as const

/**
 * Extended compliance disclosure for onboarding, age gate, and legal contexts.
 * Do not alter wording without legal review.
 */
export const APP_COMPLIANCE_FULL =
  'Virtual coins and rewards are for entertainment only. No cash value. ' +
  'SpinVault does not offer real-money gambling or cash prizes.' as const
