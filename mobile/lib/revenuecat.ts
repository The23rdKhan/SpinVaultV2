import { Platform } from 'react-native'
import Purchases from 'react-native-purchases'

let didConfigure = false

export type ConsumablePurchaseResult =
  | { ok: true }
  | { ok: false; cancelled: boolean; message?: string }

/**
 * One-time RevenueCat SDK setup. Safe to call multiple times; no-ops without API keys or on web.
 */
export function initRevenueCat(): void {
  if (didConfigure) return
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return

  const appleKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?.trim()
  const googleKey = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?.trim()
  const apiKey =
    Platform.OS === 'ios' ? appleKey : Platform.OS === 'android' ? googleKey : undefined

  if (!apiKey) return

  Purchases.configure({ apiKey })
  didConfigure = true
}

/** True after `configure` ran with a valid platform API key. */
export function isRevenueCatConfigured(): boolean {
  return didConfigure
}

/**
 * Purchase a consumable / non-subscription SKU already configured in RevenueCat + stores.
 * Product identifier must match `public.products.sku` for webhook fulfillment.
 */
export async function purchaseConsumableSku(sku: string): Promise<ConsumablePurchaseResult> {
  if (!didConfigure) {
    return { ok: false, cancelled: false, message: 'revenuecat_not_configured' }
  }
  const trimmed = sku.trim()
  if (!trimmed) {
    return { ok: false, cancelled: false, message: 'missing_sku' }
  }
  try {
    const products = await Purchases.getProducts([trimmed])
    const product = products[0]
    if (!product) {
      return { ok: false, cancelled: false, message: 'product_not_found' }
    }
    await Purchases.purchaseStoreProduct(product)
    return { ok: true }
  } catch (e: unknown) {
    const userCancelled =
      typeof e === 'object' &&
      e !== null &&
      'userCancelled' in e &&
      Boolean((e as { userCancelled?: boolean }).userCancelled)
    const msg = e instanceof Error ? e.message : undefined
    return { ok: false, cancelled: userCancelled, message: msg }
  }
}

/** Tie RC customer to Supabase `auth.users.id` after configure (no-op if SDK not configured). */
export async function syncRevenueCatUser(userId: string | null): Promise<void> {
  if (!didConfigure) return
  try {
    if (userId) await Purchases.logIn(userId)
    else await Purchases.logOut()
  } catch {
    /* SDK may throw before store readiness */
  }
}
