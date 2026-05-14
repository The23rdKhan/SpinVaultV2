import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'
import Toast from 'react-native-toast-message'
import { getSupabase } from '@/lib/supabase'
import {
  isServerEconomyEnabled,
  requestBuyTheme,
  requestClaimDailyReward,
  requestClaimMissionReward,
  requestSpinDailyWheel,
} from '@/lib/economy-client'
import { isServerSpinEnabled, requestServerSpin, type ServerSpinPayload } from '@/lib/server-spin'
import {
  PLAYER_SAVE_SCHEMA_VERSION,
  applyCloudPlayerSave,
  buildPlayerSavePayload,
} from '@/lib/player-save'
import { formatBetAdjustedToastBody } from '@/lib/bet-ui-copy'
import { track } from '@/lib/analytics/track'
import { AnalyticsEvents } from '@shared/analytics/event-names'
import { DAILY_LOGIN_REWARD_COINS } from '@shared/economy/daily-login-rewards'
import {
  BET_OPTIONS,
  FREE_SPIN_LINE_BET,
  MAX_LINE_BET,
  buildRandomGridIds,
  clampBetSelect,
  clampBetForWallet,
  evaluateGrid,
  jackpotPayoutForBet,
  type WinType,
  type WinningLineSerialized,
} from '@shared/slot/evaluate-spin'
import { paylineIndicesForMatchedPrefix } from '@shared/slot/paylines'
import {
  type VanityCategory,
  type Trophy,
  type UserVanity,
  generateInitialTrophies,
  getDefaultUserVanity,
  ALL_VANITY_ITEMS,
} from './vanity-data'

/** Free spins added when the player claims the next day in the daily streak (local claim path). */
export const DAILY_STREAK_FREE_SPINS_PER_CLAIM = 3

export type { WinType }
export type Theme = "vegas" | "cyber" | "treasure"

export interface SlotSymbol {
  id: string
  name: string
  emoji: string
  value: number
  isWild?: boolean
  isScatter?: boolean
}

export interface CoinPack {
  id: string
  coins: number
  price: number
  bonus?: number
}

export interface ThemePack {
  id: Theme
  name: string
  price: number
  owned: boolean
}

export interface DailyReward {
  day: number
  coins: number
  claimed: boolean
}

export interface Mission {
  id: string
  name: string
  description: string
  target: number
  progress: number
  reward: number
  /** XP granted when the player claims this mission. */
  xpReward: number
  completed: boolean
  claimed: boolean
}

export interface DailyWheelState {
  lastWheelSpinAt: string | null
  dailyWheelClaimed: boolean
  wheelReward: number | null
}

// Re-export UserVanity type from vanity-data
export type { UserVanity } from "./vanity-data"

// Leaderboard stats
export interface LeaderboardStats {
  weeklyBiggestWin: number
  weeklyTotalWinnings: number
  weekStartDate: string
  allTimeTotalWinnings: number
}

// 5x3 grid type
export type ReelGrid = SlotSymbol[][]

// Winning position tracking
export interface WinningLine {
  positions: [number, number][] // [col, row] pairs
  symbol: SlotSymbol
  multiplier: number
}

const MAX_COIN_LEDGER = 200

export type CoinLedgerReason =
  | 'spin_bet'
  | 'spin_win'
  | 'scatter_win'
  | 'jackpot_win'
  | 'bonus_meter_full'
  | 'daily_reward'
  | 'daily_wheel'
  | 'mission_reward'
  | 'level_up_bonus'
  | 'free_spins_bundle'
  | 'theme_unlock'
  | 'vanity_purchase'
  | 'cosmetic_chest'
  | 'iap_grant'
  | 'rewarded_ad'
  | 'starter_pack'
  | 'adjustment'

export interface CoinLedgerEntry {
  id: string
  ts: string
  delta: number
  balanceAfter: number
  reason: CoinLedgerReason
  label: string
}

export interface CoinLedgerMeta {
  reason: CoinLedgerReason
  label: string
}

const MAX_SPIN_AUDIT = 20

/**
 * XP awarded when the bonus meter fills and pays out.
 * Equivalent to ~15 average spins — meaningful but won't dominate progression.
 */
export const BONUS_METER_XP = 150

/**
 * Spin-XP formula: scales with bet, capped so whales don't trivialise levels.
 * Free spins (no coin wager) award 0 XP at resolve time — see server/local `stopSpin` paths.
 */
const spinXp = (bet: number, win: number) =>
  Math.max(10, Math.min(Math.floor(bet / 10), 500)) +
  (win > 0 ? Math.min(Math.floor(win / 1_000), 100) : 0)

/**
 * XP required to advance FROM `level` to `level + 1`.
 * Exponential curve: fast early (levels 1–20), medium grind (20–50), prestige (50–100).
 *   Level 1→2  ≈ 115 XP   (~6 spins at $100 bet)
 *   Level 10→11 ≈ 405 XP  (~20 spins)
 *   Level 30→31 ≈ 6,600 XP (~330 spins)
 *   Level 75→76 ≈ 1.2M XP  (~whale territory)
 */
export const xpForLevel = (level: number): number => Math.floor(100 * Math.pow(1.15, level))

/**
 * Meaningful coin + free-spin rewards at landmark levels.
 * All other levels receive `level × 500` coins and no free spins.
 */
const LEVEL_MILESTONES: Readonly<Record<number, { coins: number; freeSpins: number }>> = {
  5:   { coins: 5_000,     freeSpins: 5  },
  10:  { coins: 15_000,    freeSpins: 10 },
  20:  { coins: 50_000,    freeSpins: 15 },
  30:  { coins: 100_000,   freeSpins: 20 },
  50:  { coins: 250_000,   freeSpins: 25 },
  75:  { coins: 500_000,   freeSpins: 35 },
  100: { coins: 1_000_000, freeSpins: 50 },
}

interface LevelUpAccum {
  /** XP carried into the next level (remainder after level-ups). */
  xp: number
  /** New player level after all level-ups. */
  level: number
  /** Total coin bonus to add to the player's balance. */
  coinDelta: number
  /** Total free-spin bonus to add to the player's wallet. */
  freeSpinDelta: number
  /** Ledger entries to append (one per level-up). */
  ledger: Array<{ amount: number; label: string }>
}

/**
 * Returns the updated `monthlySpins` and `monthlySpinsMonth` fields for a spin state update.
 * Resets the counter to 1 on the first spin of a new calendar month (YYYY-MM).
 */
function tickMonthlySpins(prev: Pick<GameState, 'monthlySpins' | 'monthlySpinsMonth'>): {
  monthlySpins: number
  monthlySpinsMonth: string
} {
  const thisMonth = new Date().toISOString().slice(0, 7)
  return {
    monthlySpins: prev.monthlySpinsMonth === thisMonth ? prev.monthlySpins + 1 : 1,
    monthlySpinsMonth: thisMonth,
  }
}

/**
 * Pure function — applies `xpGain` starting from `currentXp / currentLevel`,
 * handles multi-level-ups, and returns the accumulated deltas and ledger entries.
 * Callers are responsible for applying the deltas to state.
 */
function computeXpGain(currentXp: number, currentLevel: number, xpGain: number): LevelUpAccum {
  let xp = currentXp + xpGain
  let level = currentLevel
  let coinDelta = 0
  let freeSpinDelta = 0
  const ledger: LevelUpAccum['ledger'] = []

  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level)
    level += 1
    const milestone = LEVEL_MILESTONES[level]
    const coinBonus = milestone?.coins ?? level * 500
    const freeSpinBonus = milestone?.freeSpins ?? 0
    coinDelta += coinBonus
    freeSpinDelta += freeSpinBonus
    ledger.push({ amount: coinBonus, label: `Level ${level} bonus` })
  }

  return { xp, level, coinDelta, freeSpinDelta, ledger }
}

// ── Tournament eligibility thresholds ────────────────────────────────────────
/** Minimum player level to enter the Vegas tournament (Platinum VIP gate). */
export const TOURNAMENT_MIN_LEVEL = 50
/** Minimum cumulative real-money USD spend to enter. */
export const TOURNAMENT_MIN_IAP_USD = 9.99
/** Minimum spins completed in the current calendar month. */
export const TOURNAMENT_MIN_MONTHLY_SPINS = 500
/** Coin entry fee deducted when the player joins a tournament draw. */
export const TOURNAMENT_ENTRY_FEE_COINS = 100_000

/** Seed amount shown on the marquee immediately after a jackpot win. */
export const JACKPOT_SEED_AMOUNT = 10_000
/** How long (ms) the jackpot display takes to grow from seed back to full payout. */
export const JACKPOT_RECOVERY_MS = 30 * 60 * 1000 // 30 minutes
/** Max recent jackpot winners stored in session state. */
const MAX_JACKPOT_WINNERS = 3

export interface JackpotWinEntry {
  username: string
  ts: string
  amount: number
}

export interface SpinAuditEntry {
  ts: string
  bet: number
  win: number
  winType: WinType
  freeSpin: boolean
  /** Middle row (row index 1) emojis from left to right — 5 symbols */
  reelMiddle: string[]
  /** Column indices (0–4) where a winning payline crossed the middle row */
  winningColsMiddle: number[]
  /**
   * Free-spin streak multiplier that was applied to this spin's win (1–5).
   * Omitted (undefined) when no multiplier was active (paid spins or 1× streak).
   * Use this to display "×3 streak" in the spin audit rather than back-deriving it.
   */
  fsMultiplier?: number
  /** XP for this spin (base + bonus meter); 0 when `freeSpin` (no coin wager); omitted on legacy rows. */
  xpGained?: number
  /** Which paylines / features contributed (e.g. "L1 · L4 · Scatter"); omitted on legacy rows. */
  paylinesHint?: string
  /** Total win ÷ line bet (engine `win_multiplier`). Omitted on legacy rows — derived as win/bet when missing. */
  winMultiplier?: number
}

