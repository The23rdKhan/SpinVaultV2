import type { VanityRarity } from '@/lib/vanity-data'
import type { AppTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'

/** Rarity presentation derived from resolved theme (Shop / Rewards / leaderboards). */
export function rarityPresentation(
  t: AppTheme,
  rarity: VanityRarity,
): { border: string; text: string; bg: string; glow: string } {
  const base =
    rarity === 'common'
      ? t.rarity.common
      : rarity === 'rare'
        ? t.rarity.rare
        : rarity === 'epic'
          ? t.rarity.epic
          : rarity === 'legendary'
            ? t.rarity.legendary
            : t.rarity.mythic
  return {
    border: base,
    text: base,
    bg: hexWithAlpha(base, '33'),
    glow: hexWithAlpha(base, '66'),
  }
}
