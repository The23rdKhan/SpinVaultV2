/**
 * Dev builds: use a custom client (expo-dev-client), not Expo Go — `npm run dev` in /mobile
 * (repo root: `npm run expo:dev`). First time: `npx expo prebuild` then `npx expo run:ios` / `run:android`,
 * or EAS: `npm run eas:build:dev:ios-sim` etc. Expo Go: `npm run start:go`.
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

const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME

/** Display name under the icon; override per profile via EAS `env.EXPO_PUBLIC_APP_NAME`. */
const appName = process.env.EXPO_PUBLIC_APP_NAME ?? 'SpinVault'

const plugins: NonNullable<ExpoConfig['plugins']> = [
  'expo-dev-client',
  'expo-router',
  'expo-font',
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
]

if (googleIosUrlScheme) {
  plugins.push([
    '@react-native-google-signin/google-signin',
    { iosUrlScheme: googleIosUrlScheme },
  ])
}

const config = {
  name: appName,
  slug: 'spinvault',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'mobile',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.spinvault.mobile',
    usesAppleSignIn: true,
  },
  android: {
    package: 'com.spinvault.mobile',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
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
