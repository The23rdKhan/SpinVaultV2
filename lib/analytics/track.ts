'use client'

import type { AnalyticsEventName } from '@shared/analytics/event-names'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

let sessionKey: string | null = null

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  if (!sessionKey) {
    const k = 'spinvault_analytics_sid'
    let sid = sessionStorage.getItem(k)
    if (!sid) {
      sid = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      sessionStorage.setItem(k, sid)
    }
    sessionKey = sid
  }
  return sessionKey
}

export function track(eventName: AnalyticsEventName, properties?: Record<string, unknown>): void {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) return

  void (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return

      const { error } = await supabase.from('analytics_events').insert({
        user_id: uid,
        session_id: getSessionId(),
        event_name: eventName,
        properties: properties ?? {},
        platform: 'web',
      })
      if (error && process.env.NODE_ENV === 'development') {
        console.warn('[analytics]', eventName, error.message)
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.warn('[analytics]', eventName, e)
    }
  })()
}
