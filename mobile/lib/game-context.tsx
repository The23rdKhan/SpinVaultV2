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
import { track } from '@/lib/analytics/track'
import { AnalyticsEvents } from '@shared/analytics/event-names'
import { DAILY_LOGIN_REWARD_COINS } from '@shared/economy/daily-login-rewards'
import { 
  type VanityCategory, 
  type Trophy, 
  type UserVanity,
  generateInitialTrophies,
  getDefaultUserVanity,
  ALL_VANITY_ITEMS,
} from "./vanity-data"

export type Theme = "vegas" | "cyber" | "treasure"
export type WinType = "none" | "normal" | "bigWin" | "megaWin" | "jackpot"

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

function bonusMeterPayoutForBet(currentBet: number): number {
  return Math.min(5000, Math.max(350, Math.round(currentBet * 8)))
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
  reelsLocked: boolean // New: true when result is determined but animation may continue
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
  level: number
  xp: number
  totalSpins: number
  /** Incremented when a spin finishes (result committed); used to gate win UI once per spin. */
  spinSequence: number
  biggestWin: number
  totalWins: number
  maxBetUsed: boolean // For mission tracking
  
  // Vanity System
  userVanity: UserVanity
  trophies: Trophy[]
  leaderboardStats: LeaderboardStats
  
  // Recent Big Wins (for social feed)
  recentBigWins: { amount: number; multiplier: number; timestamp: string; type: WinType }[]
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
  setBet: (bet: number) => void
  spin: () => Promise<SpinResult>
  stopSpin: () => void
  /** Resolves false if the claim is invalid or the server rejects the sequence. */
  claimDailyReward: (day: number) => Promise<boolean>
  spinDailyWheel: () => Promise<number>
  claimMissionReward: (missionId: string) => Promise<boolean>
  setUsername: (name: string) => void
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
}

const SYMBOLS: SlotSymbol[] = [
  { id: "seven", name: "Lucky Seven", emoji: "7", value: 100 },
  { id: "diamond", name: "Diamond", emoji: "D", value: 75 },
  { id: "bell", name: "Bell", emoji: "B", value: 50 },
  { id: "cherry", name: "Cherry", emoji: "C", value: 30 },
  { id: "lemon", name: "Lemon", emoji: "L", value: 20 },
  { id: "orange", name: "Orange", emoji: "O", value: 15 },
  { id: "grape", name: "Grape", emoji: "G", value: 10 },
  { id: "wild", name: "Wild", emoji: "W", value: 0, isWild: true },
  { id: "scatter", name: "Scatter", emoji: "S", value: 0, isScatter: true },
]

const BET_OPTIONS = [10, 25, 50, 100, 250, 500]

/** Payout lines for a free spin use this bet; coin cost remains 0. */
const FREE_SPIN_LINE_BET = 250

const WHEEL_REWARDS = [50, 100, 150, 200, 300, 500, 750, 1000]

const INITIAL_DAILY_REWARDS: DailyReward[] = DAILY_LOGIN_REWARD_COINS.map((coins, i) => ({
  day: i + 1,
  coins,
  claimed: false,
}))

const INITIAL_MISSIONS: Mission[] = [
  { id: "spin20", name: "Spin Master", description: "Complete 20 spins", target: 20, progress: 0, reward: 500, completed: false, claimed: false },
  { id: "win5", name: "Lucky Streak", description: "Win 5 times", target: 5, progress: 0, reward: 300, completed: false, claimed: false },
  { id: "maxbet1", name: "High Roller", description: "Use Max Bet once", target: 1, progress: 0, reward: 200, completed: false, claimed: false },
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

// Determine win type based on multiplier thresholds
const getWinType = (winMultiplier: number): WinType => {
  if (winMultiplier >= 25) return "jackpot"
  if (winMultiplier >= 10) return "megaWin"
  if (winMultiplier >= 5) return "bigWin"
  if (winMultiplier > 0) return "normal"
  return "none"
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
    // Mega Win trophy - unlocks after first Mega Win
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

function getRandomSymbol(): SlotSymbol {
  const weights = SYMBOLS.map((s) => {
    if (s.isScatter) return 2
    if (s.isWild) return 4
    if (s.value >= 75) return 6
    if (s.value >= 30) return 12
    return 18
  })
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < SYMBOLS.length; i++) {
    random -= weights[i]
    if (random <= 0) return SYMBOLS[i]
  }
  return SYMBOLS[SYMBOLS.length - 1]
}

function checkPaylines(
  grid: ReelGrid,
  bet: number,
  multiplier: number
): {
  totalWin: number
  lines: WinningLine[]
  positions: Set<string>
} {
  const lines: WinningLine[] = []
  const positions = new Set<string>()

  const paylines = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2],
    [2, 2, 1, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
  ]

  paylines.forEach((payline) => {
    const lineSymbols = payline.map((row, col) => grid[col][row])

    let matchCount = 1
    const firstSymbol = lineSymbols[0].isWild ? null : lineSymbols[0]
    let matchSymbol = firstSymbol

    for (let i = 1; i < 5; i++) {
      const current = lineSymbols[i]

      if (current.isWild) {
        matchCount++
      } else if (matchSymbol === null) {
        matchSymbol = current
        matchCount++
      } else if (current.id === matchSymbol.id) {
        matchCount++
      } else {
        break
      }
    }

    if (matchCount >= 3 && matchSymbol) {
      const winMultiplier = matchCount === 5 ? 5 : matchCount === 4 ? 2.5 : 1
      const winPositions: [number, number][] = []
      for (let i = 0; i < matchCount; i++) {
        winPositions.push([i, payline[i]])
        positions.add(`${i}-${payline[i]}`)
      }

      lines.push({
        positions: winPositions,
        symbol: matchSymbol,
        multiplier: winMultiplier,
      })
    }
  })

  const totalWin = lines.reduce((sum, line) => {
    const baseWin = Math.floor(bet * (line.symbol.value / 10) * line.multiplier * multiplier)
    return sum + baseWin
  }, 0)

  return { totalWin, lines, positions }
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
  }
}

