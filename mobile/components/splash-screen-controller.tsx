import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { useAuthContext } from '@/hooks/use-auth-context'

export function SplashScreenController() {
  const { isLoading } = useAuthContext()

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync()
    }
  }, [isLoading])

  return null
}
