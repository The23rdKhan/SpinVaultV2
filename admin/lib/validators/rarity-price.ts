import type { z } from "zod";

import type { raritySchema } from "@/lib/schemas/content";

export type Rarity = z.infer<typeof raritySchema>;

/** Soft bands for virtual coin pricing ([§D.3]). */
export const RARITY_PRICE_BANDS: Record<
  Rarity,
  { min: number; max: number }
> = {
  common: { min: 0, max: 5000 },
  rare: { min: 1000, max: 25000 },
  epic: { min: 5000, max: 75000 },
  legendary: { min: 15000, max: 150000 },
  mythic: { min: 50000, max: 500000 },
};

export type PriceGuardResult =
  | { ok: true }
  | { ok: false; message: string; scr: string };

/**
 * Warn/block helper — hard-block outside ±50% of band ([§D.3], economy hygiene).
 */
export function guardPriceForRarity(
  rarity: Rarity,
  priceCoins: number | null | undefined,
): PriceGuardResult {
  if (priceCoins == null) {
    return { ok: true };
  }
  const band = RARITY_PRICE_BANDS[rarity];
  const minHard = Math.floor(band.min * 0.5);
  const maxHard = Math.ceil(band.max * 1.5);
  if (priceCoins < minHard || priceCoins > maxHard) {
    return {
      ok: false,
      message: `price_coins ${priceCoins} is outside allowed band for ${rarity} (${minHard}–${maxHard} hard limits).`,
      scr: "SCR-economy",
    };
  }
  return { ok: true };
}
