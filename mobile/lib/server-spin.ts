import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { getSupabase } from '@/lib/supabase'

export interface ServerSpinPayload {
  ok: boolean
  idempotent?: boolean
  coin_balance: number
  free_spin_balance: number
  bonus_meter_progress: number
  grid: string[][]
  result_summary: {
    total_win: number
    free_spins_won: number
    is_jackpot: boolean
    bonus_meter_payout: number
    bonus_progress_after: number
    win_multiplier: number
    win_type: string
    winning_lines: { positions: [number, number][]; symbol_id: string; multiplier: number }[]
    used_free_spin?: boolean
  }
}

export function isServerSpinEnabled(): boolean {
  return (
    process.env.EXPO_PUBLIC_USE_SERVER_SPIN === '1' &&
    Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
  )
}

export async function requestServerSpin(bet: number): Promise<ServerSpinPayload> {
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

  const client_request_id = uuidv4()
  const res = await fetch(`${baseUrl}/functions/v1/spin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ client_request_id, bet }),
  })

  const json = (await res.json()) as ServerSpinPayload & { error?: string }
  if (!res.ok) {
    throw new Error(json.error || 'spin_failed')
  }
  return json as ServerSpinPayload
}
