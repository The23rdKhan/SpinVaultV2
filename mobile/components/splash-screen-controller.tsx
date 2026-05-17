import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { useAppearance } from '@/lib/appearance-context'
import { useAuthContext } from '@/hooks/use-auth-context'

export function SplashScreenController() {
  const { isLoading } = useAuthContext()
  const { isHydrated } = useAppearance()

  useEffect(() => {
    if (!isLoading && isHydrated) {
      void SplashScreen.hideAsync()
    }
  }, [isLoading, isHydrated])

  return null
}
