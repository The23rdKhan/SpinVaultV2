import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/require-session.ts'
import { verifyAdmobRewardCallback } from '../_shared/admob-ssv-verify.ts'
import { v5 as uuidv5 } from 'https://esm.sh/uuid@11.0.3'

/**
 * AdMob rewarded SSV callback (GET). Verify signature, then grant coins idempotently.
 *
 * AdMob UI: server-side verification URL → https://<project>.supabase.co/functions/v1/ads-reward
 * Set RewardedAd server-side options userIdentifier to Supabase auth user id (UUID).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Namespace UUID for deterministic wallet_ledger.request_id per AdMob transaction_id */
const ADMOB_REQUEST_NS = '35108160-e981-47be-be42-d987f7764739'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'GET') {
    return new Response('method_not_allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const okSig = await verifyAdmobRewardCallback(req.url)
    if (!okSig) {
      return new Response('invalid_signature', { status: 403, headers: corsHeaders })
    }

    const u = new URL(req.url)
    const userId = (u.searchParams.get('user_id') ?? u.searchParams.get('userid') ?? '').trim()
    const txRaw = (u.searchParams.get('transaction_id') ?? '').trim()
    const rewardRaw = u.searchParams.get('reward_amount')
    const placement = u.searchParams.get('ad_unit') ?? u.searchParams.get('placement')

    if (!UUID_RE.test(userId) || !txRaw) {
      return new Response('bad_request', { status: 400, headers: corsHeaders })
    }

    const rewardAmount = rewardRaw != null ? Number.parseInt(rewardRaw, 10) : 0
    if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) {
      return new Response('bad_reward', { status: 400, headers: corsHeaders })
    }

    const requestId = uuidv5(`admob:ssv:${txRaw}`, ADMOB_REQUEST_NS)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return new Response('server_misconfigured', { status: 500, headers: corsHeaders })
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1')
    const admin = createClient(supabaseUrl, serviceKey)

    const { data, error } = await admin.rpc('economy_grant_rewarded_ad_internal', {
      p_user_id: userId,
      p_request_id: requestId,
      p_granted_coins: rewardAmount,
      p_placement: placement,
      p_network: 'admob',
      p_metadata: {
        transaction_id: txRaw,
        reward_item: u.searchParams.get('reward_item'),
        timestamp: u.searchParams.get('timestamp'),
        ad_network: u.searchParams.get('ad_network'),
        custom_data: u.searchParams.get('custom_data'),
      },
    })

    if (error) {
      console.error('[ads-reward]', error)
      return new Response('rpc_error', { status: 500, headers: corsHeaders })
    }

    const payload = data as Record<string, unknown>
    if (payload?.ok === false) {
      return new Response(String(payload.error ?? 'grant_rejected'), {
        status: 400,
        headers: corsHeaders,
      })
    }

    return new Response('OK', { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('[ads-reward]', e)
    return new Response('error', { status: 500, headers: corsHeaders })
  }
})
