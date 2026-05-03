import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, requireSessionUser } from '../_shared/require-session.ts'
import {
  BET_OPTIONS,
  buildRandomGridIds,
  computeBalancesAfterSpin,
} from '../_shared/slot-engine.ts'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const session = await requireSessionUser(req)
    if (session instanceof Response) return session

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const client_request_id = typeof body.client_request_id === 'string' ? body.client_request_id : ''
    const bet = Number(body.bet)

    if (!client_request_id || !UUID_RE.test(client_request_id)) {
      return new Response(JSON.stringify({ error: 'invalid_client_request_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!BET_OPTIONS.includes(bet as (typeof BET_OPTIONS)[number])) {
      return new Response(JSON.stringify({ error: 'invalid_bet' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: wallet, error: wErr } = await session.admin
      .from('wallets')
      .select('coin_balance, free_spin_balance, bonus_meter_progress')
      .eq('user_id', session.userId)
      .maybeSingle()

    if (wErr || !wallet) {
      return new Response(JSON.stringify({ error: 'wallet_not_found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const gridIds = buildRandomGridIds()

    let computed: ReturnType<typeof computeBalancesAfterSpin>
    try {
      computed = computeBalancesAfterSpin({
        walletCoins: Number(wallet.coin_balance),
        walletFreeSpins: Number(wallet.free_spin_balance),
        bonusMeterProgress: Number(wallet.bonus_meter_progress ?? 0),
        currentBet: bet,
        gridIds,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'spin_failed'
      const status = msg === 'insufficient_coins' || msg === 'no_free_spins' ? 400 : 500
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const summary = computed.summary

    const { data: rpcData, error: rpcErr } = await session.admin.rpc('spin_commit_internal', {
      p_user_id: session.userId,
      p_client_request_id: client_request_id,
      p_slot_machine_slug: 'default',
      p_bet: bet,
      p_used_free_spin: computed.usedFreeSpin,
      p_grid: gridIds,
      p_result_summary: summary,
      p_coin_balance_after: computed.coinBalanceAfter,
      p_free_spin_balance_after: computed.freeSpinBalanceAfter,
      p_bonus_progress_after: summary.bonus_progress_after,
    })

    if (rpcErr) {
      console.error('[spin]', rpcErr)
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(rpcData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[spin]', e)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
