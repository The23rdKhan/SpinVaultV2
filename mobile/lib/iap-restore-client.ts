import { getSupabase } from '@/lib/supabase'

/**
 * Server reconcile: RevenueCat REST → `economy_fulfill_iap_internal` for missing rows.
 * Call after `Purchases.restorePurchases()` so RC has synced with the store.
 */
export async function requestIapRestoreFromServer(): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return false

  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const anon = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!baseUrl || !anon) return false

  const res = await fetch(`${baseUrl}/functions/v1/iap-restore`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })

  if (!res.ok) return false
  const json = (await res.json()) as { ok?: boolean }
  return json.ok === true
}
