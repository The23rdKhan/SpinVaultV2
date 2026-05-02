import { Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/lib/app-routes'
import { LoginScreen } from '@/components/auth/login-screen'

export default function LoginRoute() {
  const {
    isLoading,
    hasCompletedOnboarding,
    isAuthenticated,
    passwordRecoveryPending,
  } = useAuth()

  if (isLoading) {
    return null
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

  return <LoginScreen />
}
