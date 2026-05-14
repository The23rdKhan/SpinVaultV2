import type {
  CoinLedgerEntry,
  CoinLedgerReason,
  DailyReward,
  DailyWheelState,
  GameState,
  LeaderboardStats,
  Mission,
  ReelGrid,
  Theme,
  WinType,
} from './game-context'
import type { Trophy, UserVanity } from './vanity-data'
import { clampBetForWallet } from '@shared/slot/evaluate-spin'

/** Matches `player_saves.schema_version` / Phase 7 default. */
export const PLAYER_SAVE_SCHEMA_VERSION = 2

const CLOUD_LEDGER_CAP = 80
const RECENT_BIG_WINS_CAP = 30

const THEMES: Theme[] = ['vegas', 'cyber', 'treasure']

const LEDGER_REASONS: CoinLedgerReason[] = [
  'spin_bet',
  'spin_win',
  'bonus_meter_full',
  'daily_reward',
  'daily_wheel',
  'mission_reward',
  'level_up_bonus',
  'free_spins_bundle',
  'theme_unlock',
  'vanity_purchase',
  'cosmetic_chest',
  'iap_grant',
  'rewarded_ad',
  'starter_pack',
  'adjustment',
]

const WIN_TYPES: WinType[] = ['none', 'normal', 'bigWin', 'megaWin', 'jackpot']

function isTheme(x: unknown): x is Theme {
  return typeof x === 'string' && (THEMES as string[]).includes(x)
}

function parseThemes(arr: unknown): Theme[] | undefined {
  if (!Array.isArray(arr)) return undefined
  const out = arr.filter(isTheme)
  return out.length > 0 ? out : undefined
}

function parseDailyRewards(arr: unknown, fallback: DailyReward[]): DailyReward[] {
  if (!Array.isArray(arr) || arr.length === 0) return fallback
  const out: DailyReward[] = []
  for (const r of arr) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const day = Number(o.day)
    const coins = Number(o.coins)
    const claimed = Boolean(o.claimed)
    if (!Number.isFinite(day) || !Number.isFinite(coins)) continue
    out.push({ day, coins, claimed })
  }
  return out.length > 0 ? out : fallback
}

function parseMissions(arr: unknown, fallback: Mission[]): Mission[] {
  if (!Array.isArray(arr) || arr.length === 0) return fallback
  const out: Mission[] = []
  for (const r of arr) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : ''
    const name = typeof o.name === 'string' ? o.name : ''
    const description = typeof o.description === 'string' ? o.description : ''
    const target = Number(o.target)
    const progress = Number(o.progress)
    const reward = Number(o.reward)
    const completed = Boolean(o.completed)
    const claimed = Boolean(o.claimed)
    // xpReward may not exist in older saves — default to 0 so it's always present
    const xpReward = typeof o.xpReward === 'number' ? o.xpReward : 0
    if (!id || !Number.isFinite(target) || !Number.isFinite(progress) || !Number.isFinite(reward)) continue
    out.push({ id, name, description, target, progress, reward, xpReward, completed, claimed })
  }
  return out.length > 0 ? out : fallback
}

function parseDailyWheel(o: unknown, fallback: DailyWheelState): DailyWheelState {
  if (!o || typeof o !== 'object') return fallback
  const x = o as Record<string, unknown>
  const last =
    x.lastWheelSpinAt === null || x.lastWheelSpinAt === undefined
      ? null
      : typeof x.lastWheelSpinAt === 'string'
        ? x.lastWheelSpinAt
        : null
  const dailyWheelClaimed = Boolean(x.dailyWheelClaimed)
  const wheelReward =
    x.wheelReward === null || x.wheelReward === undefined
      ? null
      : Number(x.wheelReward)
  return {
    lastWheelSpinAt: last,
    dailyWheelClaimed,
    wheelReward: wheelReward != null && Number.isFinite(wheelReward) ? wheelReward : null,
  }
}

function parseLeaderboardStats(o: unknown, fallback: LeaderboardStats): LeaderboardStats {
  if (!o || typeof o !== 'object') return fallback
  const x = o as Record<string, unknown>
  const weeklyBiggestWin = Number(x.weeklyBiggestWin)
  const weeklyTotalWinnings = Number(x.weeklyTotalWinnings)
  const weekStartDate =
    typeof x.weekStartDate === 'string' ? x.weekStartDate : fallback.weekStartDate
  const allTimeTotalWinnings = Number(x.allTimeTotalWinnings)
  return {
    weeklyBiggestWin: Number.isFinite(weeklyBiggestWin) ? weeklyBiggestWin : fallback.weeklyBiggestWin,
    weeklyTotalWinnings: Number.isFinite(weeklyTotalWinnings)
      ? weeklyTotalWinnings
      : fallback.weeklyTotalWinnings,
    weekStartDate,
    allTimeTotalWinnings: Number.isFinite(allTimeTotalWinnings)
      ? allTimeTotalWinnings
      : fallback.allTimeTotalWinnings,
  }
}

