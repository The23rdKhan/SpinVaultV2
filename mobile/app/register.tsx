import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useAppearance } from '@/lib/appearance-context'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/lib/app-routes'
import { RegisterScreen } from '@/components/auth/register-screen'
import { getSpinVaultShellBackground, getSpinVaultShellPrimary } from '@/theme/tokens'

export default function RegisterRoute() {
  const { resolvedMode } = useAppearance()
  const {
    isLoading,
    hasCompletedOnboarding,
    isAuthenticated,
    passwordRecoveryPending,
  } = useAuth()

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

  if (!hasCompletedOnboarding) {
    return <Redirect href={routes.onboarding} />
  }

  if (isAuthenticated) {
    if (passwordRecoveryPending) {
      return <Redirect href={routes.resetPassword} />
    }
    return <Redirect href={routes.tabsIndex} />
  }

  return <RegisterScreen />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