function newLedgerEntryId(): string {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function appendCoinLedger(
  ledger: CoinLedgerEntry[],
  delta: number,
  balanceAfter: number,
  reason: CoinLedgerReason,
  label: string
): CoinLedgerEntry[] {
  const entry: CoinLedgerEntry = {
    id: newLedgerEntryId(),
    ts: new Date().toISOString(),
    delta,
    balanceAfter,
    reason,
    label,
  }
  return [entry, ...ledger].slice(0, MAX_COIN_LEDGER)
}

export interface GameState {
  // Wallet
  coins: number
  
  // Theme
  currentTheme: Theme
  ownedThemes: Theme[]
  
  // Slot machine - 5x3 grid
  currentBet: number
  betOptions: number[]
  isSpinning: boolean
  /**
   * True while a spin is in flight that consumed a free spin at tap time.
   * Needed because the local path decrements `freeSpins` immediately, so the balance
   * alone does not tell you whether the reels are resolving on a free spin.
   */
  activeSpinIsFree: boolean
  reelsLocked: boolean // true when result is committed to state; reels may still be visually spinning
  reelGrid: ReelGrid // 5 columns x 3 rows
  lastWin: number
  winMultiplier: number
  lastWinType: WinType
  winningLines: WinningLine[]
  winningPositions: Set<string> // "col-row" format for highlighting
  
  // Bonus
  freeSpins: number
  /** Scatter award from the last completed spin (for win overlay). */
  lastSpinFreeSpinsWon: number
  isJackpotMode: boolean
  jackpotMultiplier: number
  bonusProgress: number // 0-100 for bonus meter
  /** Coin credit when the bonus meter completed on the last resolved spin (UI/toast); cleared when a new spin starts. */
  lastBonusMeterPayout: number
  /** Coins awarded for scatter count on the last resolved spin (0 when no scatter payout). */
  lastScatterPayout: number
  /** Scatter symbols counted on the last resolved spin (0–15); cleared when a new spin starts. */
  lastScatterCount: number
  /** Flat center-row prize when Jackpot Mode triggered last spin, else 0. */
  lastJackpotBonus: number
  /** Mystery Multiplier value applied last spin (2 | 3 | 5 | 8 | 10), or null if it didn't trigger. */
  lastMysteryMultiplier: number | null
  /**
   * Consecutive-win streak multiplier for the current free spin session (1–5×).
   * Increments on each winning free spin, resets to 1 on a blank or when paid spins resume.
   * Applied to the entire total_win of the next free spin.
   */
  freeSpinMultiplier: number
  /**
   * The free spin multiplier that was actually applied on the last resolved spin (1 when not a free spin).
   * Used by WinDisplay to show the streak badge without re-deriving it from session state.
   */
  lastFreeSpinMultiplier: number
  /** Total XP awarded for the last completed spin (base spin + bonus meter bonus if any). Cleared when a new spin starts. */
  lastSpinXpGained: number
  /**
   * ISO timestamp of the most recent Jackpot Mode (center-row) hit this session.
   * Used by the Marquee to show a seed-recovery display instead of the full $250K.
   */
  jackpotLastWonAt: string | null
  /** Up to 3 most recent jackpot winners shown on the leaderboard. */
  jackpotWinners: JackpotWinEntry[]
  /** Recent coin movements (newest first); capped for memory. Local-only until cloud sync. */
  coinLedger: CoinLedgerEntry[]

  /**
   * Server spin failed and local RNG was used — wallet may differ from DB until
   * `resyncWalletFromServer` succeeds or the next server-authoritative spin.
   */
  spinSyncDeferred: boolean
  
  // Daily rewards
  dailyStreak: number
  dailyRewards: DailyReward[]
  lastClaimDate: string | null
  /** True from the moment day 7 is claimed until midnight of the next day (when the cycle resets). */
  weeklyStreakCompleted: boolean
  
  // Daily Wheel
  dailyWheel: DailyWheelState
  
  // Missions
  missions: Mission[]
  
  // Settings
  soundEnabled: boolean
  musicEnabled: boolean
  hapticsEnabled: boolean
  notificationsEnabled: boolean
  
  // Responsible Play
  sessionReminderMinutes: number | null
  dailyPurchaseLimit: number | null
  cooldownEnabled: boolean
  
  // Profile
  username: string
  bio: string
  avatarUri: string | null
  level: number
  xp: number
  totalSpins: number
  /** Incremented when a spin finishes (result committed); used to gate win UI once per spin. */
  spinSequence: number
  biggestWin: number
  totalWins: number
  maxBetUsed: boolean
  /**
   * Cumulative real-money USD spent via IAP (rounded to 2 dp).
   * Used to gate tournament entry and to identify high-value players.
   */
  totalIapSpent: number
  /**
   * Number of spins completed during the current calendar month.
   * Resets on the first spin of a new month.
   */
  monthlySpins: number
  /** ISO date string (YYYY-MM) of the month `monthlySpins` was last reset. */
  monthlySpinsMonth: string
  
  // Vanity System
  userVanity: UserVanity
  trophies: Trophy[]
  leaderboardStats: LeaderboardStats
  
  // Recent Big Wins (for social feed)
  recentBigWins: { amount: number; multiplier: number; timestamp: string; type: WinType }[]

  // Lightweight per-spin audit — capped at 20, shown as play-screen history strip
  spinAudit: SpinAuditEntry[]
}

interface GameActions {
  setCoins: (coins: number) => void
  addCoins: (amount: number, meta?: CoinLedgerMeta) => void
  subtractCoins: (amount: number, meta?: CoinLedgerMeta) => boolean
  setTheme: (theme: Theme) => void
  buyTheme: (theme: Theme, price: number) => Promise<boolean>
  /** Simulated shop: spend coins for free spins. */
  buyFreeSpinsWithCoins: (price: number, spins: number) => boolean
  /** Grant free spins (e.g. starter pack / promos). */
  addFreeSpins: (amount: number) => void
  /**
   * Record a confirmed real-money IAP purchase.
   * @param usdAmount - Price in USD (e.g. 9.99). Added to `totalIapSpent`.
   */
  recordIapSpend: (usdAmount: number) => void
  /**
   * Whether this player meets ALL tournament entry requirements:
   * Level 50+, ≥$9.99 total IAP, ≥500 spins this month.
   * Does NOT check or deduct the coin entry fee.
   */
  isTournamentEligible: boolean
  setBet: (bet: number) => void
  spin: () => Promise<SpinResult>
  stopSpin: () => void
  /** Resolves false if the claim is invalid or the server rejects the sequence. */
  claimDailyReward: (day: number) => Promise<boolean>
  spinDailyWheel: () => Promise<number>
  claimMissionReward: (missionId: string) => Promise<boolean>
  setUsername: (name: string) => void
  setBio: (bio: string) => void
  setAvatarUri: (uri: string | null) => void
  addXp: (amount: number) => void
  toggleSound: () => void
  toggleMusic: () => void
  toggleHaptics: () => void
  toggleNotifications: () => void
  setSessionReminder: (minutes: number | null) => void
  setPurchaseLimit: (limit: number | null) => void
  toggleCooldown: () => void
  clearLastSpinFreeSpinsBonus: () => void
  /** Pull wallet + meter from Supabase; clears `spinSyncDeferred` on success. */
  resyncWalletFromServer: () => Promise<boolean>

  // Vanity actions
  buyVanityItem: (itemId: string, priceCoins: number) => boolean
  equipVanityItem: (category: VanityCategory, itemId: string) => void
  setFeaturedItem: (type: "car" | "room", itemId: string | undefined) => void
  unlockTrophy: (trophyId: string) => void
}

export interface SpinResult {
  win: number
  grid: ReelGrid
  isJackpot: boolean
  freeSpinsWon: number
  winningLines: WinningLine[]
  winType: WinType
  winMultiplier: number
  bonusMeterPayout: number
  scatterPayout: number
}

const SYMBOLS: SlotSymbol[] = [
  { id: "seven", name: "Lucky Seven", emoji: "7", value: 100 },
  { id: "diamond", name: "Diamond", emoji: "💎", value: 75 },
  { id: "bell", name: "Bell", emoji: "🔔", value: 50 },
  { id: "cherry", name: "Cherry", emoji: "🍒", value: 30 },
  { id: "lemon", name: "Lemon", emoji: "🍋", value: 20 },
  { id: "orange", name: "Orange", emoji: "🍊", value: 15 },
  { id: "grape", name: "Grape", emoji: "🍇", value: 10 },
  { id: "wild", name: "Wild", emoji: "★", value: 0, isWild: true },
  { id: "scatter", name: "Scatter", emoji: "✦", value: 0, isScatter: true },
]

const WHEEL_REWARDS = [50, 100, 150, 200, 300, 500, 750, 1000]

const INITIAL_DAILY_REWARDS: DailyReward[] = DAILY_LOGIN_REWARD_COINS.map((coins, i) => ({
  day: i + 1,
  coins,
  claimed: false,
}))

const INITIAL_MISSIONS: Mission[] = [
  { id: "spin20",  name: "Spin Master",  description: "Complete 20 spins",            target: 20, progress: 0, reward: 500, xpReward: 250, completed: false, claimed: false },
  { id: "win5",    name: "Lucky Streak", description: "Land 5 winning spins",          target: 5,  progress: 0, reward: 300, xpReward: 150, completed: false, claimed: false },
  { id: "maxbet1", name: "High Roller",  description: "Use Max once (highest bet)",    target: 1,  progress: 0, reward: 200, xpReward: 100, completed: false, claimed: false },
]

// Generate initial 5x3 grid
export const generateInitialGrid = (): ReelGrid => {
  const grid: ReelGrid = []
  for (let col = 0; col < 5; col++) {
    const column: SlotSymbol[] = []
    for (let row = 0; row < 3; row++) {
      column.push(SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 2))]) // Exclude wild/scatter initially
    }
    grid.push(column)
  }
  return grid
}

// Helper to check and unlock trophies based on conditions
const checkTrophyUnlocks = (
  trophies: Trophy[],
  conditions: {
    winType?: WinType
    ownedThemesCount?: number
    level?: number
    allTimeTotalWinnings?: number
    dailyStreak?: number
  }
): Trophy[] => {
  const now = new Date().toISOString()
  
  return trophies.map(trophy => {
    if (trophy.unlocked) return trophy
    
    // Big Win trophy - unlocks after first Big Win
    if (trophy.id === "trophy-first-big" && conditions.winType === "bigWin") {
      return { ...trophy, unlocked: true, unlockedAt: now }
    }
    // Jackpot (10×–24.9×) trophy — unlocks after first `megaWin` tier
    if (trophy.id === "trophy-first-mega" && conditions.winType === "megaWin") {
      return { ...trophy, unlocked: true, unlockedAt: now }
    }
    // Jackpot trophy - unlocks after first Jackpot
    if (trophy.id === "trophy-first-jackpot" && conditions.winType === "jackpot") {
      return { ...trophy, unlocked: true, unlockedAt: now }
    }
    // Theme Collector trophy - unlocks after owning all 3 themes
    if (trophy.id === "trophy-themes" && (conditions.ownedThemesCount ?? 0) >= 3) {
      return { ...trophy, unlocked: true, unlockedAt: now }
    }
    // VIP trophy - unlocks at level 5 (VIP tier)
    if (trophy.id === "trophy-vip" && (conditions.level ?? 0) >= 5) {
      return { ...trophy, unlocked: true, unlockedAt: now }
    }
    // Million Coin Club trophy
    if (trophy.id === "trophy-million" && (conditions.allTimeTotalWinnings ?? 0) >= 1000000) {
      return { ...trophy, unlocked: true, unlockedAt: now }
    }
    // Weekly Dedication trophy - 7-day login streak
    if (trophy.id === "trophy-streak7" && (conditions.dailyStreak ?? 0) >= 7) {
      return { ...trophy, unlocked: true, unlockedAt: now }
    }
    
    return trophy
  })
}

