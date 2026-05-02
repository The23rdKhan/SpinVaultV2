/** Map Supabase Auth errors to short, actionable copy (duplicate email, bad password, etc.). */
export function friendlyAuthMessage(
  message: string,
  code: string | undefined,
  context: 'sign_in' | 'sign_up' | 'reset',
): string {
  const c = (code ?? '').toLowerCase()
  const m = message.toLowerCase()

  const duplicateEmail =
    c === 'user_already_exists' ||
    c === 'email_exists' ||
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already exists')

  if (duplicateEmail && context === 'sign_up') {
    return 'That email is already registered. Sign in instead, or use Forgot password if you lost access.'
  }

  if (
    duplicateEmail &&
    context === 'sign_in' &&
    m.includes('already registered')
  ) {
    return message
  }

  const badCredentials =
    c === 'invalid_credentials' ||
    c === 'invalid_grant' ||
    m.includes('invalid login credentials') ||
    m.includes('invalid credentials')

  if (badCredentials && context === 'sign_in') {
    return 'Incorrect email or password. Try again or use Forgot password.'
  }

  if (context === 'reset' && (m.includes('rate limit') || c.includes('over_request'))) {
    return 'Too many attempts. Wait a few minutes and try again.'
  }

  return message
}
