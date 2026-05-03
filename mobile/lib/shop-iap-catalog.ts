/**
 * Display + SKU ids aligned with `public.products.sku` (Supabase) and store / RevenueCat.
 * @see supabase/migrations/*_iap_product_catalog*.sql
 */
export type ShopCoinPackRow = {
  id: string
  coins: number
  priceLabel: string
  popular: boolean
  subtitle: string
}

export const SHOP_COIN_PACKS: ShopCoinPackRow[] = [
  { id: 'quick_refill', coins: 2500, priceLabel: '$0.99', popular: false, subtitle: 'Quick Refill' },
  { id: 'basic', coins: 15000, priceLabel: '$4.99', popular: false, subtitle: 'Good Deal' },
  { id: 'popular', coins: 40000, priceLabel: '$9.99', popular: true, subtitle: 'Most Popular' },
  { id: 'premium', coins: 125000, priceLabel: '$24.99', popular: false, subtitle: 'Best Value' },
  { id: 'ultimate', coins: 350000, priceLabel: '$49.99', popular: false, subtitle: 'High Roller' },
  { id: 'mega_vault', coins: 1000000, priceLabel: '$99.99', popular: false, subtitle: 'VIP Choice' },
]

/** Store / DB SKU for the starter bundle — same string everywhere (analytics, RC, simulated IAP). */
export const STARTER_BUNDLE_SKU = 'starter_bundle' as const

/** Matches `starter_bundle` row in DB — keep in sync for simulated IAP + analytics. */
export const STARTER_BUNDLE_GRANT = {
  coins: 25_000,
  freeSpins: 25,
  frameVanityId: 'frame-gold' as const,
} as const
