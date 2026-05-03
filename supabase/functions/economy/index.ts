import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, requireSessionUser } from '../_shared/require-session.ts'

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
    const action = typeof body.action === 'string' ? body.action : ''

    if (action === 'claim_daily_reward') {
      const request_id = typeof body.request_id === 'string' ? body.request_id : ''
      const day = Number(body.day)

      if (!request_id || !UUID_RE.test(request_id)) {
        return new Response(JSON.stringify({ error: 'invalid_request_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!Number.isInteger(day) || day < 1 || day > 7) {
        return new Response(JSON.stringify({ error: 'invalid_day' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data, error } = await session.admin.rpc('economy_claim_daily_reward_internal', {
        p_user_id: session.userId,
        p_request_id: request_id,
        p_day: day,
      })

      if (error) {
        console.error('[economy] claim_daily_reward', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const payload = data as Record<string, unknown>
      if (payload?.ok === false) {
        const status = payload.error === 'invalid_claim_sequence' ? 409 : 400
        return new Response(JSON.stringify(payload), {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'spin_daily_wheel') {
      const request_id = typeof body.request_id === 'string' ? body.request_id : ''
      if (!request_id || !UUID_RE.test(request_id)) {
        return new Response(JSON.stringify({ error: 'invalid_request_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data, error } = await session.admin.rpc('economy_spin_daily_wheel_internal', {
        p_user_id: session.userId,
        p_request_id: request_id,
      })
      if (error) {
        console.error('[economy] spin_daily_wheel', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const payload = data as Record<string, unknown>
      if (payload?.ok === false) {
        const status = payload.error === 'daily_wheel_already_claimed' ? 409 : 400
        return new Response(JSON.stringify(payload), {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'claim_mission_reward') {
      const request_id = typeof body.request_id === 'string' ? body.request_id : ''
      const mission_key = typeof body.mission_key === 'string' ? body.mission_key : ''
      if (!request_id || !UUID_RE.test(request_id)) {
        return new Response(JSON.stringify({ error: 'invalid_request_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!mission_key) {
        return new Response(JSON.stringify({ error: 'invalid_mission_key' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data, error } = await session.admin.rpc('economy_claim_mission_internal', {
        p_user_id: session.userId,
        p_request_id: request_id,
        p_mission_key: mission_key,
      })
      if (error) {
        console.error('[economy] claim_mission_reward', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const payload = data as Record<string, unknown>
      if (payload?.ok === false) {
        return new Response(JSON.stringify(payload), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'buy_theme') {
      const request_id = typeof body.request_id === 'string' ? body.request_id : ''
      const theme_slug = typeof body.theme_slug === 'string' ? body.theme_slug : ''
      if (!request_id || !UUID_RE.test(request_id)) {
        return new Response(JSON.stringify({ error: 'invalid_request_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!theme_slug) {
        return new Response(JSON.stringify({ error: 'invalid_theme_slug' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data, error } = await session.admin.rpc('economy_buy_theme_internal', {
        p_user_id: session.userId,
        p_request_id: request_id,
        p_theme_slug: theme_slug,
      })
      if (error) {
        console.error('[economy] buy_theme', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const payload = data as Record<string, unknown>
      if (payload?.ok === false) {
        return new Response(JSON.stringify(payload), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'unknown_action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[economy]', e)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
