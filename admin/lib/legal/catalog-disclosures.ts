/**
 * Immutable disclosure strings injected into catalog payloads ([§J.5], SCR refs).
 * Admins cannot edit these in-dashboard for MVP.
 */
export const CATALOG_DISCLOSURES = {
  virtualCoinsOnly: "Virtual coins only. No cash value.", // SCR-1
  noRedemption:
    "Coins and items cannot be redeemed, withdrawn, sold, traded, transferred, or exchanged.", // SCR-2
  cosmeticOnly:
    "Themes and collectibles are cosmetic only and do not affect odds, payouts, jackpot frequency, or game math.", // SCR-3, SCR-4
  coinsNoExpire: "Purchased coins do not expire.", // SCR-6
  purchasesProcessedByStores:
    "All purchases are processed by the App Store / Google Play.", // SCR-9
  dropRatesPlaceholder:
    "Drop rates: see in-app chest disclosure table when applicable.", // SCR-5 (MVP stub — chest tables V1.1)
} as const;
