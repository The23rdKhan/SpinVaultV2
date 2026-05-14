/**
 * “Continue with Google” using pre-approved raster assets from Google’s Sign in with Google
 * branding pack (rectangular, Continue text). Source ZIP (do not hotlink in production):
 * https://developers.google.com/static/identity/images/signin-assets.zip
 *
 * Expo SDK 55 does not supply these — they are bundled static images via Metro `require()`.
 * Supabase auth is unchanged: same `signInWithGoogle()` → `signInWithIdToken`.
 */
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { router } from 'expo-router'
import { routes } from '@/lib/app-routes'
import { useAppearance } from '@/lib/appearance-context'
import { useAuth } from '@/lib/auth-context'

export type GoogleSignInButtonProps = {
  onSuccess?: () => void | Promise<void>
  navigateToTabs?: boolean
  style?: StyleProp<ViewStyle>
}

const GOOGLE_CONTINUE_LIGHT = require('@/assets/images/google-signin-branded/google-continue-light-rd-3x.png') as number
const GOOGLE_CONTINUE_DARK = require('@/assets/images/google-signin-branded/google-continue-dark-rd-3x.png') as number

export function GoogleSignInButton({
  onSuccess,
  navigateToTabs = true,
  style,
}: GoogleSignInButtonProps) {
  const { resolvedMode } = useAppearance()
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)

  const hasConfig = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim())

  const onPress = useCallback(async () => {
    if (!hasConfig || busy) return
    setBusy(true)
    try {
      const ok = await signInWithGoogle()
      if (!ok) return
      await onSuccess?.()
      if (navigateToTabs) {
        router.replace(routes.tabsIndex)
      }
    } finally {
      setBusy(false)
    }
  }, [busy, hasConfig, navigateToTabs, onSuccess, signInWithGoogle])

  if (!hasConfig) {
    return null
  }

  const source = resolvedMode === 'dark' ? GOOGLE_CONTINUE_DARK : GOOGLE_CONTINUE_LIGHT

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => void onPress()}
        style={({ pressed }) => [styles.hit, { opacity: busy ? 0.75 : pressed ? 0.92 : 1 }]}
      >
        {busy ? (
          <ActivityIndicator color={resolvedMode === 'dark' ? '#E3E3E3' : '#1F1F1F'} />
        ) : (
          <Image
            source={source}
            style={styles.brandImage}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  /** Tap target ≥48pt; image scales inside (Google: preserve aspect ratio). */
  hit: {
    width: '100%',
    maxWidth: 400,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { paddingVertical: 4 },
      default: { paddingVertical: 2 },
    }),
  },
  brandImage: {
    width: '100%',
    height: 48,
  },
})

export default GoogleSignInButton
