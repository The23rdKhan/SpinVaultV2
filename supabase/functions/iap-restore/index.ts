import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, requireSessionUser } from '../_shared/require-session.ts'

/**
 * JWT-authenticated client asks server to reconcile RevenueCat non-subscription purchases
 * into Postgres (idempotent). Requires REVENUECAT_REST_API_KEY (secret API key).
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const session = await requireSessionUser(req)
    if (session instanceof Response) return session

    const rcKey = Deno.env.get('REVENUECAT_REST_API_KEY')
    if (!rcKey?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_revcat_rest_api_key' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(session.userId)}`
    const rcRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${rcKey.trim()}`,
        'Content-Type': 'application/json',
      },
    })

    if (!rcRes.ok) {
      const txt = await rcRes.text().catch(() => '')
      console.error('[iap-restore] revenuecat', rcRes.status, txt.slice(0, 500))
      return new Response(
        JSON.stringify({ ok: false, error: 'revenuecat_fetch_failed', status: rcRes.status }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const body = (await rcRes.json()) as {
      subscriber?: {
        non_subscriptions?: Record<string, Record<string, unknown>[]>
      }
    }

    const ns = body.subscriber?.non_subscriptions ?? {}
    let fulfilled = 0
    let skipped = 0
    const errors: string[] = []

    for (const [productSku, purchases] of Object.entries(ns)) {
      if (!Array.isArray(purchases)) continue
      for (const p of purchases) {
        const txnId = String(
          p.id ?? p.store_transaction_identifier ?? p.original_transaction_identifier ?? '',
        ).trim()
        if (!txnId) {
          skipped++
          continue
        }

        const { data, error } = await session.admin.rpc('economy_fulfill_iap_internal', {
          p_user_id: session.userId,
          p_store_transaction_id: txnId,
          p_product_sku: productSku,
          p_revenuecat_customer_id: session.userId,
          p_metadata: { source: 'iap_restore', product_id: productSku },
        })

        if (error) {
          errors.push(`${productSku}:${error.message}`)
          continue
        }

        const payload = data as Record<string, unknown>
        if (payload?.ok === true) fulfilled++
        else skipped++
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        fulfilled_attempts: fulfilled,
        skipped,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('[iap-restore]', e)
    return new Response(JSON.stringify({ ok: false, error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