function emptySpinResult(prev: Pick<GameState, 'reelGrid'>): SpinResult {
  return {
    win: 0,
    grid: prev.reelGrid,
    isJackpot: false,
    freeSpinsWon: 0,
    winningLines: [],
    winType: 'none',
    winMultiplier: 0,
    bonusMeterPayout: 0,
    scatterPayout: 0,
  }
}

function gridIdsToReelGrid(gridIds: string[][]): ReelGrid {
  return gridIds.map((col) =>
    col.map((id) => SYMBOLS.find((s) => s.id === id) ?? SYMBOLS[3]),
  )
}

function winningLinesAndPositionsFromSerialized(
  serialized: readonly WinningLineSerialized[],
): { winningLines: WinningLine[]; positions: Set<string> } {
  const winningLines: WinningLine[] = serialized.map((wl) => ({
    positions: wl.positions,
    symbol: SYMBOLS.find((s) => s.id === wl.symbol_id) ?? SYMBOLS[3],
    multiplier: wl.multiplier,
  }))
  const positions = new Set<string>()
  for (const line of winningLines) {
    for (const [col, row] of line.positions) {
      positions.add(`${col}-${row}`)
    }
  }
  return { winningLines, positions }
}

/** Compact path summary for spin history (line numbers, scatter, jackpot row). */
function spinPaylinesHint(
  winningLines: readonly WinningLineSerialized[],
  scatterPayout: number,
  isJackpot: boolean,
): string | undefined {
  const idx = new Set<number>()
  for (const wl of winningLines) {
    for (const i of paylineIndicesForMatchedPrefix(wl.positions)) idx.add(i)
  }
  const parts: string[] = []
  for (const i of [...idx].sort((a, b) => a - b)) parts.push(`L${i + 1}`)
  if (scatterPayout > 0) parts.push('Scatter')
  if (isJackpot) parts.push('Jackpot row')
  if (parts.length === 0) return undefined
  return parts.join(' · ')
}

function createInitialGameState(): GameState {
  return {
    coins: 5000,
    currentTheme: "vegas",
    ownedThemes: ["vegas"],
    currentBet: 50,
    betOptions: [...BET_OPTIONS],
    isSpinning: false,
    activeSpinIsFree: false,
    reelsLocked: false,
    reelGrid: generateInitialGrid(),
    lastWin: 0,
    winMultiplier: 0,
    lastWinType: "none",
    winningLines: [],
    winningPositions: new Set(),
    freeSpins: 0,
    lastSpinFreeSpinsWon: 0,
    isJackpotMode: false,
    jackpotMultiplier: 1,
    bonusProgress: 0,
    lastBonusMeterPayout: 0,
    lastScatterPayout: 0,
    lastScatterCount: 0,
    lastJackpotBonus: 0,
    lastMysteryMultiplier: null,
    freeSpinMultiplier: 1,
    lastFreeSpinMultiplier: 1,
    lastSpinXpGained: 0,
    jackpotLastWonAt: null,
    jackpotWinners: [],
    coinLedger: [],
    spinSyncDeferred: false,
    dailyStreak: 0,
    dailyRewards: INITIAL_DAILY_REWARDS.map((r) => ({ ...r })),
    lastClaimDate: null,
    weeklyStreakCompleted: false,
    dailyWheel: {
      lastWheelSpinAt: null,
      dailyWheelClaimed: false,
      wheelReward: null,
    },
    missions: INITIAL_MISSIONS.map((m) => ({ ...m })),
    soundEnabled: true,
    musicEnabled: false,
    hapticsEnabled: true,
    notificationsEnabled: true,
    sessionReminderMinutes: null,
    dailyPurchaseLimit: null,
    cooldownEnabled: false,
    username: "Player",
    bio: "",
    avatarUri: null,
    level: 1,
    xp: 0,
    totalSpins: 0,
    spinSequence: 0,
    biggestWin: 0,
    totalWins: 0,
    maxBetUsed: false,
    totalIapSpent: 0,
    monthlySpins: 0,
    monthlySpinsMonth: '',
    userVanity: getDefaultUserVanity(),
    trophies: generateInitialTrophies(),
    leaderboardStats: {
      weeklyBiggestWin: 0,
      weeklyTotalWinnings: 0,
      weekStartDate: new Date().toISOString(),
      allTimeTotalWinnings: 0,
    },
    recentBigWins: [],
    spinAudit: [],
  }
}

/** Defaults for merging cloud payload when fields are missing. */
const FALLBACK_DAILY_WHEEL: DailyWheelState = {
  lastWheelSpinAt: null,
  dailyWheelClaimed: false,
  wheelReward: null,
}

function fallbackLeaderboardStats(): LeaderboardStats {
  return {
    weeklyBiggestWin: 0,
    weeklyTotalWinnings: 0,
    weekStartDate: new Date().toISOString(),
    allTimeTotalWinnings: 0,
  }
}

const GameContext = createContext<(GameState & GameActions) | null>(null)

const FALLBACK_TOAST_THROTTLE_MS = 3 * 60 * 1000

/** Min interval between “Bet adjusted” toasts after wallet-driven line-bet clamps (Strict / batching). */
const BET_ADJUST_TOAST_THROTTLE_MS = 900

