import { isServerEconomyEnabled } from '@/lib/economy-client'
import { isServerSpinEnabled } from '@/lib/server-spin'

/**
 * When true, `wallets` (Postgres) owns coin / free-spin / bonus-meter balances.
 * Client must not mutate them via local spin or persist copies in `player_saves`.
 */
export function usesServerAuthoritativeWallet(): boolean {
  return isServerSpinEnabled() || isServerEconomyEnabled()
}
