import { Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/lib/app-routes'
import { ResetPasswordScreen } from '@/components/auth/reset-password-screen'

export default function ResetPasswordRoute() {
  const { isLoading, isAuthenticated, passwordRecoveryPending } = useAuth()

  if (isLoading) {
    return null
  }

  if (!passwordRecoveryPending || !isAuthenticated) {
    return <Redirect href={routes.login} />
  }

  return <ResetPasswordScreen />
}