/** Set when a cloud upsert failed (e.g. offline); cleared on success or sign-out. Survives cold start. */
const PLAYER_SAVE_PENDING_RETRY_KEY = '@spinvault/player_save_pending_retry'

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => createInitialGameState())
  const stateRef = useRef(state)
  stateRef.current = state

  /** Last time we showed the wallet-driven “Bet adjusted” toast (see `BET_ADJUST_TOAST_THROTTLE_MS`). */
  const betAdjustToastAtRef = useRef(0)

  /**
   * When `coins` / `freeSpins` / spin lifecycle changes, re-apply `clampBetForWallet` so `currentBet`
   * stays tier-legal and affordable on paid spins. Skips while `isSpinning` so the active spin keeps
   * the stake chosen at tap time. Toast uses `formatBetAdjustedToastBody` from `bet-ui-copy`.
   */
  useEffect(() => {
    const snap = stateRef.current
    if (snap.isSpinning) return
    const nextBet = clampBetForWallet(snap.currentBet, snap.coins, snap.freeSpins)
    if (nextBet === snap.currentBet) return
    const previousBet = snap.currentBet
    setState((prev) => {
      if (prev.isSpinning) return prev
      const clamped = clampBetForWallet(prev.currentBet, prev.coins, prev.freeSpins)
      if (clamped === prev.currentBet) return prev
      return { ...prev, currentBet: clamped }
    })
    queueMicrotask(() => {
      const now = Date.now()
      if (now - betAdjustToastAtRef.current < BET_ADJUST_TOAST_THROTTLE_MS) return
      betAdjustToastAtRef.current = now
      Toast.show({
        type: 'info',
        text1: 'Bet adjusted',
        text2: formatBetAdjustedToastBody(previousBet, nextBet),
      })
    })
  }, [state.coins, state.freeSpins, state.isSpinning])
  /** Resolves the pending `spin()` promise after reels finish — ref avoids stale closures and setState-in-setState. */
  const spinResolveRef = useRef<((result: SpinResult) => void) | null>(null)
  const serverSpinPayloadRef = useRef<ServerSpinPayload | null>(null)
  const lastServerFallbackToastAtRef = useRef(0)
  const suppressCloudSaveUntilRef = useRef(0)
  const cloudHydrateGenRef = useRef(0)
  const cloudSaveInFlightRef = useRef(false)
  const cloudSaveNeedsRetryRef = useRef(false)
  /** Avoid clearing pending-save storage on cold start before `getSession` resolves. */
  const hadCloudUserSessionRef = useRef(false)
  /**
   * Guards `patchPlayerProgress` — one in-flight RPC at a time.
   * Drops the call (not queued) if a previous one hasn't returned yet;
   * the next spin will pick up the latest values.
   */
  const progressPatchInFlightRef = useRef(false)
  /** Effective bet used for payout calculation. Free spins cost $0 but use currentBet for payouts. */
  const spinLineBetRef = useRef(50)
  const spinWasFreeRef = useRef(false)

  const [cloudUserId, setCloudUserId] = useState<string | null>(null)

  const resyncWalletFromServer = useCallback(async (): Promise<boolean> => {
    const supabase = getSupabase()
    if (!supabase) return false
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) return false
    const { data, error } = await supabase
      .from('wallets')
      .select('coin_balance, free_spin_balance, bonus_meter_progress')
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (error || !data) return false
    setState((prev) => ({
      ...prev,
      coins: Number(data.coin_balance),
      freeSpins: data.free_spin_balance,
      bonusProgress: Number(data.bonus_meter_progress ?? 0),
      spinSyncDeferred: false,
    }))
    return true
  }, [])

  /** Align login-reward UI with `daily_reward_state` (authoritative when economy Edge is on). */
  const hydrateDailyRewardProgressFromServer = useCallback(async () => {
    if (!isServerEconomyEnabled()) return
    const supabase = getSupabase()
    if (!supabase) return
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data, error } = await supabase
      .from('daily_reward_state')
      .select('current_streak, last_claimed_at')
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (error || !data) return
    const streak = Number(data.current_streak ?? 0)
    const lastClaim =
      data.last_claimed_at != null ? new Date(data.last_claimed_at).toDateString() : null
    setState((prev) => ({
      ...prev,
      dailyStreak: streak,
      dailyRewards: prev.dailyRewards.map((r) => ({
        ...r,
        claimed: r.day <= streak,
      })),
      lastClaimDate: lastClaim ?? prev.lastClaimDate,
    }))
  }, [])

  /** `user_missions` + `daily_wheel_state` when server economy is on. */
  const hydrateMissionsAndWheelFromServer = useCallback(async () => {
    if (!isServerEconomyEnabled()) return
    const supabase = getSupabase()
    if (!supabase) return
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) return

    const utcDay = new Date().toISOString().slice(0, 10)

    const { data: rows, error: umErr } = await supabase
      .from('user_missions')
      .select(
        'progress, completed, claimed, missions ( mission_key, target_value, reward_coins, title, description )',
      )
      .eq('user_id', session.user.id)
      .eq('period_start', utcDay)

    if (umErr) return

    const { data: wheelRow } = await supabase
      .from('daily_wheel_state')
      .select('last_claim_utc_date, last_reward_coins')
      .eq('user_id', session.user.id)
      .maybeSingle()

    const claimedToday = wheelRow?.last_claim_utc_date === utcDay
    const rewardAmt =
      claimedToday && wheelRow?.last_reward_coins != null ? Number(wheelRow.last_reward_coins) : null

    type UmRow = {
      progress: number
      completed: boolean
      claimed: boolean
      missions: {
        mission_key: string
        target_value: number
        reward_coins: number
        title: string
        description: string
      } | null
    }

    const list = (rows ?? []) as unknown as UmRow[]

    setState((prev) => {
      const merged: Mission[] = INITIAL_MISSIONS.map((template) => {
        const row = list.find((r) => r.missions?.mission_key === template.id)
        if (!row?.missions) return template
        return {
          ...template,
          name: row.missions.title,
          description: row.missions.description,
          target: row.missions.target_value,
          reward: Number(row.missions.reward_coins),
          progress: row.progress,
          completed: row.completed,
          claimed: row.claimed,
        }
      })
      return {
        ...prev,
        missions: merged,
        dailyWheel: {
          ...prev.dailyWheel,
          dailyWheelClaimed: claimedToday,
          wheelReward: rewardAmt,
          lastWheelSpinAt: claimedToday ? prev.dailyWheel.lastWheelSpinAt ?? new Date().toISOString() : null,
        },
      }
    })
  }, [])

  const hydrateOwnedThemesFromServer = useCallback(async () => {
    if (!isServerEconomyEnabled()) return
    const supabase = getSupabase()
    if (!supabase) return
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data, error } = await supabase.from('user_themes').select('theme_slug').eq('user_id', session.user.id)
    if (error) return
    const allowed: Theme[] = ['vegas', 'cyber', 'treasure']
    const fromDb =
      data?.map((r) => r.theme_slug as string).filter((s): s is Theme => (allowed as string[]).includes(s)) ??
      []
    // Empty successful response: trust server (migration should seed Vegas); avoid stale client-only unlocks.
    const owned = fromDb.length > 0 ? fromDb : (['vegas'] as Theme[])
    setState((prev) => ({ ...prev, ownedThemes: owned }))
  }, [])

  const flushCloudPlayerSave = useCallback(async (): Promise<boolean> => {
    const uid = cloudUserId
    const supabase = getSupabase()
    if (!uid || !supabase) return false
    if (Date.now() < suppressCloudSaveUntilRef.current) return false
    if (cloudSaveInFlightRef.current) return false
    cloudSaveInFlightRef.current = true
    try {
      const payload = buildPlayerSavePayload(stateRef.current)
      const { error } = await supabase.from('player_saves').upsert(
        {
          user_id: uid,
          schema_version: PLAYER_SAVE_SCHEMA_VERSION,
          payload,
        },
        { onConflict: 'user_id' },
      )
      if (error) {
        cloudSaveNeedsRetryRef.current = true
        void AsyncStorage.setItem(PLAYER_SAVE_PENDING_RETRY_KEY, '1').catch(() => {})
        if (__DEV__) console.warn('[player_saves] upsert failed:', error.message)
        return false
      }
      cloudSaveNeedsRetryRef.current = false
      void AsyncStorage.removeItem(PLAYER_SAVE_PENDING_RETRY_KEY).catch(() => {})
      return true
    } finally {
      cloudSaveInFlightRef.current = false
    }
  }, [cloudUserId])

  /**
   * Lightweight post-spin write: updates only the four hot progress columns
   * (level, xp, total_spins, biggest_win) on player_saves via the
   * `player_progress_patch` RPC.  Writes ~80 bytes instead of the full 10 KB
   * payload blob, keeping high-frequency spin sessions cheap on the DB.
   *
   * Fire-and-forget: drops silently if a previous call is still in-flight or if
   * the user is not authenticated.  The full `flushCloudPlayerSave` will catch
   * any missed values on its next debounced run.
   */
  const patchPlayerProgress = useCallback(async (): Promise<void> => {
    if (!cloudUserId) return
    const supabase = getSupabase()
    if (!supabase) return
    if (progressPatchInFlightRef.current) return
    progressPatchInFlightRef.current = true
    try {
      const s = stateRef.current
      const { error } = await supabase.rpc('player_progress_patch', {
        p_level: s.level,
        p_xp: s.xp,
        p_total_spins: s.totalSpins,
        p_biggest_win: s.biggestWin,
      })
      if (__DEV__ && error) {
        console.warn('[player_progress_patch] failed:', error.message)
      }
    } finally {
      progressPatchInFlightRef.current = false
    }
  }, [cloudUserId])

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setCloudUserId(null)
      return
    }
    void supabase.auth.getSession().then(({ data: { session } }) => {
      const id = session?.user?.id
      setCloudUserId(id && !id.startsWith('guest_') ? id : null)
    })
  }, [])

  useEffect(() => {
    if (cloudUserId) {
      hadCloudUserSessionRef.current = true
      return
    }
    if (hadCloudUserSessionRef.current) {
      hadCloudUserSessionRef.current = false
      cloudSaveNeedsRetryRef.current = false
      cloudSaveInFlightRef.current = false
      void AsyncStorage.removeItem(PLAYER_SAVE_PENDING_RETRY_KEY).catch(() => {})

      /* Privacy: clear in-memory progress after Supabase session ends (sign-out). */
      cloudHydrateGenRef.current += 1
      const finishSpin = spinResolveRef.current
      const prevGrid = stateRef.current
      if (finishSpin) {
        spinResolveRef.current = null
        queueMicrotask(() => finishSpin(emptySpinResult(prevGrid)))
      }
      serverSpinPayloadRef.current = null
      suppressCloudSaveUntilRef.current = 0
      lastServerFallbackToastAtRef.current = 0

      const fresh = createInitialGameState()
      setState(fresh)
      spinLineBetRef.current = fresh.currentBet
    }
  }, [cloudUserId])

  useEffect(() => {
    if (!cloudUserId) return
    let cancelled = false
    void (async () => {
      const flag = await AsyncStorage.getItem(PLAYER_SAVE_PENDING_RETRY_KEY)
      if (cancelled || flag !== '1') return
      cloudSaveNeedsRetryRef.current = true
      void flushCloudPlayerSave()
    })()
    return () => {
      cancelled = true
    }
  }, [cloudUserId, flushCloudPlayerSave])

  useEffect(() => {
    if (!cloudUserId) return
    const gen = ++cloudHydrateGenRef.current
    let cancelled = false
    const supabase = getSupabase()
    if (!supabase) return

    suppressCloudSaveUntilRef.current = Date.now() + 2500

    void (async () => {
      const { data, error } = await supabase
        .from('player_saves')
        .select('payload')
        .eq('user_id', cloudUserId)
        .maybeSingle()

      if (cancelled || gen !== cloudHydrateGenRef.current) return
      if (error) {
        if (__DEV__) console.warn('[player_saves] load failed:', error.message)
        return
      }

      const payload = data?.payload ?? {}
      const { patch } = applyCloudPlayerSave(payload, {
        createFreshGrid: generateInitialGrid,
        fallbackDailyRewards: INITIAL_DAILY_REWARDS,
        fallbackMissions: INITIAL_MISSIONS,
        fallbackDailyWheel: FALLBACK_DAILY_WHEEL,
        fallbackUserVanity: getDefaultUserVanity(),
        fallbackTrophies: generateInitialTrophies(),
        fallbackLeaderboard: fallbackLeaderboardStats(),
      })

      setState((prev) => ({ ...prev, ...patch }))
      await resyncWalletFromServer()
      await hydrateDailyRewardProgressFromServer()
      await hydrateMissionsAndWheelFromServer()
      await hydrateOwnedThemesFromServer()
      suppressCloudSaveUntilRef.current = 0
      void flushCloudPlayerSave()
    })()

    return () => {
      cancelled = true
    }
  }, [
    cloudUserId,
    resyncWalletFromServer,
    hydrateDailyRewardProgressFromServer,
    hydrateMissionsAndWheelFromServer,
    hydrateOwnedThemesFromServer,
    flushCloudPlayerSave,
  ])

  useEffect(() => {
    if (!cloudUserId) return
    const t = setTimeout(() => {
      void flushCloudPlayerSave()
    }, 2000)
    return () => clearTimeout(t)
  }, [state, cloudUserId, flushCloudPlayerSave])

  useEffect(() => {
    if (!cloudUserId) return
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        void flushCloudPlayerSave()
        return
      }
      if (next !== 'active') return
      void (async () => {
        const stored = await AsyncStorage.getItem(PLAYER_SAVE_PENDING_RETRY_KEY)
        if (cloudSaveNeedsRetryRef.current || stored === '1') {
          void flushCloudPlayerSave()
        }
      })()
    })
    return () => sub.remove()
  }, [cloudUserId, flushCloudPlayerSave])

  useEffect(() => {
    void resyncWalletFromServer()
  }, [resyncWalletFromServer])

  useEffect(() => {
    void hydrateDailyRewardProgressFromServer()
  }, [hydrateDailyRewardProgressFromServer])

  useEffect(() => {
    void hydrateMissionsAndWheelFromServer()
  }, [hydrateMissionsAndWheelFromServer])

  useEffect(() => {
    void hydrateOwnedThemesFromServer()
  }, [hydrateOwnedThemesFromServer])

  useEffect(() => {
    if (!isServerSpinEnabled() && !isServerEconomyEnabled()) return
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return
      void resyncWalletFromServer()
      void hydrateDailyRewardProgressFromServer()
      void hydrateMissionsAndWheelFromServer()
      void hydrateOwnedThemesFromServer()
    })
    return () => sub.remove()
  }, [
    resyncWalletFromServer,
    hydrateDailyRewardProgressFromServer,
    hydrateMissionsAndWheelFromServer,
    hydrateOwnedThemesFromServer,
  ])

  /** After login or token refresh, pull wallet + daily ladder when server flags are on. */
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id
      setCloudUserId(id && !id.startsWith('guest_') ? id : null)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void resyncWalletFromServer()
        void hydrateDailyRewardProgressFromServer()
        void hydrateMissionsAndWheelFromServer()
        void hydrateOwnedThemesFromServer()
      }
    })
    return () => subscription.unsubscribe()
  }, [
    resyncWalletFromServer,
    hydrateDailyRewardProgressFromServer,
    hydrateMissionsAndWheelFromServer,
    hydrateOwnedThemesFromServer,
  ])

  // Reset daily wheel, missions, and (on new day after 7-day streak) the daily reward cycle.
  // Server economy uses DB UTC + hydrate instead.
  useEffect(() => {
    const checkReset = () => {
      if (isServerEconomyEnabled()) {
        void hydrateMissionsAndWheelFromServer()
        return
      }
      const today = new Date().toDateString()
      setState((prev) => {
        const lastWheelDate = prev.dailyWheel.lastWheelSpinAt
          ? new Date(prev.dailyWheel.lastWheelSpinAt).toDateString()
          : null

        const resetWheel = lastWheelDate !== today
        // Reset the 7-day reward cycle the first midnight after the full week is claimed.
        const resetWeeklyCycle = prev.weeklyStreakCompleted && prev.lastClaimDate !== today

        if (!resetWheel && !resetWeeklyCycle) return prev

        return {
          ...prev,
          ...(resetWheel && {
            dailyWheel: {
              lastWheelSpinAt: null,
              dailyWheelClaimed: false,
              wheelReward: null,
            },
            missions: INITIAL_MISSIONS,
          }),
          ...(resetWeeklyCycle && {
            dailyStreak: 0,
            weeklyStreakCompleted: false,
            dailyRewards: INITIAL_DAILY_REWARDS.map((r) => ({ ...r })),
          }),
        }
      })
    }

    checkReset()
    const interval = setInterval(checkReset, 60000)
    return () => clearInterval(interval)
  }, [hydrateMissionsAndWheelFromServer])

  // Weekly leaderboard reset
  useEffect(() => {
    setState(prev => {
      const lastWeekStart = new Date(prev.leaderboardStats.weekStartDate)
      const now = new Date()
      
      // Get week start date (Monday)
      const getWeekStart = (date: Date) => {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        return new Date(d.setDate(diff))
      }
      
      const currentWeekStart = getWeekStart(now)
      const lastWeekStartNormalized = getWeekStart(lastWeekStart)
      
      if (currentWeekStart.getTime() !== lastWeekStartNormalized.getTime()) {
        // Week changed - reset weekly stats
        return {
          ...prev,
          leaderboardStats: {
            ...prev.leaderboardStats,
            weeklyBiggestWin: 0,
            weeklyTotalWinnings: 0,
            weekStartDate: currentWeekStart.toISOString(),
          },
        }
      }
      
      return prev
    })
  }, [])

  const setCoins = useCallback((coins: number) => {
    setState((prev) => {
      const delta = coins - prev.coins
      if (delta === 0) return { ...prev, coins }
      return {
        ...prev,
        coins,
        coinLedger: appendCoinLedger(
          prev.coinLedger,
          delta,
          coins,
          'adjustment',
          delta > 0 ? `Vault +${delta.toLocaleString()}` : `Vault ${delta.toLocaleString()}`
        ),
      }
    })
  }, [])

  const addCoins = useCallback((amount: number, meta?: CoinLedgerMeta) => {
    if (amount === 0) return
    setState((prev) => {
      const bal = prev.coins + amount
      const m =
        meta ??
        ({
          reason: 'iap_grant',
          label: amount > 0 ? 'Coins added' : 'Coins removed',
        } satisfies CoinLedgerMeta)
      return {
        ...prev,
        coins: bal,
        coinLedger: appendCoinLedger(prev.coinLedger, amount, bal, m.reason, m.label),
      }
    })
  }, [])

  const subtractCoins = useCallback((amount: number, meta?: CoinLedgerMeta): boolean => {
    let success = false
    setState((prev) => {
      if (prev.coins < amount) return prev
      success = true
      const bal = prev.coins - amount
      const m =
        meta ??
        ({
          reason: 'adjustment',
          label: `Spend −${amount.toLocaleString()} virtual coins`,
        } satisfies CoinLedgerMeta)
      return {
        ...prev,
        coins: bal,
        coinLedger: appendCoinLedger(prev.coinLedger, -amount, bal, m.reason, m.label),
      }
    })
    return success
  }, [])

  const setTheme = useCallback((theme: Theme) => {
    setState(prev => {
      if (prev.ownedThemes.includes(theme)) {
        return { ...prev, currentTheme: theme }
      }
      return prev
    })
  }, [])

  const buyFreeSpinsWithCoins = useCallback((price: number, spins: number): boolean => {
    let ok = false
    setState((prev) => {
      if (prev.coins >= price) {
        ok = true
        const bal = prev.coins - price
        return {
          ...prev,
          coins: bal,
          freeSpins: prev.freeSpins + spins,
          coinLedger: appendCoinLedger(
            prev.coinLedger,
            -price,
            bal,
            'free_spins_bundle',
            `${spins} free spins (−${price.toLocaleString()} virtual coins)`
          ),
        }
      }
      return prev
    })
    return ok
  }, [])

  const addFreeSpins = useCallback((amount: number) => {
    setState((prev) => ({ ...prev, freeSpins: prev.freeSpins + amount }))
  }, [])

  const recordIapSpend = useCallback((usdAmount: number) => {
    if (usdAmount <= 0) return
    setState((prev) => ({
      ...prev,
      totalIapSpent: Math.round((prev.totalIapSpent + usdAmount) * 100) / 100,
    }))
  }, [])

  const buyTheme = useCallback(async (theme: Theme, price: number): Promise<boolean> => {
    if (isServerEconomyEnabled()) {
      try {
        const out = await requestBuyTheme(theme)
        setState((prev) => {
          const newOwnedThemes = prev.ownedThemes.includes(theme)
            ? prev.ownedThemes
            : [...prev.ownedThemes, theme]
          const spent = prev.coins - Number(out.coin_balance)
          return {
            ...prev,
            coins: Number(out.coin_balance),
            freeSpins: Number(out.free_spin_balance),
            bonusProgress: Number(out.bonus_meter_progress ?? 0),
            ownedThemes: newOwnedThemes,
            coinLedger:
              spent > 0
                ? appendCoinLedger(
                    prev.coinLedger,
                    -spent,
                    Number(out.coin_balance),
                    'theme_unlock',
                    `Theme: ${theme}`,
                  )
                : prev.coinLedger,
            trophies: checkTrophyUnlocks(prev.trophies, {
              ownedThemesCount: newOwnedThemes.length,
            }),
          }
        })
        queueMicrotask(() => track(AnalyticsEvents.THEME_UNLOCKED, { theme }))
        return true
      } catch {
        return false
      }
    }

    let success = false
    setState((prev) => {
      if (prev.coins >= price && !prev.ownedThemes.includes(theme)) {
        success = true
        const newOwnedThemes = [...prev.ownedThemes, theme]
        const bal = prev.coins - price
        return {
          ...prev,
          coins: bal,
          coinLedger: appendCoinLedger(prev.coinLedger, -price, bal, 'theme_unlock', `Theme: ${theme}`),
          ownedThemes: newOwnedThemes,
          trophies: checkTrophyUnlocks(prev.trophies, {
            ownedThemesCount: newOwnedThemes.length,
          }),
        }
      }
      return prev
    })
    if (success) {
      queueMicrotask(() => track(AnalyticsEvents.THEME_UNLOCKED, { theme }))
    }
    return success
  }, [])

  const setBet = useCallback((bet: number) => {
    let clampedForTrack = 0
    setState((prev) => {
      // Unlock gate + paid-spin affordability (free spins ignore coin cost but still respect gate).
      const clamped = clampBetForWallet(bet, prev.coins, prev.freeSpins)
      clampedForTrack = clamped
      const maxUnlocked = clampBetSelect(MAX_LINE_BET, prev.coins)
      const isMaxBet = clamped === maxUnlocked
      const updatedMissions = !isServerEconomyEnabled()
        ? prev.missions.map((m) => {
            if (m.id === 'maxbet1' && isMaxBet && !m.completed) {
              return { ...m, progress: 1, completed: true }
            }
            return m
          })
        : prev.missions
      return {
        ...prev,
        currentBet: clamped,
        maxBetUsed: isMaxBet || prev.maxBetUsed,
        missions: updatedMissions,
      }
    })
    queueMicrotask(() => track(AnalyticsEvents.BET_CHANGED, { bet: clampedForTrack }))
  }, [])

  const spin = useCallback(async (): Promise<SpinResult> => {
    const snapshot = stateRef.current
    const betCost = snapshot.freeSpins > 0 ? 0 : snapshot.currentBet
    if (snapshot.coins < betCost || snapshot.isSpinning) {
      return emptySpinResult(snapshot)
    }

    // Free spins pay out at the player's actual bet — cost is still $0,
    // but payout uses currentBet so the spin is genuinely valuable at every level.
    const lineBet = snapshot.currentBet
    spinLineBetRef.current = lineBet

    if (isServerSpinEnabled()) {
      try {
        const payload = await requestServerSpin(lineBet)
        serverSpinPayloadRef.current = payload
        const usedFreeSpin = snapshot.freeSpins > 0
        spinWasFreeRef.current = usedFreeSpin
        queueMicrotask(() =>
          track(AnalyticsEvents.SPIN_STARTED, {
            bet_coins: lineBet,
            used_free_spin: usedFreeSpin,
          }),
        )
        setState((prev) => ({
          ...prev,
          spinSyncDeferred: false,
          coins: payload.coin_balance,
          freeSpins: payload.free_spin_balance,
          bonusProgress: payload.bonus_meter_progress,
          isSpinning: true,
          activeSpinIsFree: usedFreeSpin,
          reelsLocked: false,
          winningLines: [],
          winningPositions: new Set(),
          lastWin: 0,
          lastWinType: 'none',
          winMultiplier: 0,
          lastSpinFreeSpinsWon: 0,
          lastSpinXpGained: 0,
          lastBonusMeterPayout: 0,
          lastScatterPayout: 0,
          lastScatterCount: 0,
          lastJackpotBonus: 0,
          lastMysteryMultiplier: null,
        }))
        return await new Promise<SpinResult>((resolve) => {
          spinResolveRef.current = resolve
        })
      } catch {
        setState((prev) => ({ ...prev, spinSyncDeferred: true }))
        const now = Date.now()
        if (now - lastServerFallbackToastAtRef.current >= FALLBACK_TOAST_THROTTLE_MS) {
          lastServerFallbackToastAtRef.current = now
          Toast.show({
            type: 'info',
            text1: 'Playing on device this spin',
            text2: 'Could not reach server — tap the banner below when online to sync.',
          })
        }
        /* fall through to local RNG spin */
      }
    }

    return await new Promise<SpinResult>((resolve) => {
      setState((prev) => {
        const bc = prev.freeSpins > 0 ? 0 : prev.currentBet
        if (prev.coins < bc || prev.isSpinning) {
          queueMicrotask(() => resolve(emptySpinResult(prev)))
          return prev
        }

        spinResolveRef.current = resolve

        const usedFreeSpin = prev.freeSpins > 0
        spinWasFreeRef.current = usedFreeSpin
        queueMicrotask(() =>
          track(AnalyticsEvents.SPIN_STARTED, {
            bet_coins: spinLineBetRef.current,
            used_free_spin: usedFreeSpin,
          }),
        )

        const balanceAfterBet = prev.coins - bc
        let ledger = prev.coinLedger
        if (bc > 0) {
          ledger = appendCoinLedger(
            ledger,
            -bc,
            balanceAfterBet,
            'spin_bet',
            `Spin cost −${bc.toLocaleString()} virtual coins`,
          )
        }

        return {
          ...prev,
          coins: balanceAfterBet,
          coinLedger: ledger,
          isSpinning: true,
          activeSpinIsFree: usedFreeSpin,
          reelsLocked: false,
          freeSpins: prev.freeSpins > 0 ? prev.freeSpins - 1 : prev.freeSpins,
          winningLines: [],
          winningPositions: new Set(),
          lastWin: 0,
          lastWinType: 'none',
          winMultiplier: 0,
          lastSpinFreeSpinsWon: 0,
          lastSpinXpGained: 0,
          lastBonusMeterPayout: 0,
          lastScatterPayout: 0,
          lastScatterCount: 0,
          lastJackpotBonus: 0,
          lastMysteryMultiplier: null,
        }
      })
    })
  }, [])

  const stopSpin = useCallback(() => {
    let deferWalletRefresh = false
    setState((prev) => {
      if (!prev.isSpinning) return prev

      const serverPayload = serverSpinPayloadRef.current
      if (serverPayload) {
        serverSpinPayloadRef.current = null
        const summary = serverPayload.result_summary
        const newGrid = gridIdsToReelGrid(serverPayload.grid)
        const totalWin = summary.total_win
        const freeSpinsWon = summary.free_spins_won
        const isJackpot = summary.is_jackpot
        const jackpotBonus = summary.jackpot_bonus ?? 0
        const winMultiplier = summary.win_multiplier
        const winType = summary.win_type as WinType
        const bonusMeterPayout = summary.bonus_meter_payout
        const bonusProgress = summary.bonus_progress_after

        const positions = new Set<string>()
        const winningLines: WinningLine[] = summary.winning_lines.map((wl) => ({
          positions: wl.positions,
          symbol: SYMBOLS.find((s) => s.id === wl.symbol_id) ?? SYMBOLS[3],
          multiplier: wl.multiplier,
        }))
        winningLines.forEach((line) => {
          line.positions.forEach(([col, row]) => positions.add(`${col}-${row}`))
        })

        const updatedMissions = prev.missions.map((m) => {
          if (m.id === 'spin20' && !m.completed) {
            const newProgress = m.progress + 1
            return { ...m, progress: newProgress, completed: newProgress >= m.target }
          }
          if (m.id === 'win5' && totalWin > 0 && !m.completed) {
            const newProgress = m.progress + 1
            return { ...m, progress: newProgress, completed: newProgress >= m.target }
          }
          return m
        })

        const missionsForState = isServerEconomyEnabled() ? prev.missions : updatedMissions

        const scatterPayoutAmt = summary.scatter_payout ?? 0
        const payHint = spinPaylinesHint(summary.winning_lines, scatterPayoutAmt, isJackpot)
        const result: SpinResult = {
          win: totalWin,
          grid: newGrid,
          isJackpot,
          freeSpinsWon,
          winningLines,
          winType,
          winMultiplier,
          bonusMeterPayout,
          scatterPayout: scatterPayoutAmt,
        }

        queueMicrotask(() => {
          track(AnalyticsEvents.SPIN_COMPLETED, {
            win_coins: totalWin,
            win_type: winType,
            free_spins_won: freeSpinsWon,
            is_jackpot: isJackpot,
            bet_coins: spinLineBetRef.current,
          })
          if (totalWin > 0) {
            track(AnalyticsEvents.WIN_RECEIVED, {
              amount: totalWin,
              win_type: winType,
            })
          }
          if (freeSpinsWon > 0) {
            track(AnalyticsEvents.BONUS_TRIGGERED, { free_spins_won: freeSpinsWon })
          }
          if (bonusMeterPayout > 0) {
            track(AnalyticsEvents.BONUS_METER_PAID, {
              coins: bonusMeterPayout,
              bet: spinLineBetRef.current,
            })
          }
          if (isJackpot) {
            track(AnalyticsEvents.JACKPOT_HIT, { win_coins: totalWin })
          }
          const finish = spinResolveRef.current
          spinResolveRef.current = null
          finish?.(result)
          void patchPlayerProgress()
          if (isServerEconomyEnabled()) {
            void hydrateMissionsAndWheelFromServer()
          }
        })

        const paidSpinXp =
          spinXp(spinLineBetRef.current, totalWin) + (bonusMeterPayout > 0 ? BONUS_METER_XP : 0)
        const srvXpGain = spinWasFreeRef.current ? 0 : paidSpinXp
        const srvLvl = computeXpGain(prev.xp, prev.level, srvXpGain)

        return {
          ...prev,
          spinSyncDeferred: false,
          isSpinning: false,
          activeSpinIsFree: false,
          reelsLocked: true,
          reelGrid: newGrid,
          lastWin: totalWin,
          winMultiplier,
          lastWinType: winType,
          winningLines,
          winningPositions: positions,
          coins: prev.coins,
          freeSpins: prev.freeSpins,
          lastSpinFreeSpinsWon: freeSpinsWon,
          isJackpotMode: isJackpot,
          jackpotMultiplier: 1,
          bonusProgress,
          lastBonusMeterPayout: bonusMeterPayout,
          lastScatterPayout: summary.scatter_payout ?? 0,
          lastScatterCount: summary.scatter_count ?? 0,
          lastJackpotBonus: summary.jackpot_bonus ?? 0,
        lastMysteryMultiplier: summary.mystery_multiplier ?? null,
        // Server spin path does not yet track free spin streak state —
        // multiplier is reset so it doesn't carry over into a future local spin session.
        freeSpinMultiplier: 1,
        lastFreeSpinMultiplier: 1,
        jackpotLastWonAt: isJackpot ? new Date().toISOString() : prev.jackpotLastWonAt,
        jackpotWinners: isJackpot
          ? [
              { username: prev.username || 'You', ts: new Date().toISOString(), amount: summary.jackpot_bonus ?? jackpotPayoutForBet(spinLineBetRef.current) },
              ...prev.jackpotWinners.slice(0, MAX_JACKPOT_WINNERS - 1),
            ]
          : prev.jackpotWinners,
        missions: missionsForState,
          totalSpins: prev.totalSpins + 1,
          ...tickMonthlySpins(prev),
          totalWins: totalWin > 0 ? prev.totalWins + 1 : prev.totalWins,
          biggestWin: Math.max(prev.biggestWin, totalWin),
          // Server manages coin/freeSpin balance; we only track XP + level locally.
          xp: srvLvl.xp,
          level: srvLvl.level,
          lastSpinXpGained: srvXpGain,
          leaderboardStats: {
            ...prev.leaderboardStats,
            weeklyBiggestWin: Math.max(prev.leaderboardStats.weeklyBiggestWin, totalWin),
            weeklyTotalWinnings: prev.leaderboardStats.weeklyTotalWinnings + totalWin,
            allTimeTotalWinnings: prev.leaderboardStats.allTimeTotalWinnings + totalWin,
          },
          recentBigWins:
            winType !== 'none' && winType !== 'normal'
              ? [
                  {
                    amount: totalWin,
                    multiplier: winMultiplier,
                    timestamp: new Date().toISOString(),
                    type: winType,
                  },
                  ...prev.recentBigWins.slice(0, 9),
                ]
              : prev.recentBigWins,
          spinAudit: [
            {
              ts: new Date().toISOString(),
              bet: spinLineBetRef.current,
              win: totalWin,
              winType,
              freeSpin: spinWasFreeRef.current,
              reelMiddle: newGrid.map((col) => col[1]?.emoji ?? '?'),
              winningColsMiddle: [0,1,2,3,4].filter((c) => positions.has(`${c}-1`)),
              xpGained: srvXpGain,
              paylinesHint: payHint,
              winMultiplier,
            },
            ...prev.spinAudit.slice(0, MAX_SPIN_AUDIT - 1),
          ],
          spinSequence: prev.spinSequence + 1,
          trophies: checkTrophyUnlocks(prev.trophies, {
            winType,
            level: srvLvl.level,
            allTimeTotalWinnings: prev.leaderboardStats.allTimeTotalWinnings + totalWin,
            dailyStreak: prev.dailyStreak,
          }),
        }
      }

      deferWalletRefresh = prev.spinSyncDeferred && isServerSpinEnabled()

      const gridIds = buildRandomGridIds()
      const newGrid = gridIdsToReelGrid(gridIds)
      const lineBet = spinLineBetRef.current
      const summary = evaluateGrid(gridIds, lineBet, prev.bonusProgress)

      const rawTotalWin = summary.total_win
      const freeSpinsWon = summary.free_spins_won
      const isJackpot = summary.is_jackpot
      const jackpotBonus = summary.jackpot_bonus ?? 0
      const winMultiplier = summary.win_multiplier
      const winType = summary.win_type
      const bonusMeterPayout = summary.bonus_meter_payout
      const bonusProgress = summary.bonus_progress_after

      // ── Free spin streak multiplier (local path only) ─────────────────────
      // Applies to the entire spin win. Resets on blank or when paid spins resume.
      // Server spin path does not yet participate; it tracks state independently.
      const appliedFsMultiplier = spinWasFreeRef.current ? prev.freeSpinMultiplier : 1
      const totalWin = rawTotalWin * appliedFsMultiplier

      // Advance or reset the streak for the NEXT free spin.
      const nextFreeSpinMultiplier = spinWasFreeRef.current
        ? rawTotalWin > 0
          ? Math.min(5, prev.freeSpinMultiplier + 1) // win → climb streak (cap at 5×)
          : 1                                         // blank → reset streak
        : 1                                           // paid spin → session over

      const { winningLines, positions } = winningLinesAndPositionsFromSerialized(
        summary.winning_lines,
      )

      let ledger = prev.coinLedger
      let runningBal = prev.coins + totalWin
      if (totalWin > 0) {
        const label = appliedFsMultiplier > 1
          ? `Spin win (${winType}) ×${appliedFsMultiplier} free spin streak`
          : `Spin win (${winType})`
        ledger = appendCoinLedger(ledger, totalWin, runningBal, 'spin_win', label)
      }
      if (bonusMeterPayout > 0) {
        runningBal += bonusMeterPayout
        ledger = appendCoinLedger(
          ledger,
          bonusMeterPayout,
          runningBal,
          'bonus_meter_full',
          `Bonus meter +${bonusMeterPayout.toLocaleString()} virtual coins`
        )
      }
      if (jackpotBonus > 0) {
        runningBal += jackpotBonus
        ledger = appendCoinLedger(
          ledger,
          jackpotBonus,
          runningBal,
          'jackpot_win',
          `Jackpot Mode +$${jackpotBonus.toLocaleString()} virtual coins`
        )
      }

      // Update missions
      const updatedMissions = prev.missions.map(m => {
        if (m.id === "spin20" && !m.completed) {
          const newProgress = m.progress + 1
          return { ...m, progress: newProgress, completed: newProgress >= m.target }
        }
        if (m.id === "win5" && totalWin > 0 && !m.completed) {
          const newProgress = m.progress + 1
          return { ...m, progress: newProgress, completed: newProgress >= m.target }
        }
        return m
      })

      // Scatter coins also participate in the free spin streak multiplier.
      // Jackpot bonus and bonus meter payout are excluded — those are independent prizes.
      const rawScatterPayout = summary.scatter_payout ?? 0
      const scatterPayoutAmt = rawScatterPayout * appliedFsMultiplier
      const payHint = spinPaylinesHint(summary.winning_lines, rawScatterPayout, isJackpot)
      const result: SpinResult = {
        win: totalWin,
        grid: newGrid,
        isJackpot,
        freeSpinsWon,
        winningLines,
        winType,
        winMultiplier,
        bonusMeterPayout,
        scatterPayout: scatterPayoutAmt,
      }

      queueMicrotask(() => {
        track(AnalyticsEvents.SPIN_COMPLETED, {
          win_coins: totalWin,
          win_type: winType,
          free_spins_won: freeSpinsWon,
          is_jackpot: isJackpot,
          bet_coins: spinLineBetRef.current,
          fs_multiplier: appliedFsMultiplier,
        })
        if (totalWin > 0) {
          track(AnalyticsEvents.WIN_RECEIVED, {
            amount: totalWin,
            win_type: winType,
          })
        }
        if (freeSpinsWon > 0) {
          track(AnalyticsEvents.BONUS_TRIGGERED, { free_spins_won: freeSpinsWon })
        }
        if (bonusMeterPayout > 0) {
          track(AnalyticsEvents.BONUS_METER_PAID, {
            coins: bonusMeterPayout,
            bet: spinLineBetRef.current,
          })
        }
        if (isJackpot) {
          track(AnalyticsEvents.JACKPOT_HIT, { win_coins: totalWin })
        }
        const finish = spinResolveRef.current
        spinResolveRef.current = null
        finish?.(result)
        void patchPlayerProgress()
      })

      // ── XP + level-up (exponential curve) ────────────────────────────────
      const paidSpinXp =
        spinXp(spinLineBetRef.current, totalWin) + (bonusMeterPayout > 0 ? BONUS_METER_XP : 0)
      const xpGain = spinWasFreeRef.current ? 0 : paidSpinXp
      const lvl = computeXpGain(prev.xp, prev.level, xpGain)
      // Apply level-up coin + free-spin bonuses on top of the already-computed balance
      let finalBal = runningBal + lvl.coinDelta
      let finalLedger = ledger
      for (const e of lvl.ledger) {
        finalLedger = appendCoinLedger(finalLedger, e.amount, finalBal, 'level_up_bonus', e.label)
      }
      const finalFreeSpins = prev.freeSpins + freeSpinsWon + lvl.freeSpinDelta

      return {
        ...prev,
        isSpinning: false,
        activeSpinIsFree: false,
        reelsLocked: true,
        reelGrid: newGrid,
        lastWin: totalWin,
        winMultiplier,
        lastWinType: winType,
        winningLines,
        winningPositions: positions,
        coins: finalBal,
        coinLedger: finalLedger,
        freeSpins: finalFreeSpins,
        lastSpinFreeSpinsWon: freeSpinsWon,
        lastSpinXpGained: xpGain,
        isJackpotMode: isJackpot,
        jackpotMultiplier: 1,
        bonusProgress,
        lastBonusMeterPayout: bonusMeterPayout,
        lastScatterPayout: scatterPayoutAmt,
        lastScatterCount: summary.scatter_count ?? 0,
        lastJackpotBonus: isJackpot ? jackpotPayoutForBet(spinLineBetRef.current) : 0,
        lastMysteryMultiplier: summary.mystery_multiplier ?? null,
        freeSpinMultiplier: nextFreeSpinMultiplier,
        lastFreeSpinMultiplier: appliedFsMultiplier,
        jackpotLastWonAt: isJackpot ? new Date().toISOString() : prev.jackpotLastWonAt,
        jackpotWinners: isJackpot
          ? [
              { username: prev.username || 'You', ts: new Date().toISOString(), amount: jackpotPayoutForBet(spinLineBetRef.current) },
              ...prev.jackpotWinners.slice(0, MAX_JACKPOT_WINNERS - 1),
            ]
          : prev.jackpotWinners,
        missions: updatedMissions,
        totalSpins: prev.totalSpins + 1,
        ...tickMonthlySpins(prev),
        totalWins: totalWin > 0 ? prev.totalWins + 1 : prev.totalWins,
        biggestWin: Math.max(prev.biggestWin, totalWin),
        xp: lvl.xp,
        level: lvl.level,
        leaderboardStats: {
          ...prev.leaderboardStats,
          weeklyBiggestWin: Math.max(prev.leaderboardStats.weeklyBiggestWin, totalWin),
          weeklyTotalWinnings: prev.leaderboardStats.weeklyTotalWinnings + totalWin,
          allTimeTotalWinnings: prev.leaderboardStats.allTimeTotalWinnings + totalWin,
        },
        recentBigWins: winType !== "none" && winType !== "normal"
          ? [
              { amount: totalWin, multiplier: winMultiplier, timestamp: new Date().toISOString(), type: winType },
              ...prev.recentBigWins.slice(0, 9),
            ]
          : prev.recentBigWins,
        spinAudit: [
          {
            ts: new Date().toISOString(),
            bet: lineBet,
            win: totalWin,
            winType,
            freeSpin: spinWasFreeRef.current,
            reelMiddle: newGrid.map((col) => col[1]?.emoji ?? '?'),
            winningColsMiddle: [0,1,2,3,4].filter((c) => positions.has(`${c}-1`)),
            xpGained: xpGain,
            paylinesHint: payHint,
            winMultiplier,
          },
          ...prev.spinAudit.slice(0, MAX_SPIN_AUDIT - 1),
        ],
        spinSequence: prev.spinSequence + 1,
        trophies: checkTrophyUnlocks(prev.trophies, {
          winType,
          level: lvl.level,
          allTimeTotalWinnings: prev.leaderboardStats.allTimeTotalWinnings + totalWin,
          dailyStreak: prev.dailyStreak,
        }),
        spinSyncDeferred: prev.spinSyncDeferred,
      }
    })
    queueMicrotask(() => {
      if (deferWalletRefresh) void resyncWalletFromServer()
    })
  }, [resyncWalletFromServer, hydrateMissionsAndWheelFromServer, patchPlayerProgress])

  /** Offline / fallback: updates coins only in React state (no Postgres write). */
  const claimDailyRewardLocal = useCallback((day: number): boolean => {
    let success = false
    setState((prev) => {
      const today = new Date().toDateString()
      const reward = prev.dailyRewards.find((r) => r.day === day)

      if (reward && !reward.claimed && day === prev.dailyStreak + 1) {
        success = true
        const newStreak = day
        const weekDone = newStreak >= DAILY_LOGIN_REWARD_COINS.length
        const bal = prev.coins + reward.coins
        // Every daily claim gives free spins — plentiful at low levels, nearly
        // worthless to whales (who bet >> $250 / spin), creating natural scarcity.
        return {
          ...prev,
          coins: bal,
          coinLedger: appendCoinLedger(
            prev.coinLedger,
            reward.coins,
            bal,
            'daily_reward',
            `Daily reward day ${day}`,
          ),
          freeSpins: prev.freeSpins + DAILY_STREAK_FREE_SPINS_PER_CLAIM,
          dailyStreak: newStreak,
          weeklyStreakCompleted: weekDone,
          dailyRewards: prev.dailyRewards.map((r) =>
            r.day === day ? { ...r, claimed: true } : r,
          ),
          lastClaimDate: today,
          trophies: checkTrophyUnlocks(prev.trophies, {
            dailyStreak: newStreak,
          }),
        }
      }
      return prev
    })
    if (success) {
      queueMicrotask(() => track(AnalyticsEvents.DAILY_REWARD_CLAIMED, { day }))
    }
    return success
  }, [])

  const claimDailyReward = useCallback(
    async (day: number): Promise<boolean> => {
      if (isServerEconomyEnabled()) {
        try {
          const out = await requestClaimDailyReward(day)
          const today = new Date().toDateString()
          setState((prev) => ({
            ...prev,
            coins: Number(out.coin_balance),
            freeSpins: Number(out.free_spin_balance),
            bonusProgress: Number(out.bonus_meter_progress ?? 0),
            dailyStreak: out.daily_streak_after,
            weeklyStreakCompleted: out.daily_streak_after >= DAILY_LOGIN_REWARD_COINS.length,
            dailyRewards: prev.dailyRewards.map((r) =>
              r.day === day ? { ...r, claimed: true } : r,
            ),
            lastClaimDate: today,
            trophies: checkTrophyUnlocks(prev.trophies, {
              dailyStreak: out.daily_streak_after,
            }),
          }))
          queueMicrotask(() => track(AnalyticsEvents.DAILY_REWARD_CLAIMED, { day }))
          return true
        } catch {
          // Do not fall back locally when economy mode is on — avoids double-credit if the server committed.
          return false
        }
      }
      return claimDailyRewardLocal(day)
    },
    [claimDailyRewardLocal],
  )

  const spinDailyWheel = useCallback(async (): Promise<number> => {
    if (isServerEconomyEnabled()) {
      try {
        const out = await requestSpinDailyWheel()
        const reward = Number(out.reward_coins)
        setState((prev) => ({
          ...prev,
          coins: Number(out.coin_balance),
          freeSpins: Number(out.free_spin_balance),
          bonusProgress: Number(out.bonus_meter_progress ?? 0),
          coinLedger: appendCoinLedger(
            prev.coinLedger,
            reward,
            Number(out.coin_balance),
            'daily_wheel',
            `Daily wheel +${reward.toLocaleString()} virtual coins`,
          ),
          dailyWheel: {
            lastWheelSpinAt: new Date().toISOString(),
            dailyWheelClaimed: true,
            wheelReward: reward,
          },
        }))
        return reward
      } catch {
        return 0
      }
    }

    const snap = stateRef.current
    if (snap.dailyWheel.dailyWheelClaimed) return 0
    const reward = WHEEL_REWARDS[Math.floor(Math.random() * WHEEL_REWARDS.length)]
    const bal = snap.coins + reward
    setState((prev) => {
      if (prev.dailyWheel.dailyWheelClaimed) return prev
      return {
        ...prev,
        coins: bal,
        coinLedger: appendCoinLedger(
          prev.coinLedger,
          reward,
          bal,
          'daily_wheel',
          `Daily wheel +${reward.toLocaleString()} virtual coins`,
        ),
        dailyWheel: {
          lastWheelSpinAt: new Date().toISOString(),
          dailyWheelClaimed: true,
          wheelReward: reward,
        },
      }
    })
    return reward
  }, [])

  const claimMissionReward = useCallback(async (missionId: string): Promise<boolean> => {
    if (isServerEconomyEnabled()) {
      try {
        const out = await requestClaimMissionReward(missionId)
        setState((prev) => ({
          ...prev,
          coins: Number(out.coin_balance),
          freeSpins: Number(out.free_spin_balance),
          bonusProgress: Number(out.bonus_meter_progress ?? 0),
          coinLedger: appendCoinLedger(
            prev.coinLedger,
            Number(out.coins_granted),
            Number(out.coin_balance),
            'mission_reward',
            prev.missions.find((m) => m.id === missionId)?.name ?? missionId,
          ),
          missions: prev.missions.map((m) => (m.id === missionId ? { ...m, claimed: true } : m)),
        }))
        queueMicrotask(() => track(AnalyticsEvents.MISSION_COMPLETED, { mission_id: missionId }))
        return true
      } catch {
        return false
      }
    }

    let success = false
    setState((prev) => {
      const mission = prev.missions.find((m) => m.id === missionId)
      if (mission && mission.completed && !mission.claimed) {
        success = true
        const bal = prev.coins + mission.reward
        const baseLedger = appendCoinLedger(
          prev.coinLedger,
          mission.reward,
          bal,
          'mission_reward',
          mission.name,
        )
        // Route XP through computeXpGain so mission completion can trigger level-ups
        // (including milestone coin + free-spin rewards at levels 5, 10, 20 …)
        const lvl = computeXpGain(prev.xp, prev.level, mission.xpReward ?? 0)
        let finalBal = bal + lvl.coinDelta
        let finalLedger = baseLedger
        for (const e of lvl.ledger) {
          finalLedger = appendCoinLedger(finalLedger, e.amount, finalBal, 'level_up_bonus', e.label)
        }
        return {
          ...prev,
          coins: finalBal,
          coinLedger: finalLedger,
          xp: lvl.xp,
          level: lvl.level,
          freeSpins: prev.freeSpins + lvl.freeSpinDelta,
          trophies: checkTrophyUnlocks(prev.trophies, { level: lvl.level }),
          missions: prev.missions.map((m) => (m.id === missionId ? { ...m, claimed: true } : m)),
        }
      }
      return prev
    })
    if (success) {
      queueMicrotask(() => track(AnalyticsEvents.MISSION_COMPLETED, { mission_id: missionId }))
    }
    return success
  }, [])

  const setUsername = useCallback((name: string) => {
    setState(prev => ({ ...prev, username: name }))
  }, [])

  const setBio = useCallback((bio: string) => {
    setState(prev => ({ ...prev, bio }))
  }, [])

  const setAvatarUri = useCallback((uri: string | null) => {
    setState(prev => ({ ...prev, avatarUri: uri }))
  }, [])

  const addXp = useCallback((amount: number) => {
    setState(prev => {
      const lvl = computeXpGain(prev.xp, prev.level, amount)
      let coins = prev.coins + lvl.coinDelta
      let coinLedger = prev.coinLedger
      for (const e of lvl.ledger) {
        coinLedger = appendCoinLedger(coinLedger, e.amount, coins, 'level_up_bonus', e.label)
      }
      return {
        ...prev,
        xp: lvl.xp,
        level: lvl.level,
        coins,
        coinLedger,
        freeSpins: prev.freeSpins + lvl.freeSpinDelta,
        trophies: checkTrophyUnlocks(prev.trophies, { level: lvl.level }),
      }
    })
  }, [])

  const toggleSound = useCallback(() => {
    setState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))
  }, [])

  const toggleMusic = useCallback(() => {
    setState(prev => ({ ...prev, musicEnabled: !prev.musicEnabled }))
  }, [])

  const toggleHaptics = useCallback(() => {
    setState(prev => ({ ...prev, hapticsEnabled: !prev.hapticsEnabled }))
  }, [])

  const toggleNotifications = useCallback(() => {
    setState(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))
  }, [])

  const setSessionReminder = useCallback((minutes: number | null) => {
    setState(prev => ({ ...prev, sessionReminderMinutes: minutes }))
  }, [])

  const setPurchaseLimit = useCallback((limit: number | null) => {
    setState(prev => ({ ...prev, dailyPurchaseLimit: limit }))
  }, [])

  const toggleCooldown = useCallback(() => {
    setState(prev => ({ ...prev, cooldownEnabled: !prev.cooldownEnabled }))
  }, [])

  const clearLastSpinFreeSpinsBonus = useCallback(() => {
    setState((prev) => ({ ...prev, lastSpinFreeSpinsWon: 0 }))
  }, [])

  const buyVanityItem = useCallback((itemId: string, priceCoins: number): boolean => {
    let success = false
    setState(prev => {
      if (prev.coins >= priceCoins && !prev.userVanity.ownedItemIds.includes(itemId)) {
        success = true
        const bal = prev.coins - priceCoins
        let ledger = prev.coinLedger
        if (priceCoins > 0) {
          ledger = appendCoinLedger(
            ledger,
            -priceCoins,
            bal,
            'vanity_purchase',
            `Vanity ${itemId}`
          )
        }
        return {
          ...prev,
          coins: bal,
          coinLedger: ledger,
          userVanity: {
            ...prev.userVanity,
            ownedItemIds: [...prev.userVanity.ownedItemIds, itemId],
          },
        }
      }
      return prev
    })
    return success
  }, [])

  const equipVanityItem = useCallback((category: VanityCategory, itemId: string) => {
    let didEquip = false
    setState(prev => {
      if (!prev.userVanity.ownedItemIds.includes(itemId)) return prev
      
      // Map category to the correct equipped field
      const categoryToField: Record<VanityCategory, keyof UserVanity> = {
        avatar: "equippedAvatarId",
        frame: "equippedFrameId",
        title: "equippedTitleId",
        pet: "equippedPetId",
        cabinet: "equippedCabinetId",
        room: "featuredRoomId",
        car: "featuredCarId",
        badge: "equippedAvatarId", // Badges don't have equipped field, skip
      }
      
      const field = categoryToField[category]
      if (!field || category === "badge") return prev

      didEquip = true
      return {
        ...prev,
        userVanity: {
          ...prev.userVanity,
          [field]: itemId,
        },
      }
    })
    if (didEquip) {
      queueMicrotask(() =>
        track(AnalyticsEvents.COSMETIC_EQUIPPED, { category, item_id: itemId }),
      )
    }
  }, [])

  const setFeaturedItem = useCallback((type: "car" | "room", itemId: string | undefined) => {
    let updated = false
    setState(prev => {
      const field = type === "car" ? "featuredCarId" : "featuredRoomId"
      if (itemId && !prev.userVanity.ownedItemIds.includes(itemId)) return prev
      if (itemId) updated = true
      return {
        ...prev,
        userVanity: {
          ...prev.userVanity,
          [field]: itemId,
        },
      }
    })
    if (itemId && updated) {
      queueMicrotask(() =>
        track(AnalyticsEvents.COSMETIC_EQUIPPED, {
          category: type === "car" ? "featured_car" : "featured_room",
          item_id: itemId,
        }),
      )
    }
  }, [])

  const unlockTrophy = useCallback((trophyId: string) => {
    setState(prev => {
      const trophy = prev.trophies.find(t => t.id === trophyId)
      if (!trophy || trophy.unlocked) return prev
      
      return {
        ...prev,
        trophies: prev.trophies.map(t => 
          t.id === trophyId 
            ? { ...t, unlocked: true, unlockedAt: new Date().toISOString() }
            : t
        ),
      }
    })
  }, [])

  const value: GameState & GameActions = {
    ...state,
    setCoins,
    addCoins,
    subtractCoins,
    setTheme,
    buyTheme,
    buyFreeSpinsWithCoins,
    addFreeSpins,
    setBet,
    spin,
    stopSpin,
    claimDailyReward,
    spinDailyWheel,
    claimMissionReward,
    setUsername,
    setBio,
    setAvatarUri,
    addXp,
    toggleSound,
    toggleMusic,
    toggleHaptics,
    toggleNotifications,
    setSessionReminder,
    setPurchaseLimit,
    toggleCooldown,
    clearLastSpinFreeSpinsBonus,
    resyncWalletFromServer,
    buyVanityItem,
    equipVanityItem,
    setFeaturedItem,
    unlockTrophy,
    recordIapSpend,
    isTournamentEligible:
      state.level >= TOURNAMENT_MIN_LEVEL &&
      state.totalIapSpent >= TOURNAMENT_MIN_IAP_USD &&
      state.monthlySpins >= TOURNAMENT_MIN_MONTHLY_SPINS,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}

export { SYMBOLS, BET_OPTIONS, WHEEL_REWARDS, FREE_SPIN_LINE_BET, clampBetSelect, clampBetForWallet }
