import { z } from "zod";

import { MACHINE_OVERRIDE_KEYS, type MachineOverrideKey } from "@/lib/constants/theme-tokens";

export const raritySchema = z.enum([
  "common",
  "rare",
  "epic",
  "legendary",
  "mythic",
]);

export const contentCategorySchema = z.enum([
  "theme",
  "collectible",
  "avatar",
  "frame",
  "badge",
  "title",
  "pet",
  "cabinet",
  "room",
  "car",
  "chest_drop",
  "seasonal_bundle",
]);

export const equipSlotSchema = z.enum([
  "avatar",
  "frame",
  "badge",
  "title",
  "pet",
  "cabinet_skin",
  "room_bg",
  "car",
  "none",
]);

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/, {
  message: "Expected #RGB or #RRGGBB or #RRGGBBAA",
});

const machineTokenShape = Object.fromEntries(
  MACHINE_OVERRIDE_KEYS.map((k) => [k, hexColor]),
) as Record<MachineOverrideKey, typeof hexColor>;

export const machineTokensSchema = z.object(machineTokenShape);

const emptyStoreCopy = {
  tagline: "",
  shortDescription: "",
  longDescription: "",
} as const;

export const storeCopySchema = z.object({
  tagline: z.string().max(40).optional().default(""),
  shortDescription: z.string().max(80).optional().default(""),
  longDescription: z.string().max(200).optional().default(""),
});

export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug must be lowercase kebab-case",
  });

export const createThemeSchema = z.object({
  slug: slugSchema,
  displayName: z.string().min(1).max(32),
  description: z.string().max(500).optional().default(""),
  storeCopy: storeCopySchema.default(emptyStoreCopy),
  rarity: raritySchema.default("common"),
  priceCoins: z.coerce.number().int().min(0).nullable().optional(),
  tokensDark: machineTokensSchema.optional(),
  tokensLight: machineTokensSchema.optional(),
});

export const collectibleCategorySchema = contentCategorySchema.exclude(["theme"], {
  message: "Use the Themes workflow for machine skins",
});

export const createCollectibleSchema = z.object({
  slug: slugSchema,
  displayName: z.string().min(1).max(32),
  description: z.string().max(500).optional().default(""),
  category: collectibleCategorySchema,
  equipSlot: equipSlotSchema.default("none"),
  storeCopy: storeCopySchema.default(emptyStoreCopy),
  rarity: raritySchema.default("common"),
  priceCoins: z.coerce.number().int().min(0).nullable().optional(),
});

export const updateContentItemSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(32).optional(),
  description: z.string().max(500).nullable().optional(),
  storeCopy: storeCopySchema.optional(),
  rarity: raritySchema.optional(),
  priceCoins: z.coerce.number().int().min(0).nullable().optional(),
  previewImageUrl: z.string().url().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  fullImageUrl: z.string().url().nullable().optional(),
});

export const updateThemeTokensSchema = z.object({
  contentItemId: z.string().uuid(),
  tokensDark: machineTokensSchema,
  tokensLight: machineTokensSchema,
});
