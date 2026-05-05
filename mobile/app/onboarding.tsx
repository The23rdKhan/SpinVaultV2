import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useAppearance } from '@/lib/appearance-context'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/lib/app-routes'
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen'
import { getSpinVaultShellBackground, getSpinVaultShellPrimary } from '@/theme/tokens'

export default function OnboardingRoute() {
  const { resolvedMode } = useAppearance()
  const { isLoading, hasCompletedOnboarding, isAuthenticated } = useAuth()

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

  if (hasCompletedOnboarding) {
    if (isAuthenticated) {
      return <Redirect href={routes.tabsIndex} />
    }
    return <Redirect href={routes.login} />
  }

  return <OnboardingScreen />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
