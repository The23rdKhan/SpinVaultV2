import { useCallback, useState } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { GoogleSigninButton } from '@react-native-google-signin/google-signin'
import { router } from 'expo-router'
import { routes } from '@/lib/app-routes'
import { useAuth } from '@/lib/auth-context'

export type GoogleSignInButtonProps = {
  onSuccess?: () => void | Promise<void>
  navigateToTabs?: boolean
  style?: StyleProp<ViewStyle>
}

export function GoogleSignInButton({
  onSuccess,
  navigateToTabs = true,
  style,
}: GoogleSignInButtonProps) {
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
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Dark}
        style={styles.button}
        disabled={busy}
        onPress={() => void onPress()}
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

export default GoogleSignInButton
