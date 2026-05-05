import 'react-native-reanimated'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { CasinoAudioController } from '@/components/casino-audio-controller'
import { NotificationsInit } from '@/components/notifications-init'
import { SplashScreenController } from '@/components/splash-screen-controller'
import { AppearanceProvider, useAppearance } from '@/lib/appearance-context'
import { track } from '@/lib/analytics/track'
import { AuthProvider } from '@/lib/auth-context'
import { GameProvider } from '@/lib/game-context'
import { initRevenueCat } from '@/lib/revenuecat'
import { AnalyticsEvents } from '@shared/analytics/event-names'
import { getSpinVaultShellBackground } from '@/theme/tokens'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

function Navigation() {
  const { resolvedMode } = useAppearance()

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(getSpinVaultShellBackground(resolvedMode))
  }, [resolvedMode])

  return (
    <>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <Toast />
    </>
  )
}

export default function RootLayout() {
  useEffect(() => {
    track(AnalyticsEvents.APP_OPEN)
  }, [])

  useEffect(() => {
    initRevenueCat()
  }, [])

  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <AuthProvider>
          <SplashScreenController />
          <GameProvider>
            {Platform.OS !== 'web' && <CasinoAudioController />}
            {Platform.OS !== 'web' && <NotificationsInit />}
            <Navigation />
          </GameProvider>
        </AuthProvider>
      </AppearanceProvider>
    </SafeAreaProvider>
  )
}
