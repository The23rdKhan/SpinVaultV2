import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useAppearance } from '@/lib/appearance-context'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/lib/app-routes'
import { ResetPasswordScreen } from '@/components/auth/reset-password-screen'
import { getSpinVaultShellBackground, getSpinVaultShellPrimary } from '@/theme/tokens'

export default function ResetPasswordRoute() {
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

  if (!passwordRecoveryPending || !isAuthenticated) {
    return <Redirect href={routes.login} />
  }

  return <ResetPasswordScreen />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
