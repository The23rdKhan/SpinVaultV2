import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { useGame } from '@/lib/game-context'

/** expo-notifications permission shape at runtime (types omit `granted` in some TS setups). */
type NotificationPermission = { granted: boolean }

const ANDROID_DEFAULT_CHANNEL_ID = 'default'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Permission requests + Android default channel. Push token registration is optional (EAS project id).
 */
export function NotificationsInit() {
  const { notificationsEnabled } = useGame()

  useEffect(() => {
    if (Platform.OS !== 'android') return
    void Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web') return

    void (async () => {
      if (!notificationsEnabled) return

      const before = (await Notifications.getPermissionsAsync()) as NotificationPermission
      if (!before.granted) {
        await Notifications.requestPermissionsAsync()
      }

      const projectId =
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
        (
          Constants.expoConfig as
            | { extra?: { eas?: { projectId?: string } } }
            | undefined
        )?.extra?.eas?.projectId

      const after = (await Notifications.getPermissionsAsync()) as NotificationPermission
      if (after.granted && projectId) {
        try {
          const token = await Notifications.getExpoPushTokenAsync({ projectId })
          if (__DEV__) {
            // Replace with backend registration when ready.
            console.log('[notifications] Expo push token', token.data)
          }
        } catch (e) {
          if (__DEV__) console.warn('[notifications] push token failed', e)
        }
      }
    })()
  }, [notificationsEnabled])

  return null
}
