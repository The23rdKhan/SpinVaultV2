import { CATALOG_DISCLOSURES } from "@/lib/legal/catalog-disclosures";

export type CatalogContentRow = {
  id: string;
  slug: string;
  category: string;
  display_name: string;
  rarity: string;
  price_coins: number | null;
  preview_image_url: string | null;
  thumbnail_url: string | null;
  full_image_url: string | null;
  store_copy?: Record<string, unknown> | null;
  theme_items?:
    | {
        theme_slug: string;
        tokens_dark: Record<string, string>;
        tokens_light: Record<string, string>;
      }
    | null;
  collectible_items?: { equip_slot: string } | null;
};

export type CatalogPayload = {
  catalogVersion: number;
  builtAt: string;
  disclosures: typeof CATALOG_DISCLOSURES;
  themes: Array<Record<string, unknown>>;
  collectibles: Array<Record<string, unknown>>;
  chests: unknown[];
  events: unknown[];
  featureFlags: Record<string, boolean>;
};

/**
 * Pure builder — kept deterministic for SHA256 snapshots ([§N.1], [§L.6]).
 */
export function buildCatalogPayload(
  rows: CatalogContentRow[],
  version: number,
  builtAt: string,
): CatalogPayload {
  const themes = rows
    .filter((r) => r.category === "theme")
    .map((r) => ({
      slug: r.slug,
      name: r.display_name,
      rarity: r.rarity,
      priceCoins: r.price_coins,
      previewUrl: r.preview_image_url,
      thumbUrl: r.thumbnail_url,
      heroUrl: r.full_image_url,
      storeCopy: r.store_copy ?? {},
      tokens: r.theme_items
        ? {
            dark: r.theme_items.tokens_dark,
            light: r.theme_items.tokens_light,
          }
        : { dark: {}, light: {} },
    }));

  const collectibles = rows
    .filter((r) => r.category !== "theme")
    .map((r) => ({
      slug: r.slug,
      category: r.category,
      name: r.display_name,
      rarity: r.rarity,
      priceCoins: r.price_coins,
      previewUrl: r.preview_image_url,
      thumbUrl: r.thumbnail_url,
      heroUrl: r.full_image_url,
      storeCopy: r.store_copy ?? {},
      equipSlot: r.collectible_items?.equip_slot ?? "none",
    }));

  return {
    catalogVersion: version,
    builtAt,
    disclosures: CATALOG_DISCLOSURES,
    themes,
    collectibles,
    chests: [],
    events: [],
    featureFlags: {},
  };
}
