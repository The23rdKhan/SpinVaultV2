import { Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/lib/app-routes'
import { ForgotPasswordScreen } from '@/components/auth/forgot-password-screen'

export default function ForgotPasswordRoute() {
  const { isLoading, isAuthenticated, passwordRecoveryPending } = useAuth()

  if (isLoading) {
    return null
  }

  if (isAuthenticated && passwordRecoveryPending) {
    return <Redirect href={routes.resetPassword} />
  }

  if (isAuthenticated && !passwordRecoveryPending) {
    return <Redirect href={routes.tabsIndex} />
  }

  return <ForgotPasswordScreen />
}
