import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { router } from 'expo-router'
import { routes } from '@/lib/app-routes'
import { useAuth } from '@/lib/auth-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'

export type GoogleSignInButtonProps = {
  onSuccess?: () => void | Promise<void>
  navigateToTabs?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * Custom “Continue with Google” control. `@react-native-google-signin`’s native
 * `GoogleSigninButton` does not allow custom label text.
 */
export function GoogleSignInButton({
  onSuccess,
  navigateToTabs = true,
  style,
}: GoogleSignInButtonProps) {
  const t = useCasinoTheme()
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

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => void onPress()}
        style={({ pressed }) => [
          styles.button,
          {
            borderColor: t.border,
            backgroundColor: t.surfaceElevated,
            opacity: busy ? 0.75 : pressed ? 0.92 : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={t.textPrimary} />
        ) : (
          <>
            <FontAwesome name="google" size={20} color="#4285F4" accessibilityElementsHidden />
            <Text style={[styles.label, { color: t.textPrimary }]}>Continue with Google</Text>
          </>
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
  button: {
    width: '100%',
    maxWidth: 400,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
  },
})

export default GoogleSignInButton