function parseUserVanity(o: unknown, fallback: UserVanity): UserVanity {
  if (!o || typeof o !== 'object') return fallback
  const x = o as Record<string, unknown>
  const strArr = (k: string) =>
    Array.isArray(x[k]) ? (x[k] as unknown[]).filter((s): s is string => typeof s === 'string') : undefined
  return {
    ownedItemIds: strArr('ownedItemIds') ?? fallback.ownedItemIds,
    equippedAvatarId:
      typeof x.equippedAvatarId === 'string' ? x.equippedAvatarId : fallback.equippedAvatarId,
    equippedFrameId:
      typeof x.equippedFrameId === 'string' ? x.equippedFrameId : fallback.equippedFrameId,
    equippedTitleId:
      typeof x.equippedTitleId === 'string' ? x.equippedTitleId : fallback.equippedTitleId,
    equippedPetId: typeof x.equippedPetId === 'string' ? x.equippedPetId : fallback.equippedPetId,
    equippedCabinetId:
      typeof x.equippedCabinetId === 'string' ? x.equippedCabinetId : fallback.equippedCabinetId,
    featuredCarId: typeof x.featuredCarId === 'string' ? x.featuredCarId : fallback.featuredCarId,
    featuredRoomId:
      typeof x.featuredRoomId === 'string' ? x.featuredRoomId : fallback.featuredRoomId,
    trophyIds: strArr('trophyIds') ?? fallback.trophyIds,
  }
}

function parseTrophies(arr: unknown, fallback: Trophy[]): Trophy[] {
  if (!Array.isArray(arr) || arr.length === 0) return fallback
  const out: Trophy[] = []
  for (const r of arr) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : ''
    const name = typeof o.name === 'string' ? o.name : ''
    const description = typeof o.description === 'string' ? o.description : ''
    const icon = typeof o.icon === 'string' ? o.icon : ''
    const unlocked = Boolean(o.unlocked)
    const unlockedAt = typeof o.unlockedAt === 'string' ? o.unlockedAt : undefined
    if (!id) continue
    out.push({ id, name, description, icon, unlocked, unlockedAt })
  }
  return out.length > 0 ? out : fallback
}

function parseCoinLedger(arr: unknown): CoinLedgerEntry[] | undefined {
  if (!Array.isArray(arr)) return undefined
  const out: CoinLedgerEntry[] = []
  for (const r of arr) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : ''
    const ts = typeof o.ts === 'string' ? o.ts : new Date().toISOString()
    const delta = Number(o.delta)
    const balanceAfter = Number(o.balanceAfter)
    const reason = o.reason
    const label = typeof o.label === 'string' ? o.label : ''
    if (
      !id ||
      !Number.isFinite(delta) ||
      !Number.isFinite(balanceAfter) ||
      typeof reason !== 'string' ||
      !(LEDGER_REASONS as string[]).includes(reason)
    ) {
      continue
    }
    out.push({
      id,
      ts,
      delta,
      balanceAfter,
      reason: reason as CoinLedgerReason,
      label,
    })
  }
  return out.length > 0 ? out : undefined
}

function parseRecentBigWins(arr: unknown): GameState['recentBigWins'] {
  if (!Array.isArray(arr)) return []
  const out: GameState['recentBigWins'] = []
  for (const r of arr) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const amount = Number(o.amount)
    const multiplier = Number(o.multiplier)
    const timestamp = typeof o.timestamp === 'string' ? o.timestamp : new Date().toISOString()
    const wt = o.type
    const type: WinType =
      typeof wt === 'string' && (WIN_TYPES as string[]).includes(wt) ? (wt as WinType) : 'normal'
    if (!Number.isFinite(amount) || !Number.isFinite(multiplier)) continue
    out.push({ amount, multiplier, timestamp, type })
    if (out.length >= RECENT_BIG_WINS_CAP) break
  }
  return out
}

