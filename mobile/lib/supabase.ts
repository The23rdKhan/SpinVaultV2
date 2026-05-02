import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

function createSupabaseClient(): SupabaseClient | null {
  if (browserClient) return browserClient
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  browserClient = createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
  return browserClient
}

/** Lazily created; returns null if URL/key missing. Uses AsyncStorage so sessions survive restarts. */
export function getSupabase(): SupabaseClient | null {
  return createSupabaseClient()
}

function requireSupabase(): SupabaseClient {
  const c = createSupabaseClient()
  if (!c) {
    throw new Error(
      'Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY in .env',
    )
  }
  return c
}

/**
 * Same singleton as `getSupabase()`, but throws if env is missing.
 * Matches common `import { supabase } from '@/lib/supabase'` snippets.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, _receiver) {
    const client = requireSupabase()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value
  },
})
