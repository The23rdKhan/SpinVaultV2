import type { NotificationPrefs } from '@/lib/auth-context'

export type ExpoUiNotificationPrefsPilotProps = {
  prefs: NotificationPrefs
  setPref: (key: keyof NotificationPrefs, value: boolean) => void
  resolvedMode: 'dark' | 'light'
}

export const NOTIFICATION_PREF_ROWS: {
  key: keyof NotificationPrefs
  label: string
  description: string
}[] = [
  {
    key: 'dailyBonus',
    label: 'Daily Bonus Reminders',
    description: 'Get notified about unclaimed bonuses',
  },
  {
    key: 'giftNotifications',
    label: 'Gift Notifications',
    description: 'When you receive a gift',
  },
  {
    key: 'eventReminders',
    label: 'Event Reminders',
    description: 'Special events and tournaments',
  },
  {
    key: 'promotions',
    label: 'Promotions',
    description: 'Deals and special offers',
  },
]
