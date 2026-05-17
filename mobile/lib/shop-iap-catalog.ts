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
  /** Renders a premium gold "HIGH ROLLER" badge; use for the top-tier pack. */
  featured?: boolean
  subtitle: string
  /** Short copy shown below the subtitle explaining what bet tiers this pack unlocks. */
  unlockHint?: string
  /** Runtime-rendered benefits. Keep prices out of artwork. */
  displayDetails: string[]
  /**
   * Base USD price used to record IAP spend for LTV tracking and tournament eligibility.
   * Keep in sync with App Store Connect pricing metadata.
   */
  priceUsd: number
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
    priceUsd: 0.99,
    popular: false,
    subtitle: 'Quick Refill',
    displayDetails: ['2,500 Vault Coins'],
    artwork: require('@/assets/store/quick-refill-card.png'),
  },
  {
    id: 'com.spinvault.deal.daily',
    title: 'Daily Deal',
    coins: 20000,
    freeSpins: 10,
    kind: 'bundle',
    priceLabelFallback: '$4.99',
    priceUsd: 4.99,
    popular: false,
    subtitle: 'Today only',
    displayDetails: ['20,000 Vault Coins', '+10 Free Spins'],
    artwork: require('@/assets/store/daily-deal-card.png'),
  },
  {
    id: 'com.spinvault.coins.basic',
    title: 'Basic Pack',
    coins: 15000,
    freeSpins: 5,
    kind: 'coin_pack',
    priceLabelFallback: '$4.99',
    priceUsd: 4.99,
    popular: false,
    subtitle: 'Good Deal',
    displayDetails: ['15,000 Vault Coins', '+5 Free Spins'],
    artwork: require('@/assets/store/basic-pack-card.png'),
  },
  {
    id: 'com.spinvault.spins.lucky_bundle',
    title: 'Lucky Spin Bundle',
    coins: 0,
    freeSpins: 50,
    kind: 'bundle',
    priceLabelFallback: '$4.99',
    priceUsd: 4.99,
    popular: false,
    subtitle: 'Spin boost',
    displayDetails: ['50 Free Spins'],
    // TODO: Regenerate artwork if it continues to show "Bonus Vault Coins"; this SKU grants spins only.
    artwork: require('@/assets/store/lucky-spin-bundle-card.png'),
  },
  {
    id: 'com.spinvault.coins.popular',
    title: 'Popular Pack',
    coins: 40000,
    freeSpins: 15,
    kind: 'coin_pack',
    priceLabelFallback: '$9.99',
    priceUsd: 9.99,
    popular: true,
    subtitle: 'Most Popular',
    displayDetails: ['40,000 Vault Coins', '+15 Free Spins'],
    artwork: require('@/assets/store/popular-pack-card.png'),
  },
  {
    id: 'com.spinvault.coins.premium',
    title: 'Premium Pack',
    coins: 125000,
    freeSpins: 40,
    kind: 'coin_pack',
    priceLabelFallback: '$24.99',
    priceUsd: 24.99,
    popular: false,
    subtitle: 'Best Value',
    displayDetails: ['125,000 Vault Coins', '+40 Free Spins'],
    artwork: require('@/assets/store/premium-pack-card.png'),
  },
  {
    id: 'com.spinvault.coins.ultimate',
    title: 'Ultimate Pack',
    coins: 350000,
    freeSpins: 100,
    kind: 'coin_pack',
    priceLabelFallback: '$49.99',
    priceUsd: 49.99,
    popular: false,
    subtitle: 'High Roller',
    unlockHint: 'Unlocks higher line bets',
    displayDetails: ['350,000 Vault Coins', '+100 Free Spins'],
    artwork: require('@/assets/store/ultimate-pack-card.png'),
  },
  {
    id: 'com.spinvault.coins.mega_vault',
    title: 'Mega Vault',
    coins: 1000000,
    freeSpins: 250,
    kind: 'coin_pack',
    priceLabelFallback: '$99.99',
    priceUsd: 99.99,
    popular: false,
    featured: true,
    subtitle: 'VIP Bonus',
    unlockHint: 'Unlocks top line bets',
    displayDetails: ['1,000,000 Vault Coins', '+250 Free Spins', 'VIP Bonus'],
    artwork: require('@/assets/store/mega-vault-card.png'),
  },
]

/** Store / DB SKU for the starter bundle — same string everywhere (analytics, RC, simulated IAP). */
export const STARTER_BUNDLE_SKU = 'com.spinvault.bundle.starter' as const

/**
 * Button / UI fallback before `Purchases.getProducts` returns localized `priceString`.
 * Update when the starter bundle’s base price in App Store Connect changes.
 */
export const STARTER_BUNDLE_PRICE_FALLBACK = '$1.99' as const

export const STARTER_BUNDLE_ARTWORK = require('@/assets/store/starter-bundle-card.png')

export const STARTER_BUNDLE_DETAILS = [
  '25,000 Vault Coins',
  '+25 Free Spins',
  '+Starter Frame',
] as const

/** Matches `com.spinvault.bundle.starter` row in DB — keep in sync for simulated IAP + analytics. */
export const STARTER_BUNDLE_GRANT = {
  coins: 25_000,
  freeSpins: 25,
  frameVanityId: 'frame-gold' as const,
} as const
