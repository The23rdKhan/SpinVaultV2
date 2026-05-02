import { Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/lib/app-routes'
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen'

export default function OnboardingRoute() {
  const { isLoading, hasCompletedOnboarding, isAuthenticated } = useAuth()

  if (isLoading) {
    return null
  }

  if (hasCompletedOnboarding) {
    if (isAuthenticated) {
      return <Redirect href={routes.tabsIndex} />
    }
    return <Redirect href={routes.login} />
  }

  return <OnboardingScreen />
}