/** Serializable subset for `player_saves.payload` (jsonb object). */
export function buildPlayerSavePayload(state: GameState): Record<string, unknown> {
  return {
    v: PLAYER_SAVE_SCHEMA_VERSION,
    currentTheme: state.currentTheme,
    ownedThemes: state.ownedThemes,
    currentBet: state.currentBet,
    coins: state.coins,
    freeSpins: state.freeSpins,
    bonusProgress: state.bonusProgress,
    dailyStreak: state.dailyStreak,
    dailyRewards: state.dailyRewards,
    lastClaimDate: state.lastClaimDate,
    dailyWheel: state.dailyWheel,
    missions: state.missions,
    soundEnabled: state.soundEnabled,
    musicEnabled: state.musicEnabled,
    hapticsEnabled: state.hapticsEnabled,
    notificationsEnabled: state.notificationsEnabled,
    sessionReminderMinutes: state.sessionReminderMinutes,
    dailyPurchaseLimit: state.dailyPurchaseLimit,
    cooldownEnabled: state.cooldownEnabled,
    username: state.username,
    level: state.level,
    xp: state.xp,
    totalSpins: state.totalSpins,
    spinSequence: state.spinSequence,
    biggestWin: state.biggestWin,
    totalWins: state.totalWins,
    maxBetUsed: state.maxBetUsed,
    totalIapSpent: state.totalIapSpent,
    monthlySpins: state.monthlySpins,
    monthlySpinsMonth: state.monthlySpinsMonth,
    userVanity: state.userVanity,
    trophies: state.trophies,
    leaderboardStats: state.leaderboardStats,
    recentBigWins: state.recentBigWins.slice(0, RECENT_BIG_WINS_CAP),
    coinLedger: state.coinLedger.slice(0, CLOUD_LEDGER_CAP),
  }
}

function lobbySafePatch(createFreshGrid: () => ReelGrid): Partial<GameState> {
  return {
    reelGrid: createFreshGrid(),
    isSpinning: false,
    activeSpinIsFree: false,
    reelsLocked: false,
    lastWin: 0,
    winMultiplier: 0,
    lastWinType: 'none',
    winningLines: [],
    winningPositions: new Set(),
    lastSpinFreeSpinsWon: 0,
    isJackpotMode: false,
    jackpotMultiplier: 1,
    lastBonusMeterPayout: 0,
    lastScatterPayout: 0,
    lastScatterCount: 0,
    spinSyncDeferred: false,
  }
}

export interface ApplyCloudPlayerSaveOptions {
  createFreshGrid: () => ReelGrid
  fallbackDailyRewards: DailyReward[]
  fallbackMissions: Mission[]
  fallbackDailyWheel: DailyWheelState
  fallbackUserVanity: UserVanity
  fallbackTrophies: Trophy[]
  fallbackLeaderboard: LeaderboardStats
}

/**
 * Maps `player_saves.payload` into state fields + always applies a safe lobby (no mid-spin UI).
 * Wallet fields from JSON are overwritten by `resyncWalletFromServer` when online.
 */
