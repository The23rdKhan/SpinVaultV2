import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { getSupabase } from '@/lib/supabase'

export interface ClaimDailyRewardResponse {
  ok: boolean
  idempotent?: boolean
  error?: string
  expected_day?: number
  coin_balance: number
  free_spin_balance: number
  bonus_meter_progress: number
  daily_streak_after: number
  coins_granted: number
  claimed_day: number
}

/**
 * Server wallet + ledger for shop/rewards/missions. Independent from server spin.
 *
 * **Invariant:** Each economy RPC must send a **fresh UUID** `request_id`. Ledger rows use a
 * global unique constraint on `request_id`, so reusing one ID across actions would break idempotency.
 */
export function isServerEconomyEnabled(): boolean {
  return (
    process.env.EXPO_PUBLIC_USE_SERVER_ECONOMY === '1' &&
    Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
  )
}

/**
 * Claims one daily login step (days 1–7). Idempotent per `request_id` (UUID).
 */
export interface SpinDailyWheelResponse {
  ok: boolean
  idempotent?: boolean
  error?: string
  coin_balance: number
  free_spin_balance: number
  bonus_meter_progress: number
  reward_coins: number
  claim_date?: string
}

export async function requestSpinDailyWheel(): Promise<SpinDailyWheelResponse> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('no_supabase')
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('no_session')
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  const anon = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!anon) throw new Error('no_anon')
  const request_id = uuidv4()
  const res = await fetch(`${baseUrl}/functions/v1/economy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'spin_daily_wheel', request_id }),
  })
  const json = (await res.json()) as SpinDailyWheelResponse & { error?: string }
  if (!res.ok) throw new Error(json.error ?? 'economy_request_failed')
  if (json.ok === false) throw new Error(json.error ?? 'wheel_rejected')
  return json
}

export interface ClaimMissionRewardResponse {
  ok: boolean
  idempotent?: boolean
  error?: string
  coin_balance: number
  free_spin_balance: number
  bonus_meter_progress: number
  mission_key?: string
  coins_granted: number
  free_spins_granted: number
}

export interface BuyThemeResponse {
  ok: boolean
  idempotent?: boolean
  error?: string
  coin_balance: number
  free_spin_balance: number
  bonus_meter_progress: number
  theme_slug?: string
  owned?: boolean
}

export async function requestBuyTheme(themeSlug: string): Promise<BuyThemeResponse> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('no_supabase')
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('no_session')
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  const anon = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!anon) throw new Error('no_anon')
  const request_id = uuidv4()
  const res = await fetch(`${baseUrl}/functions/v1/economy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'buy_theme',
      request_id,
      theme_slug: themeSlug,
    }),
  })
  const json = (await res.json()) as BuyThemeResponse & { error?: string }
  if (!res.ok) throw new Error(json.error ?? 'economy_request_failed')
  if (json.ok === false) throw new Error(json.error ?? 'buy_theme_rejected')
  return json
}

export async function requestClaimMissionReward(missionKey: string): Promise<ClaimMissionRewardResponse> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('no_supabase')
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('no_session')
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  const anon = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!anon) throw new Error('no_anon')
  const request_id = uuidv4()
  const res = await fetch(`${baseUrl}/functions/v1/economy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'claim_mission_reward',
      request_id,
      mission_key: missionKey,
    }),
  })
  const json = (await res.json()) as ClaimMissionRewardResponse & { error?: string }
  if (!res.ok) throw new Error(json.error ?? 'economy_request_failed')
  if (json.ok === false) throw new Error(json.error ?? 'mission_claim_rejected')
  return json
}

export async function requestClaimDailyReward(day: number): Promise<ClaimDailyRewardResponse> {
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('no_supabase')
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('no_session')
  }

  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  const anon = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!anon) {
    throw new Error('no_anon')
  }

  const request_id = uuidv4()
  const res = await fetch(`${baseUrl}/functions/v1/economy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'claim_daily_reward',
      request_id,
      day,
    }),
  })

  const json = (await res.json()) as ClaimDailyRewardResponse & { error?: string }

  if (!res.ok) {
    throw new Error(json.error ?? 'economy_request_failed')
  }

  if (json.ok === false) {
    throw new Error(json.error ?? 'claim_rejected')
  }

  return json
}
