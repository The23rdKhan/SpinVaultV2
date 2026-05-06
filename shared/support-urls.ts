// TODO(launch): Replace all *_REQUIRED values with real production URLs before App Store / Play Store submission.
// These must never be left as-is in a shipping build.

/** TODO(launch): Replace with the real SpinVault Help Center URL. */
const SPINVAULT_HELP_CENTER_URL_REQUIRED = 'https://TODO_REPLACE_SPINVAULT_HELP_CENTER_URL'

/** TODO(launch): Replace with the real SpinVault support email address. */
const SPINVAULT_SUPPORT_EMAIL_REQUIRED = 'support@TODO_REPLACE_SPINVAULT_DOMAIN'

/**
 * TODO(legal/launch): Replace with the real Privacy Policy URL.
 * Required for App Store and Google Play submission.
 */
export const SPINVAULT_PRIVACY_URL_REQUIRED = 'https://TODO_REPLACE_SPINVAULT_PRIVACY_POLICY_URL'

/**
 * TODO(legal/launch): Replace with the real Terms of Service URL.
 * Required for App Store and Google Play submission.
 */
export const SPINVAULT_TERMS_URL_REQUIRED = 'https://TODO_REPLACE_SPINVAULT_TERMS_URL'

/** Shared help/contact targets for web + mobile profile Support section. */
export const SUPPORT_URLS = {
  helpCenter: SPINVAULT_HELP_CENTER_URL_REQUIRED,
  contactMail: `mailto:${SPINVAULT_SUPPORT_EMAIL_REQUIRED}?subject=SpinVault%20Support`,
  privacyPolicy: SPINVAULT_PRIVACY_URL_REQUIRED,
  terms: SPINVAULT_TERMS_URL_REQUIRED,
} as const
