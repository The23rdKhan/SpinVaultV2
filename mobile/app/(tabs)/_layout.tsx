import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { Redirect } from 'expo-router'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAppearance } from '@/lib/appearance-context'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/lib/app-routes'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useGame } from '@/lib/game-context'

export default function TabLayout() {
  const { isAuthenticated, isLoading, passwordRecoveryPending } = useAuth()
  const { resolvedMode } = useAppearance()
  const t = useCasinoTheme()
  const { hapticsEnabled } = useGame()

  if (!isLoading && !isAuthenticated) {
    return <Redirect href={routes.login} />
  }

  if (!isLoading && isAuthenticated && passwordRecoveryPending) {
    return <Redirect href={routes.resetPassword} />
  }

  return (
    <ThemeProvider value={resolvedMode === 'dark' ? DarkTheme : DefaultTheme}>
      <NativeTabs
        tintColor={t.primary}
        backgroundColor={t.card}
        labelStyle={{ color: t.mutedForeground }}
        iconColor={{ default: t.mutedForeground, selected: t.primary }}
        disableTransparentOnScrollEdge
        screenListeners={{
          tabPress: () => {
            if (!hapticsEnabled || Platform.OS === 'web') return
            if (Platform.OS === 'android') {
              void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
            } else {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
          },
        }}
      >
        <NativeTabs.Trigger name="play">
          <NativeTabs.Trigger.Label>Play</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'gamecontroller', selected: 'gamecontroller.fill' }}
            md="sports_esports"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="rewards">
          <NativeTabs.Trigger.Label>Rewards</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'gift', selected: 'gift.fill' }} md="card_giftcard" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="shop">
          <NativeTabs.Trigger.Label>Shop</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'bag', selected: 'bag.fill' }} md="shopping_bag" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  )
}
