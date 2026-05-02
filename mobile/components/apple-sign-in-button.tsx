import { useCallback, useState } from 'react'
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import {
  AppleButton,
  appleAuth,
  appleAuthAndroid,
} from '@invertase/react-native-apple-authentication'
import { router } from 'expo-router'
import { routes } from '@/lib/app-routes'
import { useAuth } from '@/lib/auth-context'

export type AppleSignInButtonProps = {
  /** Called after Supabase session is established (e.g. complete onboarding, close sheet). */
  onSuccess?: () => void | Promise<void>
  /** When true (default), navigate into tabs after sign-in. Set false when already inside the app shell. */
  navigateToTabs?: boolean
  style?: StyleProp<ViewStyle>
}

function canUseAppleOnThisDevice(): boolean {
  if (Platform.OS === 'ios') {
    return appleAuth.isSupported
  }
  if (Platform.OS === 'android') {
    const serviceId = process.env.EXPO_PUBLIC_APPLE_AUTH_SERVICE_ID?.trim()
    const redirectUri = process.env.EXPO_PUBLIC_APPLE_AUTH_REDIRECT_URI?.trim()
    return (
      typeof appleAuthAndroid.signIn === 'function' &&
      appleAuthAndroid.isSupported === true &&
      Boolean(serviceId) &&
      Boolean(redirectUri)
    )
  }
  return false
}

export function AppleSignInButton({
  onSuccess,
  navigateToTabs = true,
  style,
}: AppleSignInButtonProps) {
  const { signInWithApple } = useAuth()
  const [busy, setBusy] = useState(false)

  const onAppleButtonPress = useCallback(async () => {
    if (!canUseAppleOnThisDevice() || busy) return
    setBusy(true)
    try {
      const ok = await signInWithApple()
      if (!ok) return
      await onSuccess?.()
      if (navigateToTabs) {
        router.replace(routes.tabsIndex)
      }
    } finally {
      setBusy(false)
    }
  }, [busy, navigateToTabs, onSuccess, signInWithApple])

  if (!canUseAppleOnThisDevice()) {
    return null
  }

  return (
    <View style={[styles.wrap, style]}>
      <AppleButton
        buttonStyle={AppleButton.Style.BLACK}
        buttonType={AppleButton.Type.SIGN_IN}
        cornerRadius={12}
        style={styles.button}
        onPress={() => void onAppleButtonPress()}
      />
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
    height: 48,
  },
})

export default AppleSignInButton