function gridIdsToReelGrid(gridIds: string[][]): ReelGrid {
  return gridIds.map((col) =>
    col.map((id) => SYMBOLS.find((s) => s.id === id) ?? SYMBOLS[3]),
  )
}

function createInitialGameState(): GameState {
  return {
    coins: 5000,
    currentTheme: "vegas",
    ownedThemes: ["vegas"],
    currentBet: 50,
    betOptions: BET_OPTIONS,
    isSpinning: false,
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
    coinLedger: [],
    spinSyncDeferred: false,
    dailyStreak: 0,
    dailyRewards: INITIAL_DAILY_REWARDS.map((r) => ({ ...r })),
    lastClaimDate: null,
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
    level: 1,
    xp: 0,
    totalSpins: 0,
    spinSequence: 0,
    biggestWin: 0,
    totalWins: 0,
    maxBetUsed: false,
    userVanity: getDefaultUserVanity(),
    trophies: generateInitialTrophies(),
    leaderboardStats: {
      weeklyBiggestWin: 0,
      weeklyTotalWinnings: 0,
      weekStartDate: new Date().toISOString(),
      allTimeTotalWinnings: 0,
    },
    recentBigWins: [],
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

/** Set when a cloud upsert failed (e.g. offline); cleared on success or sign-out. Survives cold start. */
const PLAYER_SAVE_PENDING_RETRY_KEY = '@spinvault/player_save_pending_retry'

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => createInitialGameState())
  const stateRef = useRef(state)
  stateRef.current = state
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
  /** Effective bet for payline + bonus meter (free spins use `FREE_SPIN_LINE_BET`; cost to player is 0). */
  const spinLineBetRef = useRef(50)

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

  // Reset daily wheel and missions at midnight (local) — server economy uses DB UTC + hydrate instead.
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

        if (lastWheelDate !== today) {
          return {
            ...prev,
            dailyWheel: {
              lastWheelSpinAt: null,
              dailyWheelClaimed: false,
              wheelReward: null,
            },
            missions: INITIAL_MISSIONS,
          }
        }
        return prev
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
          delta > 0 ? `Wallet +${delta.toLocaleString()}` : `Wallet ${delta.toLocaleString()}`
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
          label: `Spend −${amount.toLocaleString()}`,
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
            `${spins} free spins (−${price.toLocaleString()} coins)`
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
    setState((prev) => {
      const isMaxBet = bet === Math.max(...prev.betOptions)
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
        currentBet: bet,
        maxBetUsed: isMaxBet || prev.maxBetUsed,
        missions: updatedMissions,
      }
    })
    queueMicrotask(() => track(AnalyticsEvents.BET_CHANGED, { bet }))
  }, [])

  const spin = useCallback(async (): Promise<SpinResult> => {
    const snapshot = stateRef.current
    const betCost = snapshot.freeSpins > 0 ? 0 : snapshot.currentBet
    if (snapshot.coins < betCost || snapshot.isSpinning) {
      return emptySpinResult(snapshot)
    }

    const lineBet = snapshot.freeSpins > 0 ? FREE_SPIN_LINE_BET : snapshot.currentBet
    spinLineBetRef.current = lineBet

    if (isServerSpinEnabled()) {
      try {
        const payload = await requestServerSpin(lineBet)
        serverSpinPayloadRef.current = payload
        const usedFreeSpin = snapshot.freeSpins > 0
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
          reelsLocked: false,
          winningLines: [],
          winningPositions: new Set(),
          lastWin: 0,
          lastWinType: 'none',
          winMultiplier: 0,
          lastSpinFreeSpinsWon: 0,
          lastBonusMeterPayout: 0,
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
            `Bet −${bc.toLocaleString()}`,
          )
        }

        return {
          ...prev,
          coins: balanceAfterBet,
          coinLedger: ledger,
          isSpinning: true,
          reelsLocked: false,
          freeSpins: prev.freeSpins > 0 ? prev.freeSpins - 1 : prev.freeSpins,
          winningLines: [],
          winningPositions: new Set(),
          lastWin: 0,
          lastWinType: 'none',
          winMultiplier: 0,
          lastSpinFreeSpinsWon: 0,
          lastBonusMeterPayout: 0,
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
        const winMultiplier = summary.win_multiplier
        const winType = summary.win_type as WinType
        const bonusMeterPayout = summary.bonus_meter_payout
        const bonusProgress = summary.bonus_progress_after
        const jackpotMultiplier = isJackpot ? 10 : 1

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

        const result: SpinResult = {
          win: totalWin,
          grid: newGrid,
          isJackpot,
          freeSpinsWon,
          winningLines,
          winType,
          winMultiplier,
          bonusMeterPayout,
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
          if (isServerEconomyEnabled()) {
            void hydrateMissionsAndWheelFromServer()
          }
        })

        return {
          ...prev,
          spinSyncDeferred: false,
          isSpinning: false,
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
          jackpotMultiplier,
          bonusProgress,
          lastBonusMeterPayout: bonusMeterPayout,
          missions: missionsForState,
          totalSpins: prev.totalSpins + 1,
          totalWins: totalWin > 0 ? prev.totalWins + 1 : prev.totalWins,
          biggestWin: Math.max(prev.biggestWin, totalWin),
          xp: prev.xp + 10 + (totalWin > 0 ? Math.floor(totalWin / 10) : 0),
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
          spinSequence: prev.spinSequence + 1,
          trophies: checkTrophyUnlocks(prev.trophies, {
            winType,
            level: prev.level,
            allTimeTotalWinnings: prev.leaderboardStats.allTimeTotalWinnings + totalWin,
            dailyStreak: prev.dailyStreak,
          }),
        }
      }

      deferWalletRefresh = prev.spinSyncDeferred && isServerSpinEnabled()

      // Generate new grid (local RNG)
      const newGrid: ReelGrid = []
      for (let col = 0; col < 5; col++) {
        const column: SlotSymbol[] = []
        for (let row = 0; row < 3; row++) {
          column.push(getRandomSymbol())
        }
        newGrid.push(column)
      }

      // Count scatters for free spins
      let scatterCount = 0
      newGrid.forEach(col => {
        col.forEach(symbol => {
          if (symbol.isScatter) scatterCount++
        })
      })
      const freeSpinsWon = scatterCount >= 3 ? 10 : 0

      // Check for jackpot (5 sevens on middle row)
      const middleRow = newGrid.map(col => col[1])
      const isJackpot = middleRow.every(s => s.id === "seven")
      const jackpotMultiplier = isJackpot ? 10 : 1

      // Calculate wins
      const lineBet = spinLineBetRef.current
      const { totalWin, lines, positions } = checkPaylines(newGrid, lineBet, jackpotMultiplier)

      // Calculate win multiplier (win / effective line bet)
      const winMultiplier = lineBet > 0 ? totalWin / lineBet : 0
      const winType = getWinType(winMultiplier)

      // Bonus meter: +10 on any line win, +2 on loss; payout when crossing 100 with carry-over
      const bonusInc = totalWin > 0 ? 10 : 2
      const combinedMeter = prev.bonusProgress + bonusInc
      let bonusMeterPayout = 0
      let bonusProgress: number
      if (combinedMeter >= 100) {
        bonusMeterPayout = bonusMeterPayoutForBet(lineBet)
        bonusProgress = combinedMeter % 100
      } else {
        bonusProgress = combinedMeter
      }

      let ledger = prev.coinLedger
      let runningBal = prev.coins + totalWin
      if (totalWin > 0) {
        ledger = appendCoinLedger(
          ledger,
          totalWin,
          runningBal,
          'spin_win',
          `Spin win (${winType})`
        )
      }
      if (bonusMeterPayout > 0) {
        runningBal += bonusMeterPayout
        ledger = appendCoinLedger(
          ledger,
          bonusMeterPayout,
          runningBal,
          'bonus_meter_full',
          `Bonus meter +${bonusMeterPayout.toLocaleString()}`
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

      const result: SpinResult = {
        win: totalWin,
        grid: newGrid,
        isJackpot,
        freeSpinsWon,
        winningLines: lines,
        winType,
        winMultiplier,
        bonusMeterPayout,
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
      })

      return {
        ...prev,
        isSpinning: false,
        reelsLocked: true, // Result is locked, navigation allowed
        reelGrid: newGrid,
        lastWin: totalWin,
        winMultiplier,
        lastWinType: winType,
        winningLines: lines,
        winningPositions: positions,
        coins: runningBal,
        coinLedger: ledger,
        freeSpins: prev.freeSpins + freeSpinsWon,
        lastSpinFreeSpinsWon: freeSpinsWon,
        isJackpotMode: isJackpot,
        jackpotMultiplier,
        bonusProgress,
        lastBonusMeterPayout: bonusMeterPayout,
        missions: updatedMissions,
        totalSpins: prev.totalSpins + 1,
        totalWins: totalWin > 0 ? prev.totalWins + 1 : prev.totalWins,
        biggestWin: Math.max(prev.biggestWin, totalWin),
        xp: prev.xp + 10 + (totalWin > 0 ? Math.floor(totalWin / 10) : 0),
        leaderboardStats: {
          ...prev.leaderboardStats,
          weeklyBiggestWin: Math.max(prev.leaderboardStats.weeklyBiggestWin, totalWin),
          weeklyTotalWinnings: prev.leaderboardStats.weeklyTotalWinnings + totalWin,
          allTimeTotalWinnings: prev.leaderboardStats.allTimeTotalWinnings + totalWin,
        },
        recentBigWins: winType !== "none" && winType !== "normal"
          ? [
              { amount: totalWin, multiplier: winMultiplier, timestamp: new Date().toISOString(), type: winType },
              ...prev.recentBigWins.slice(0, 9), // Keep last 10
            ]
          : prev.recentBigWins,
        spinSequence: prev.spinSequence + 1,
        // Check for trophy unlocks based on win type and stats
        trophies: checkTrophyUnlocks(prev.trophies, {
          winType,
          level: prev.level,
          allTimeTotalWinnings: prev.leaderboardStats.allTimeTotalWinnings + totalWin,
          dailyStreak: prev.dailyStreak,
        }),
        spinSyncDeferred: prev.spinSyncDeferred,
      }
    })
    queueMicrotask(() => {
      if (deferWalletRefresh) void resyncWalletFromServer()
    })
  }, [resyncWalletFromServer, hydrateMissionsAndWheelFromServer])

  /** Offline / fallback: updates coins only in React state (no Postgres write). */
  const claimDailyRewardLocal = useCallback((day: number): boolean => {
    let success = false
    setState((prev) => {
      const today = new Date().toDateString()
      const reward = prev.dailyRewards.find((r) => r.day === day)

      if (reward && !reward.claimed && day === prev.dailyStreak + 1) {
        success = true
        const newStreak = day
        const bal = prev.coins + reward.coins
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
          dailyStreak: newStreak,
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
            `Daily wheel +${reward.toLocaleString()}`,
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
          `Daily wheel +${reward.toLocaleString()}`,
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
        return {
          ...prev,
          coins: bal,
          coinLedger: appendCoinLedger(
            prev.coinLedger,
            mission.reward,
            bal,
            'mission_reward',
            mission.name,
          ),
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

  const addXp = useCallback((amount: number) => {
    setState(prev => {
      const newXp = prev.xp + amount
      const xpNeeded = prev.level * 1000
      if (newXp >= xpNeeded) {
        const newLevel = prev.level + 1
        const coinBonus = newLevel * 100
        const bal = prev.coins + coinBonus
        return {
          ...prev,
          xp: newXp - xpNeeded,
          level: newLevel,
          coins: bal,
          coinLedger: appendCoinLedger(
            prev.coinLedger,
            coinBonus,
            bal,
            'level_up_bonus',
            `Level ${newLevel} bonus`
          ),
          // Check for VIP trophy at level 5
          trophies: checkTrophyUnlocks(prev.trophies, {
            level: newLevel,
          }),
        }
      }
      return { ...prev, xp: newXp }
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

export { SYMBOLS, BET_OPTIONS, WHEEL_REWARDS, FREE_SPIN_LINE_BET }
