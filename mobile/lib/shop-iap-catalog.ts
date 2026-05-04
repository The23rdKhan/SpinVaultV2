import type { ImageSourcePropType } from 'react-native'

/**
 * Display + SKU ids aligned with `public.products.sku` (Supabase), App Store, and RevenueCat.
 * @see supabase/migrations/20260504120000_iap_products_app_store_sku.sql
 */
export type ShopCoinPackRow = {
  id: string
  title: string
  coins: number
  freeSpins: number
  kind: 'coin_pack' | 'bundle'
  /**
   * Shown until `Purchases.getProducts` provides `priceString` (offline, web, or store not ready).
   * When changing base prices in App Store Connect, update this fallback to match.
   */
  priceLabelFallback: string
  popular: boolean
  subtitle: string
  artwork: ImageSourcePropType
}

export const SHOP_COIN_PACKS: ShopCoinPackRow[] = [
  {
    id: 'com.spinvault.coins.quick_refill',
    title: 'Quick Refill',
    coins: 2500,
    freeSpins: 0,
    kind: 'coin_pack',
    priceLabelFallback: '$0.99',
    popular: false,
    subtitle: 'Quick Refill',
    artwork: require('@/assets/images/store-offers/quick_refill.png'),
  },
  {
    id: 'com.spinvault.deal.daily',
    title: 'Daily Deal',
    coins: 20000,
    freeSpins: 10,
    kind: 'bundle',
    priceLabelFallback: '$4.99',
    popular: false,
    subtitle: 'Today only',
    artwork: require('@/assets/images/store-offers/daily_deal.png'),
  },
  {
    id: 'com.spinvault.coins.basic',
    title: 'Basic Pack',
    coins: 15000,
    freeSpins: 5,
    kind: 'coin_pack',
    priceLabelFallback: '$4.99',
    popular: false,
    subtitle: 'Good Deal',
    artwork: require('@/assets/images/store-offers/basic.png'),
  },
  {
    id: 'com.spinvault.spins.lucky_bundle',
    title: 'Lucky Spin Bundle',
    coins: 0,
    freeSpins: 50,
    kind: 'bundle',
    priceLabelFallback: '$4.99',
    popular: false,
    subtitle: 'Spin boost',
    artwork: require('@/assets/images/store-offers/lucky_spin_bundle.png'),
  },
  {
    id: 'com.spinvault.coins.popular',
    title: 'Popular Pack',
    coins: 40000,
    freeSpins: 15,
    kind: 'coin_pack',
    priceLabelFallback: '$9.99',
    popular: true,
    subtitle: 'Most Popular',
    artwork: require('@/assets/images/store-offers/popular.png'),
  },
  {
    id: 'com.spinvault.coins.premium',
    title: 'Premium Pack',
    coins: 125000,
    freeSpins: 40,
    kind: 'coin_pack',
    priceLabelFallback: '$24.99',
    popular: false,
    subtitle: 'Best Value',
    artwork: require('@/assets/images/store-offers/premium.png'),
  },
  {
    id: 'com.spinvault.coins.ultimate',
    title: 'Ultimate Pack',
    coins: 350000,
    freeSpins: 100,
    kind: 'coin_pack',
    priceLabelFallback: '$49.99',
    popular: false,
    subtitle: 'High Roller',
    artwork: require('@/assets/images/store-offers/ultimate.png'),
  },
  {
    id: 'com.spinvault.coins.mega_vault',
    title: 'Mega Vault',
    coins: 1000000,
    freeSpins: 250,
    kind: 'coin_pack',
    priceLabelFallback: '$99.99',
    popular: false,
    subtitle: 'VIP Choice',
    artwork: require('@/assets/images/store-offers/mega_vault.png'),
  },
]

/** Store / DB SKU for the starter bundle — same string everywhere (analytics, RC, simulated IAP). */
export const STARTER_BUNDLE_SKU = 'com.spinvault.bundle.starter' as const

/**
 * Button / UI fallback before `Purchases.getProducts` returns localized `priceString`.
 * Update when the starter bundle’s base price in App Store Connect changes.
 */
export const STARTER_BUNDLE_PRICE_FALLBACK = '$1.99' as const

export const STARTER_BUNDLE_ARTWORK = require('@/assets/images/store-offers/starter_bundle.png')

/** Matches `com.spinvault.bundle.starter` row in DB — keep in sync for simulated IAP + analytics. */
export const STARTER_BUNDLE_GRANT = {
  coins: 25_000,
  freeSpins: 25,
  frameVanityId: 'frame-gold' as const,
} as const
