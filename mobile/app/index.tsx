import { Redirect } from 'expo-router'
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/lib/app-routes'

export default function GateScreen() {
  const { isLoading, hasCompletedOnboarding, isAuthenticated, passwordRecoveryPending } = useAuth()

  if (isLoading) {
    return <BrandedLoadingScreen />
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href={routes.onboarding} />
  }

  if (!isAuthenticated) {
    return <Redirect href={routes.login} />
  }

  if (passwordRecoveryPending) {
    return <Redirect href={routes.resetPassword} />
  }

  return <Redirect href={routes.tabsIndex} />
}