export function applyCloudPlayerSave(
  payload: unknown,
  opt: ApplyCloudPlayerSaveOptions,
): { patch: Partial<GameState>; hadMeaningfulPayload: boolean } {
  const lobby = lobbySafePatch(opt.createFreshGrid)

  if (payload == null || typeof payload !== 'object') {
    return { patch: lobby, hadMeaningfulPayload: false }
  }

  const o = payload as Record<string, unknown>
  if (Object.keys(o).length === 0) {
    return { patch: lobby, hadMeaningfulPayload: false }
  }

  const owned = parseThemes(o.ownedThemes)
  const theme = isTheme(o.currentTheme) ? o.currentTheme : undefined

  const coins = Number(o.coins)
  const freeSpins = Number(o.freeSpins)
  const bonusProgress = Number(o.bonusProgress)
  const currentBet = Number(o.currentBet)
  const dailyStreak = Number(o.dailyStreak)
  const level = Number(o.level)
  const xp = Number(o.xp)
  const totalSpins = Number(o.totalSpins)
  const spinSequence = Number(o.spinSequence)
  const biggestWin = Number(o.biggestWin)
  const totalWins = Number(o.totalWins)

  const ledger = parseCoinLedger(o.coinLedger)

  const data: Partial<GameState> = {
    ...(theme != null ? { currentTheme: theme } : {}),
    ...(owned != null ? { ownedThemes: owned } : {}),
    ...(Number.isFinite(currentBet) && currentBet > 0
      ? {
          // Same rules as runtime `setBet` / wallet sync (`clampBetForWallet` in evaluate-spin).
          currentBet: clampBetForWallet(
            Math.round(currentBet),
            Number.isFinite(coins) ? coins : 0,
            Number.isFinite(freeSpins) && freeSpins >= 0 ? Math.trunc(freeSpins) : 0,
          ),
        }
      : {}),
    ...(Number.isFinite(coins) ? { coins } : {}),
    ...(Number.isFinite(freeSpins) && freeSpins >= 0 ? { freeSpins } : {}),
    ...(Number.isFinite(bonusProgress) ? { bonusProgress } : {}),
    ...(Number.isFinite(dailyStreak) && dailyStreak >= 0 ? { dailyStreak } : {}),
    dailyRewards: parseDailyRewards(o.dailyRewards, opt.fallbackDailyRewards),
    ...(Object.prototype.hasOwnProperty.call(o, 'lastClaimDate')
      ? o.lastClaimDate === null
        ? { lastClaimDate: null }
        : typeof o.lastClaimDate === 'string'
          ? { lastClaimDate: o.lastClaimDate }
          : {}
      : {}),
    dailyWheel: parseDailyWheel(o.dailyWheel, opt.fallbackDailyWheel),
    missions: parseMissions(o.missions, opt.fallbackMissions),
    soundEnabled: typeof o.soundEnabled === 'boolean' ? o.soundEnabled : undefined,
    musicEnabled: typeof o.musicEnabled === 'boolean' ? o.musicEnabled : undefined,
    hapticsEnabled: typeof o.hapticsEnabled === 'boolean' ? o.hapticsEnabled : undefined,
    notificationsEnabled:
      typeof o.notificationsEnabled === 'boolean' ? o.notificationsEnabled : undefined,
    ...(Object.prototype.hasOwnProperty.call(o, 'sessionReminderMinutes')
      ? o.sessionReminderMinutes === null
        ? { sessionReminderMinutes: null }
        : Number.isFinite(Number(o.sessionReminderMinutes))
          ? { sessionReminderMinutes: Number(o.sessionReminderMinutes) }
          : {}
      : {}),
    ...(Object.prototype.hasOwnProperty.call(o, 'dailyPurchaseLimit')
      ? o.dailyPurchaseLimit === null
        ? { dailyPurchaseLimit: null }
        : Number.isFinite(Number(o.dailyPurchaseLimit))
          ? { dailyPurchaseLimit: Number(o.dailyPurchaseLimit) }
          : {}
      : {}),
    cooldownEnabled: typeof o.cooldownEnabled === 'boolean' ? o.cooldownEnabled : undefined,
    username: typeof o.username === 'string' ? o.username : undefined,
    ...(Number.isFinite(level) && level >= 1 ? { level } : {}),
    ...(Number.isFinite(xp) && xp >= 0 ? { xp } : {}),
    ...(Number.isFinite(totalSpins) && totalSpins >= 0 ? { totalSpins } : {}),
    ...(Number.isFinite(spinSequence) && spinSequence >= 0 ? { spinSequence } : {}),
    ...(Number.isFinite(biggestWin) && biggestWin >= 0 ? { biggestWin } : {}),
    ...(Number.isFinite(totalWins) && totalWins >= 0 ? { totalWins } : {}),
    maxBetUsed: typeof o.maxBetUsed === 'boolean' ? o.maxBetUsed : undefined,
    ...(Number.isFinite(Number(o.totalIapSpent)) && Number(o.totalIapSpent) >= 0
      ? { totalIapSpent: Math.round(Number(o.totalIapSpent) * 100) / 100 }
      : {}),
    ...(Number.isFinite(Number(o.monthlySpins)) && Number(o.monthlySpins) >= 0
      ? { monthlySpins: Number(o.monthlySpins) }
      : {}),
    ...(typeof o.monthlySpinsMonth === 'string' ? { monthlySpinsMonth: o.monthlySpinsMonth } : {}),
    userVanity: parseUserVanity(o.userVanity, opt.fallbackUserVanity),
    trophies: parseTrophies(o.trophies, opt.fallbackTrophies),
    leaderboardStats: parseLeaderboardStats(o.leaderboardStats, opt.fallbackLeaderboard),
    recentBigWins: parseRecentBigWins(o.recentBigWins),
    ...(ledger != null ? { coinLedger: ledger } : {}),
  }

  const patch: Partial<GameState> = { ...lobby }
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      ;(patch as Record<string, unknown>)[k] = v
    }
  }

  const hadMeaningfulPayload = Object.keys(o).length > 0

  return { patch, hadMeaningfulPayload }
}
