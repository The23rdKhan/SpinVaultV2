import { Platform } from 'react-native'
import type { AnalyticsEventName } from '@shared/analytics/event-names'
import { getSupabase } from '@/lib/supabase'

/** One ID per JS runtime (cold start). Avoids extra storage reads; good enough for funnel/session stitching. */
let processSessionId: string | null = null

function sessionId(): string {
  if (!processSessionId) {
    processSessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }
  return processSessionId
}

/**
 * Fire-and-forget analytics insert. Requires Supabase Auth session + profiles row.
 * Guest-only local accounts skip silently until you add Anonymous Sign-In or Edge relay.
 */
export function track(eventName: AnalyticsEventName, properties?: Record<string, unknown>): void {
  const supabase = getSupabase()
  if (!supabase) return

  void (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return

      const { error } = await supabase.from('analytics_events').insert({
        user_id: uid,
        session_id: sessionId(),
        event_name: eventName,
        properties: properties ?? {},
        platform: Platform.OS,
      })
      if (error && __DEV__) console.warn('[analytics]', eventName, error.message)
    } catch (e) {
      if (__DEV__) console.warn('[analytics]', eventName, e)
    }
  })()
}
