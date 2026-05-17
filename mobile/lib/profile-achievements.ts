/**
 * Static achievement definitions + progress — keep in sync with web
 * `components/profile/profile-page.tsx` achievement list.
 */

export type ProfileAchievementIconId =
  | 'target'
  | 'trending'
  | 'trophy'
  | 'sparkles'
  | 'flame'
  | 'coins'

export interface ProfileAchievementDefinition {
  id: string
  name: string
  description: string
  icon: ProfileAchievementIconId
}

export const PROFILE_ACHIEVEMENT_DEFINITIONS: ProfileAchievementDefinition[] = [
  {
    id: 'first-spin',
    name: 'First Spin',
    description: 'Complete your first spin',
    icon: 'target',
  },
  {
    id: 'high-roller',
    name: 'High Roller',
    description: 'Spin 100 times',
    icon: 'trending',
  },
  {
    id: 'big-winner',
    name: 'Big Winner',
    description: 'Best spin of 1,000+ Vault Coins',
    icon: 'trophy',
  },
  {
    id: 'collector',
    name: 'Collector',
    description: 'Own all 3 themes',
    icon: 'sparkles',
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: '7 day login streak',
    icon: 'flame',
  },
  {
    id: 'millionaire',
    name: 'Millionaire',
    description: 'Hold 100,000+ Vault Coins',
    icon: 'coins',
  },
]

export interface ProfileAchievementProgress extends ProfileAchievementDefinition {
  unlocked: boolean
  progress: number
  target: number
}

export function getProfileAchievementProgress(input: {
  totalSpins: number
  biggestWin: number
  ownedThemesLength: number
  dailyStreak: number
  coins: number
}): ProfileAchievementProgress[] {
  const { totalSpins, biggestWin, ownedThemesLength, dailyStreak, coins } = input

  return PROFILE_ACHIEVEMENT_DEFINITIONS.map((def) => {
    switch (def.id) {
      case 'first-spin':
        return {
          ...def,
          unlocked: totalSpins >= 1,
          progress: Math.min(totalSpins, 1),
          target: 1,
        }
      case 'high-roller':
        return {
          ...def,
          unlocked: totalSpins >= 100,
          progress: Math.min(totalSpins, 100),
          target: 100,
        }
      case 'big-winner':
        return {
          ...def,
          unlocked: biggestWin >= 1000,
          progress: Math.min(biggestWin, 1000),
          target: 1000,
        }
      case 'collector':
        return {
          ...def,
          unlocked: ownedThemesLength >= 3,
          progress: ownedThemesLength,
          target: 3,
        }
      case 'dedicated':
        return {
          ...def,
          unlocked: dailyStreak >= 7,
          progress: Math.min(dailyStreak, 7),
          target: 7,
        }
      case 'millionaire':
        return {
          ...def,
          unlocked: coins >= 100_000,
          progress: Math.min(coins, 100_000),
          target: 100_000,
        }
      default:
        return { ...def, unlocked: false, progress: 0, target: 1 }
    }
  })
}
