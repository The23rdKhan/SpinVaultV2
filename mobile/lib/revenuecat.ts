import { Platform } from 'react-native'
import Purchases from 'react-native-purchases'
import { track } from '@/lib/analytics/track'
import { AnalyticsEvents } from '@shared/analytics/event-names'

let didConfigure = false
let configurePromise: Promise<void> | null = null

export type ConsumablePurchaseResult =
  | { ok: true }
  | { ok: false; cancelled: boolean; message?: string }

/** `message` on `purchaseConsumableSku` when the SDK is not configured — use to fall back to simulated grants. */
export const PURCHASE_ERR_REVENUECAT_NOT_READY = 'revenuecat_not_configured' as const

function platformApiKey(): string | undefined {
  const appleKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?.trim()
  const googleKey = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?.trim()
  if (Platform.OS === 'ios') return appleKey
  if (Platform.OS === 'android') return googleKey
  return undefined
}

/** Sync check for UI copy only — true when an `.env` key exists for the current platform. */
export function hasRevenueCatPlatformApiKey(): boolean {
  return Boolean(platformApiKey())
}

/**
 * Ensures the native SDK is configured once. After Metro Fast Refresh, JS state resets but the
 * native Purchases singleton remains; we skip a second `configure` when `isConfigured()` is true.
 */
export async function ensureRevenueCatConfigured(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return
  const apiKey = platformApiKey()
  if (!apiKey) return

  if (!configurePromise) {
    configurePromise = (async () => {
      const already = await Purchases.isConfigured()
      if (already) {
        didConfigure = true
        return
      }
      Purchases.configure({ apiKey })
      didConfigure = true
    })()
  }
  try {
    await configurePromise
  } catch (e) {
    configurePromise = null
    didConfigure = false
    throw e
  }
}

function initRevenueCatSilently(): void {
  void ensureRevenueCatConfigured().catch(() => {
    /* native module / bridge errors; avoid unhandled rejection from root layout */
  })
}

/**
 * Fire-and-forget SDK setup from the root layout. Prefer `ensureRevenueCatConfigured()` before IAP.
 */
export function initRevenueCat(): void {
  initRevenueCatSilently()
}

/** True after the SDK is ready with a valid platform API key (including native already-configured). */
export function isRevenueCatConfigured(): boolean {
  return didConfigure
}

/**
 * Fetches App Store / Play localized price strings for consumable SKUs (`priceString` per product).
 * Missing SKUs are omitted — **caller should fall back** to catalog placeholders.
 * No-op on web or when the SDK is not configured.
 * Apple typically allows on the order of ~100 product IDs per `getProducts` call; chunk if the catalog grows.
 */
export async function fetchLocalizedPricesForSkus(skus: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  const ids = [...new Set(skus.map((s) => s.trim()).filter(Boolean))]
  if (ids.length === 0) return out
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return out
  try {
    await ensureRevenueCatConfigured()
  } catch {
    return out
  }
  if (!didConfigure) return out
  try {
    const products = await Purchases.getProducts(ids, Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION)
    for (const p of products) {
      if (p.identifier && p.priceString) out[p.identifier] = p.priceString
    }
    if (ids.length > 0 && Object.keys(out).length === 0) {
      if (__DEV__) {
        console.warn(
          '[RevenueCat] getProducts returned no price strings for',
          ids.length,
          'requested non-subscription product id(s). Check App Store / Play + RevenueCat product setup.',
        )
      }
      track(AnalyticsEvents.IAP_STORE_PRICES_EMPTY, {
        requested_count: ids.length,
        returned_count: 0,
      })
    }
  } catch {
    return out
  }
  return out
}

/**
 * Purchase a consumable / non-subscription SKU already configured in RevenueCat + stores.
 * Product identifier must match `public.products.sku` for webhook fulfillment.
 */
export async function purchaseConsumableSku(sku: string): Promise<ConsumablePurchaseResult> {
  try {
    await ensureRevenueCatConfigured()
  } catch {
    return { ok: false, cancelled: false, message: PURCHASE_ERR_REVENUECAT_NOT_READY }
  }
  if (!didConfigure) {
    return { ok: false, cancelled: false, message: PURCHASE_ERR_REVENUECAT_NOT_READY }
  }
  const trimmed = sku.trim()
  if (!trimmed) {
    return { ok: false, cancelled: false, message: 'missing_sku' }
  }
  try {
    const products = await Purchases.getProducts(
      [trimmed],
      Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    )
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
  try {
    await ensureRevenueCatConfigured()
  } catch {
    return
  }
  if (!didConfigure) return
  try {
    if (userId) await Purchases.logIn(userId)
    else await Purchases.logOut()
  } catch {
    /* SDK may throw before store readiness */
  }
}
