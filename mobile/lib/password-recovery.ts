/**
 * Deep link target for Supabase "Reset password" emails.
 * Add this exact URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
 *
 * Defaults to app scheme from app.config (`mobile`) + path `reset-password`.
 * Override with EXPO_PUBLIC_SUPABASE_RESET_REDIRECT_URL if you use a universal link / web handoff.
 */
export function getPasswordResetRedirectUrl(): string {
  const custom = process.env.EXPO_PUBLIC_SUPABASE_RESET_REDIRECT_URL?.trim()
  if (custom) return custom
  return 'mobile://reset-password'
}

export type ParsedRecoveryTokens = {
  access_token: string
  refresh_token: string
}

/** Parse Supabase recovery redirect: hash or query with access_token + refresh_token. */
export function parseRecoveryTokensFromUrl(url: string): ParsedRecoveryTokens | null {
  try {
    const hashIdx = url.indexOf('#')
    const queryIdx = url.indexOf('?')

    let fragment = ''
    if (hashIdx !== -1) {
      fragment = url.slice(hashIdx + 1)
    }

    let query = ''
    if (queryIdx !== -1) {
      const end = hashIdx === -1 ? url.length : hashIdx
      query = url.slice(queryIdx + 1, end)
    }

    const fromFragment = new URLSearchParams(fragment)
    const fromQuery = new URLSearchParams(query)

    const access_token =
      fromFragment.get('access_token') ?? fromQuery.get('access_token') ?? ''
    const refresh_token =
      fromFragment.get('refresh_token') ?? fromQuery.get('refresh_token') ?? ''
    const type = fromFragment.get('type') ?? fromQuery.get('type')

    if (!access_token || !refresh_token) {
      return null
    }

    if (type === 'recovery') {
      return { access_token, refresh_token }
    }

    if (url.includes('reset-password')) {
      return { access_token, refresh_token }
    }

    return null
  } catch {
    return null
  }
}
