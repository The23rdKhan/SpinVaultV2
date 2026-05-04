/**
 * Dev builds: use a custom client (expo-dev-client), not Expo Go — `npm run dev` in /mobile
 * (repo root: `npm run expo:dev`). First time: `npx expo prebuild` then `npx expo run:ios` / `run:android`,
 * or EAS device builds from `mobile/package.json`. Expo Go: `npm run start:go`.
 *
 * Env for Google Sign-In (native → Supabase `signInWithIdToken`):
 * - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID — OAuth client ID type **Web** (required for Android + server token exchange).
 * - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID — optional; iOS client ID if different from plist flow.
 * - EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME — reversed iOS client ID (e.g. com.googleusercontent.apps.xxx); required for `npx expo prebuild` iOS URL scheme.
 *
 * Supabase Dashboard → Authentication → Providers: enable Apple & Google; add all client IDs / bundle IDs per Supabase docs.
 *
 * Duplicate accounts (same person, OAuth + email): enable **Manual linking** / matching policies under Authentication
 * so users link identities instead of creating a second user. Email/password sign-up errors are surfaced in-app when the email already exists.
 *
 * Password reset: add redirect URL `mobile://reset-password` (or EXPO_PUBLIC_SUPABASE_RESET_REDIRECT_URL) under Authentication → URL Configuration.
 */
import type { ExpoConfig } from 'expo/config'
import type { ConfigPlugin } from 'expo/config-plugins'
import { withAndroidManifest } from 'expo/config-plugins'

/**
 * react-native-purchases v10 ships without an Expo config plugin, so we add the
 * Android `com.android.vending.BILLING` permission manually.
 * iOS StoreKit capability is enabled in the Apple Developer portal (App ID →
 * In-App Purchases) — nothing extra is required in app.config.ts for iOS.
 */
const withRevenueCatAndroidBilling: ConfigPlugin = (config) =>
  withAndroidManifest(config, (c) => {
    const manifest = c.modResults
    const perms: Array<{ $: { 'android:name': string } }> =
      (manifest.manifest['uses-permission'] as typeof manifest.manifest['uses-permission']) ?? []
    const billingPermission = 'com.android.vending.BILLING'
    if (!perms.some((p) => p.$['android:name'] === billingPermission)) {
      perms.push({ $: { 'android:name': billingPermission } })
      manifest.manifest['uses-permission'] = perms
    }
    return c
  })

const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME

/** Display name under the icon; override per profile via EAS `env.EXPO_PUBLIC_APP_NAME`. */
const appName = process.env.EXPO_PUBLIC_APP_NAME ?? 'SpinVault'

const plugins: NonNullable<ExpoConfig['plugins']> = [
  'expo-dev-client',
  'expo-router',
  'expo-font',
  'expo-asset',
  'expo-web-browser',
  [
    'expo-audio',
    {
      microphonePermission: false,
      recordAudioAndroid: false,
    },
  ],
  ['expo-notifications', { defaultChannel: 'default' }],
  'expo-system-ui',
  // Adds com.android.vending.BILLING to AndroidManifest (no plugin shipped with RC v10).
  withRevenueCatAndroidBilling as unknown as string,
]

if (googleIosUrlScheme) {
  plugins.push([
    '@react-native-google-signin/google-signin',
    { iosUrlScheme: googleIosUrlScheme },
  ])
}

const config = {
  name: appName,
  /** Must match the slug of the Expo project for `extra.eas.projectId` (expo.dev); EAS fails if mismatched. */
  slug: 'mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'mobile',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#140707',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.spinvault.mobile',
    usesAppleSignIn: true,
    /**
     * App Store export compliance: standard HTTPS only (avoids manual encryption questions).
     * IAP setup: enable the "In-App Purchase" capability in Apple Developer Portal ->
     * Identifiers -> com.spinvault.mobile. No entitlement key needed in .entitlements
     * for StoreKit IAP (only Apple Pay / PassKit uses com.apple.developer.in-app-payments).
     */
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.spinvault.mobile',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#140707',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins,
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'db383f1a-fbb4-4d9f-93ac-3b150c2550aa',
    },
  },
}

export default config
