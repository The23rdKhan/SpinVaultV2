/**
 * Daily login ladder (days 1–7). Must stay aligned with Postgres function
 * `economy_claim_daily_reward_internal` in Supabase migrations.
 */
export const DAILY_LOGIN_REWARD_COINS = [100, 200, 350, 500, 750, 1000, 2500] as const

export function coinsForDailyLoginDay(day: number): number {
  if (day < 1 || day > DAILY_LOGIN_REWARD_COINS.length) return 0
  return DAILY_LOGIN_REWARD_COINS[day - 1]
}
