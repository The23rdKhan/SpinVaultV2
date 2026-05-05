import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useAppearance } from '@/lib/appearance-context'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/lib/app-routes'
import { ForgotPasswordScreen } from '@/components/auth/forgot-password-screen'
import { getSpinVaultShellBackground, getSpinVaultShellPrimary } from '@/theme/tokens'

export default function ForgotPasswordRoute() {
  const { resolvedMode } = useAppearance()
  const { isLoading, isAuthenticated, passwordRecoveryPending } = useAuth()

  if (isLoading) {
    return (
      <View
        style={[styles.loading, { backgroundColor: getSpinVaultShellBackground(resolvedMode) }]}
        accessibilityLabel="Loading"
      >
        <ActivityIndicator size="large" color={getSpinVaultShellPrimary(resolvedMode)} />
      </View>
    )
  }

  if (isAuthenticated && passwordRecoveryPending) {
    return <Redirect href={routes.resetPassword} />
  }

  if (isAuthenticated && !passwordRecoveryPending) {
    return <Redirect href={routes.tabsIndex} />
  }

  return <ForgotPasswordScreen />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
