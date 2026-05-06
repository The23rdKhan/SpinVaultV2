/**
 * ⚠️  DRAFT LEGAL COPY — NOT REVIEWED BY A LAWYER
 *
 * This file contains placeholder text for in-app display only.
 * All content below MUST be reviewed and approved by qualified legal counsel
 * before App Store / Google Play submission.
 *
 * Brand name usage in this file follows the convention:
 *   - Full formal name: "SpinVault Lucky Slots" — used in the opening definition of each document.
 *   - Short name: "SpinVault" — used throughout the body after the initial definition.
 *   - No ™ or ® symbols are used. Do not add them without explicit legal approval.
 *   - See docs/legal-launch-checklist.md § Trademark / Brand Name Review.
 *
 * TODO(legal/launch): Replace every section with lawyer-approved final copy.
 */

import { APP_NAME, APP_FULL_NAME } from './brand'

export type LegalDocType = 'privacy' | 'terms'

export interface LegalSection {
  heading: string
  body: string
}

export interface LegalDocument {
  title: string
  /** ISO date string — update when copy is finalized. */
  effectiveDate: string
  /** Short intro paragraph shown before the sections. */
  intro: string
  sections: LegalSection[]
}

// ---------------------------------------------------------------------------
// Terms of Service
// ---------------------------------------------------------------------------

export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Terms of Service',
  effectiveDate: '2026-01-01', // TODO(legal/launch): Update to the actual effective date.
  intro:
    `Welcome to ${APP_FULL_NAME} ("${APP_NAME}", "we", "our", or "us"). ` +
    `By downloading or using the ${APP_NAME} app you agree to these Terms of Service. ` +
    'Please read them carefully. If you do not agree, do not use the app.',
  sections: [
    {
      heading: 'Entertainment Only — No Real-Money Gambling',
      body:
        'SpinVault is a free-to-play social casino app for entertainment purposes only. ' +
        'All in-game currency ("coins", "spins", "rewards") is virtual and has no cash value. ' +
        'Virtual coins cannot be exchanged for real money, prizes, or anything of monetary value. ' +
        'SpinVault does not offer real-money gambling, lotteries, or cash prizes of any kind. ' +
        'Nothing in this app constitutes a form of gambling regulated by any gaming authority.',
    },
    {
      heading: 'Age Requirement',
      body:
        'You must be at least 18 years of age to use SpinVault. ' +
        'By using the app you confirm you meet this requirement. ' +
        'We do not knowingly collect data from users under 18. ' +
        'If we learn a user is under 18 we will delete their account without notice.',
    },
    {
      heading: 'Account Registration',
      body:
        'You may create an account or continue as a guest. ' +
        'You are responsible for keeping your login credentials confidential. ' +
        'You may not share, sell, or transfer your account to another person. ' +
        'We reserve the right to suspend or delete accounts that violate these Terms.',
    },
    {
      heading: 'In-App Purchases',
      body:
        'SpinVault offers optional in-app purchases of virtual coin packs and cosmetic items. ' +
        'All purchases are processed by Apple App Store or Google Play and are subject to their refund policies. ' +
        'Virtual items purchased have no cash value and are non-refundable except as required by law. ' +
        'By completing a purchase you confirm you are authorized to use the payment method.',
    },
    {
      heading: 'Daily Rewards and Ads',
      body:
        'SpinVault may offer daily login bonuses, free spins, missions, and rewarded video ads. ' +
        'These rewards are provided at our discretion and may be modified or removed at any time. ' +
        'Coin rewards from ads are virtual and have no cash value.',
    },
    {
      heading: 'Responsible Play',
      body:
        'SpinVault is intended to be a fun, casual entertainment experience. ' +
        'If you find yourself spending more time or money than intended, we encourage you to take a break. ' +
        'Responsible-play tools (spending limits, cooldown mode) may be available in Settings. ' +
        'If you need support with problem gambling, please contact a qualified helpline in your region.',
    },
    {
      heading: 'User Content and Profile',
      body:
        'You may choose a username, profile picture, and other cosmetic customizations. ' +
        'You agree not to use usernames or avatars that are offensive, infringing, or impersonating. ' +
        'We reserve the right to remove content that violates community standards.',
    },
    {
      heading: 'Intellectual Property',
      body:
        'All content, graphics, sounds, and software in SpinVault are owned by or licensed to us. ' +
        'You may not reproduce, distribute, or create derivative works without our written permission.',
    },
    {
      heading: 'Disclaimer of Warranties',
      body:
        'SpinVault is provided "as is" and "as available" without warranties of any kind. ' +
        'We do not guarantee uninterrupted service or that the app will be error-free.',
    },
    {
      heading: 'Limitation of Liability',
      body:
        'To the fullest extent permitted by applicable law, SpinVault and its affiliates will not be liable ' +
        'for any indirect, incidental, or consequential damages arising from your use of the app.',
    },
    {
      heading: 'Changes to These Terms',
      body:
        'We may update these Terms at any time. Continued use of the app after changes are posted ' +
        'constitutes acceptance of the new Terms. We will notify users of material changes when required by law.',
    },
    {
      heading: 'Contact',
      body:
        'Questions about these Terms? Contact us at support@TODO_REPLACE_SPINVAULT_DOMAIN. ' + // TODO(launch): Replace with real email.
        'We aim to respond within 5 business days.',
    },
  ],
}

