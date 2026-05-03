import { getSupabase } from '@/lib/supabase'

/** Same keys as `NotificationPrefs` in auth-context (kept separate to avoid circular imports). */
export interface NotificationPrefsPayload {
  dailyBonus: boolean
  giftNotifications: boolean
  eventReminders: boolean
  promotions: boolean
}

const defaults: NotificationPrefsPayload = {
  dailyBonus: true,
  giftNotifications: true,
  eventReminders: true,
  promotions: false,
}

function rowToPrefs(row: {
  daily_reward_reminders: boolean
  gift_reminders: boolean
  event_reminders: boolean
  shop_offer_reminders: boolean
}): NotificationPrefsPayload {
  return {
    dailyBonus: row.daily_reward_reminders,
    giftNotifications: row.gift_reminders,
    eventReminders: row.event_reminders,
    promotions: row.shop_offer_reminders,
  }
}

function prefsToRow(prefs: NotificationPrefsPayload) {
  return {
    daily_reward_reminders: prefs.dailyBonus,
    gift_reminders: prefs.giftNotifications,
    event_reminders: prefs.eventReminders,
    shop_offer_reminders: prefs.promotions,
  }
}

/** Load remote prefs or create default row. Returns null if Supabase/session unavailable. */
export async function pullNotificationPreferences(userId: string): Promise<NotificationPrefsPayload | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data: row, error } = await supabase
    .from('notification_preferences')
    .select(
      'daily_reward_reminders, gift_reminders, event_reminders, shop_offer_reminders',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    if (__DEV__) console.warn('[notification_preferences] pull', error.message)
    return null
  }

  if (!row) {
    const insertPayload = { user_id: userId, ...prefsToRow(defaults) }
    const { error: insErr } = await supabase.from('notification_preferences').insert(insertPayload)
    if (insErr && __DEV__) console.warn('[notification_preferences] insert', insErr.message)
    return defaults
  }

  return rowToPrefs(row as Parameters<typeof rowToPrefs>[0])
}

export async function pushNotificationPreferences(
  userId: string,
  prefs: NotificationPrefsPayload,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  const { error } = await supabase
    .from('notification_preferences')
    .update(prefsToRow(prefs))
    .eq('user_id', userId)

  if (error && __DEV__) console.warn('[notification_preferences] push', error.message)
}
