import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/require-session.ts'

/**
 * RevenueCat webhook → economy_fulfill_iap_internal (idempotent).
 *
 * Dashboard: Project → Webhooks → Authorization header must match REVENUECAT_WEBHOOK_AUTHORIZATION
 * (full value, e.g. `Bearer your_secret` or the raw secret — we normalize below).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const FULFILL_TYPES = new Set([
  'INITIAL_PURCHASE',
  'NON_RENEWING_PURCHASE',
  'PROMOTIONAL',
])

function normalizeAuth(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received) return false
  const e = expected.trim()
  const r = received.trim()
  if (e === r) return true
  const eBearer = e.startsWith('Bearer ') ? e : `Bearer ${e}`
  const rBearer = r.startsWith('Bearer ') ? r : `Bearer ${r}`
  return eBearer === rBearer
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const secret = Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION') ?? Deno.env.get('REVENUECAT_WEBHOOK_SECRET')
  if (!secret) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_revcat_webhook_secret' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!normalizeAuth(secret, authHeader)) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: true, ping: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const ev = (body.event ?? body) as Record<string, unknown>
  const eventType = typeof ev.type === 'string' ? ev.type : ''

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: 'server_misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1')
  const admin = createClient(supabaseUrl, serviceKey)

  if (eventType === 'REFUND') {
    const txnId = String(ev.transaction_id ?? ev.original_transaction_id ?? '').trim()
    if (txnId) {
      await admin
        .from('purchases')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('store_transaction_id', txnId)
    }
    return new Response(JSON.stringify({ ok: true, handled: 'refund', event_type: eventType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!FULFILL_TYPES.has(eventType)) {
    return new Response(JSON.stringify({ ok: true, ignored: true, event_type: eventType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const appUserId = typeof ev.app_user_id === 'string' ? ev.app_user_id.trim() : ''
  const productId = typeof ev.product_id === 'string' ? ev.product_id.trim() : ''
  const txnId = String(ev.transaction_id ?? ev.original_transaction_id ?? ev.id ?? '').trim()

  if (!UUID_RE.test(appUserId) || !productId || !txnId) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'invalid_payload',
        event_type: eventType,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  const { data, error } = await admin.rpc('economy_fulfill_iap_internal', {
    p_user_id: appUserId,
    p_store_transaction_id: txnId,
    p_product_sku: productId,
    p_revenuecat_customer_id: appUserId,
    p_metadata: {
      revenuecat_event_type: eventType,
      raw_event_id: ev.id ?? null,
      environment: ev.environment ?? null,
    },
  })

  if (error) {
    console.error('[iap-verify] rpc', error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const payload = data as Record<string, unknown>
  if (payload?.ok === false) {
    const status = payload.error === 'unknown_product' ? 202 : 400
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