// ---------------------------------------------------------------------------
// Privacy Policy
// ---------------------------------------------------------------------------

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate: '2026-01-01', // TODO(legal/launch): Update to the actual effective date.
  intro:
    `This Privacy Policy explains how ${APP_FULL_NAME} ("${APP_NAME}", "we", "our", or "us") ` +
    'collects, uses, and protects information about you when you use our app. ' +
    `By using ${APP_NAME} you agree to this policy.`,
  sections: [
    {
      heading: 'Information We Collect',
      body:
        'Account information: email address, username, and authentication credentials when you register.\n' +
        'Gameplay data: coins balance, spin history, achievements, and leaderboard scores.\n' +
        'Device information: device model, OS version, and app version for debugging and analytics.\n' +
        'Usage data: features used, session duration, and in-app events (anonymized).\n' +
        'Purchase records: transaction identifiers from Apple or Google for purchase validation — we do not store full payment card details.',
    },
    {
      heading: 'How We Use Your Information',
      body:
        'To operate and improve the SpinVault app and its features.\n' +
        'To sync your progress across devices when signed in.\n' +
        'To process and validate in-app purchases.\n' +
        'To send optional push notifications about daily bonuses and events (you can opt out in Settings).\n' +
        'To analyze usage patterns and fix bugs.\n' +
        'To comply with legal obligations.',
    },
    {
      heading: 'Third-Party Services',
      body:
        'SpinVault uses the following third-party services that may collect data per their own policies:\n' +
        '• Supabase — authentication and cloud save storage.\n' +
        '• RevenueCat — in-app purchase management and receipt validation.\n' +
        '• Google Sign-In — optional OAuth authentication.\n' +
        '• Apple Sign-In — optional OAuth authentication.\n' +
        'We encourage you to review the privacy policies of each provider.',
    },
    {
      heading: 'Data Retention',
      body:
        'We retain your account data for as long as your account is active. ' +
        'Guest session data is stored locally on your device and may be cleared if you uninstall the app or sign out. ' +
        'You may request deletion of your account and associated data by contacting support.',
    },
    {
      heading: 'Children\'s Privacy',
      body:
        'SpinVault is intended for users 18 and older. ' +
        'We do not knowingly collect personal information from anyone under 18. ' +
        'If you believe we have inadvertently collected such data, please contact us immediately.',
    },
    {
      heading: 'Advertising and Analytics',
      body:
        'SpinVault may show rewarded video ads from third-party ad networks. ' +
        'Ad networks may collect device identifiers and usage data in accordance with their own privacy policies. ' +
        'You can opt out of personalized advertising through your device settings (Limit Ad Tracking on iOS, or Opt Out of Ads Personalization on Android).',
    },
    {
      heading: 'Your Rights',
      body:
        'Depending on your location you may have rights to access, correct, delete, or export your personal data. ' +
        'To exercise these rights, contact us at support@TODO_REPLACE_SPINVAULT_DOMAIN.', // TODO(launch): Replace with real email.
    },
    {
      heading: 'Security',
      body:
        'We use industry-standard measures to protect your data, including encrypted data transmission (HTTPS) ' +
        'and secure authentication through Supabase. No method of transmission over the internet is 100% secure.',
    },
    {
      heading: 'Changes to This Policy',
      body:
        'We may update this Privacy Policy from time to time. ' +
        'The effective date at the top of this document will reflect the date of the most recent revision. ' +
        'Continued use of the app after changes constitutes acceptance of the updated policy.',
    },
    {
      heading: 'Contact',
      body:
        'Privacy questions or data requests? Contact us at support@TODO_REPLACE_SPINVAULT_DOMAIN.\n' + // TODO(launch): Replace with real email.
        'We aim to respond within 5 business days.',
    },
  ],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getLegalDocument(type: LegalDocType): LegalDocument {
  return type === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY
}
