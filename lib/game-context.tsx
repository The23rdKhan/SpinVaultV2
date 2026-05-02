"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { track } from "@/lib/analytics/track"
import { AnalyticsEvents } from "@shared/analytics/event-names"
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

interface GameState {
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
  isJackpotMode: boolean
  jackpotMultiplier: number
  bonusProgress: number // 0-100 for bonus meter
  
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
  addCoins: (amount: number) => void
  subtractCoins: (amount: number) => boolean
  setTheme: (theme: Theme) => void
  buyTheme: (theme: Theme, price: number) => boolean
  setBet: (bet: number) => void
  spin: () => Promise<SpinResult>
  stopSpin: () => void
  claimDailyReward: (day: number) => boolean
  spinDailyWheel: () => number
  claimMissionReward: (missionId: string) => boolean
  setUsername: (name: string) => void
  addXp: (amount: number) => void
  toggleSound: () => void
  toggleMusic: () => void
  toggleHaptics: () => void
  toggleNotifications: () => void
  setSessionReminder: (minutes: number | null) => void
  setPurchaseLimit: (limit: number | null) => void
  toggleCooldown: () => void
  
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

const WHEEL_REWARDS = [50, 100, 150, 200, 300, 500, 750, 1000]

const INITIAL_DAILY_REWARDS: DailyReward[] = [
  { day: 1, coins: 100, claimed: false },
  { day: 2, coins: 200, claimed: false },
  { day: 3, coins: 350, claimed: false },
  { day: 4, coins: 500, claimed: false },
  { day: 5, coins: 750, claimed: false },
  { day: 6, coins: 1000, claimed: false },
  { day: 7, coins: 2500, claimed: false },
]

const INITIAL_MISSIONS: Mission[] = [
  { id: "spin20", name: "Spin Master", description: "Complete 20 spins", target: 20, progress: 0, reward: 500, completed: false, claimed: false },
  { id: "win5", name: "Lucky Streak", description: "Win 5 times", target: 5, progress: 0, reward: 300, completed: false, claimed: false },
  { id: "maxbet1", name: "High Roller", description: "Use Max Bet once", target: 1, progress: 0, reward: 200, completed: false, claimed: false },
]

// Generate initial 5x3 grid
const generateInitialGrid = (): ReelGrid => {
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

const initialState: GameState = {
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
  isJackpotMode: false,
  jackpotMultiplier: 1,
  bonusProgress: 0,
  dailyStreak: 0,
  dailyRewards: INITIAL_DAILY_REWARDS,
  lastClaimDate: null,
  dailyWheel: {
    lastWheelSpinAt: null,
    dailyWheelClaimed: false,
    wheelReward: null,
  },
  missions: INITIAL_MISSIONS,
  soundEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: true,
  sessionReminderMinutes: null,
  dailyPurchaseLimit: null,
  cooldownEnabled: false,
  username: "Player",
  level: 1,
  xp: 0,
  totalSpins: 0,
  biggestWin: 0,
  totalWins: 0,
  maxBetUsed: false,
  
  // Vanity System
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

const GameContext = createContext<(GameState & GameActions) | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState)
  const [spinResolve, setSpinResolve] = useState<((result: SpinResult) => void) | null>(null)

  // Reset daily wheel and missions at midnight
  useEffect(() => {
    const checkReset = () => {
      const today = new Date().toDateString()
      setState(prev => {
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
            missions: INITIAL_MISSIONS, // Reset missions daily
          }
        }
        return prev
      })
    }
    
    checkReset()
    const interval = setInterval(checkReset, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

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
    setState(prev => ({ ...prev, coins }))
  }, [])

  const addCoins = useCallback((amount: number) => {
    setState(prev => ({ ...prev, coins: prev.coins + amount }))
  }, [])

  const subtractCoins = useCallback((amount: number): boolean => {
    let success = false
    setState(prev => {
      if (prev.coins >= amount) {
        success = true
        return { ...prev, coins: prev.coins - amount }
      }
      return prev
    })
    return success
  }, [])

  const setTheme = useCallback((theme: Theme) => {
    setState(prev => {
      if (prev.ownedThemes.includes(theme)) {
        document.documentElement.setAttribute("data-theme", theme)
        return { ...prev, currentTheme: theme }
      }
      return prev
    })
  }, [])

  const buyTheme = useCallback((theme: Theme, price: number): boolean => {
    let success = false
    setState(prev => {
      if (prev.coins >= price && !prev.ownedThemes.includes(theme)) {
        success = true
        const newOwnedThemes = [...prev.ownedThemes, theme]
        return {
          ...prev,
          coins: prev.coins - price,
          ownedThemes: newOwnedThemes,
          // Check for Theme Collector trophy when owning all 3 themes
          trophies: checkTrophyUnlocks(prev.trophies, {
            ownedThemesCount: newOwnedThemes.length,
          }),
        }
      }
      return prev
    })
    if (success) {
      queueMicrotask(() =>
        track(AnalyticsEvents.THEME_UNLOCKED, { theme }),
      )
    }
    return success
  }, [])

  const setBet = useCallback((bet: number) => {
    setState(prev => {
      const isMaxBet = bet === Math.max(...prev.betOptions)
      const updatedMissions = prev.missions.map(m => {
        if (m.id === "maxbet1" && isMaxBet && !m.completed) {
          return { ...m, progress: 1, completed: true }
        }
        return m
      })
      return { 
        ...prev, 
        currentBet: bet,
        maxBetUsed: isMaxBet || prev.maxBetUsed,
        missions: updatedMissions,
      }
    })
    queueMicrotask(() => track(AnalyticsEvents.BET_CHANGED, { bet }))
  }, [])

  const getRandomSymbol = (): SlotSymbol => {
    const weights = SYMBOLS.map(s => {
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

  // Check paylines for 5x3 grid
  const checkPaylines = (grid: ReelGrid, bet: number, multiplier: number): { 
    totalWin: number
    lines: WinningLine[]
    positions: Set<string>
  } => {
    const lines: WinningLine[] = []
    const positions = new Set<string>()
    
    // Define paylines (row indices for each column)
    const paylines = [
      [1, 1, 1, 1, 1], // Middle row
      [0, 0, 0, 0, 0], // Top row
      [2, 2, 2, 2, 2], // Bottom row
      [0, 1, 2, 1, 0], // V shape
      [2, 1, 0, 1, 2], // Inverted V
      [0, 0, 1, 2, 2], // Diagonal down
      [2, 2, 1, 0, 0], // Diagonal up
      [1, 0, 0, 0, 1], // Top bump
      [1, 2, 2, 2, 1], // Bottom bump
    ]
    
    paylines.forEach((payline) => {
      const lineSymbols = payline.map((row, col) => grid[col][row])
      
      // Find matching symbols from left (considering wilds)
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
      
      // Need at least 3 matching symbols
      if (matchCount >= 3 && matchSymbol) {
        const winMultiplier = matchCount === 5 ? 5 : matchCount === 4 ? 2.5 : 1
        const lineWin = Math.floor(bet * (matchSymbol.value / 10) * winMultiplier * multiplier)
        
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

  const spin = useCallback(async (): Promise<SpinResult> => {
    return new Promise((resolve) => {
      setState(prev => {
        const betCost = prev.freeSpins > 0 ? 0 : prev.currentBet
        if (prev.coins < betCost || prev.isSpinning) {
          resolve({ 
            win: 0, 
            grid: prev.reelGrid, 
            isJackpot: false, 
            freeSpinsWon: 0,
            winningLines: [],
            winType: "none",
            winMultiplier: 0,
          })
          return prev
        }

        setSpinResolve(() => resolve)

        const usedFreeSpin = prev.freeSpins > 0
        queueMicrotask(() =>
          track(AnalyticsEvents.SPIN_STARTED, {
            bet_coins: betCost,
            used_free_spin: usedFreeSpin,
          }),
        )

        return {
          ...prev,
          coins: prev.coins - betCost,
          isSpinning: true,
          reelsLocked: false,
          freeSpins: prev.freeSpins > 0 ? prev.freeSpins - 1 : prev.freeSpins,
          winningLines: [],
          winningPositions: new Set(),
          lastWin: 0,
          lastWinType: "none",
          winMultiplier: 0,
        }
      })
    })
  }, [])

  const stopSpin = useCallback(() => {
    setState(prev => {
      if (!prev.isSpinning) return prev

      // Generate new grid
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
      const { totalWin, lines, positions } = checkPaylines(newGrid, prev.currentBet, jackpotMultiplier)

      // Calculate win multiplier (win / bet)
      const winMultiplier = prev.currentBet > 0 ? totalWin / prev.currentBet : 0
      const winType = getWinType(winMultiplier)

      // Update bonus progress
      const bonusProgress = Math.min(100, prev.bonusProgress + (totalWin > 0 ? 10 : 2))

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
      }

      queueMicrotask(() => {
        track(AnalyticsEvents.SPIN_COMPLETED, {
          win_coins: totalWin,
          win_type: winType,
          free_spins_won: freeSpinsWon,
          is_jackpot: isJackpot,
          bet_coins: prev.currentBet,
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
        if (isJackpot) {
          track(AnalyticsEvents.JACKPOT_HIT, { win_coins: totalWin })
        }
      })

      if (spinResolve) {
        spinResolve(result)
        setSpinResolve(null)
      }

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
        coins: prev.coins + totalWin,
        freeSpins: prev.freeSpins + freeSpinsWon,
        isJackpotMode: isJackpot,
        jackpotMultiplier,
        bonusProgress,
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
        // Check for trophy unlocks based on win type and stats
        trophies: checkTrophyUnlocks(prev.trophies, {
          winType,
          level: prev.level,
          allTimeTotalWinnings: prev.leaderboardStats.allTimeTotalWinnings + totalWin,
          dailyStreak: prev.dailyStreak,
        }),
      }
    })
  }, [spinResolve])

  const claimDailyReward = useCallback((day: number): boolean => {
    let success = false
    setState(prev => {
      const today = new Date().toDateString()
      const reward = prev.dailyRewards.find(r => r.day === day)
      
      if (reward && !reward.claimed && day === prev.dailyStreak + 1) {
        success = true
        const newStreak = day
        return {
          ...prev,
          coins: prev.coins + reward.coins,
          dailyStreak: newStreak,
          dailyRewards: prev.dailyRewards.map(r => 
            r.day === day ? { ...r, claimed: true } : r
          ),
          lastClaimDate: today,
          // Check for 7-day streak trophy
          trophies: checkTrophyUnlocks(prev.trophies, {
            dailyStreak: newStreak,
          }),
        }
      }
      return prev
    })
    if (success) {
      queueMicrotask(() =>
        track(AnalyticsEvents.DAILY_REWARD_CLAIMED, { day }),
      )
    }
    return success
  }, [])

  const spinDailyWheel = useCallback((): number => {
    let reward = 0
    setState(prev => {
      if (prev.dailyWheel.dailyWheelClaimed) return prev
      
      reward = WHEEL_REWARDS[Math.floor(Math.random() * WHEEL_REWARDS.length)]
      
      return {
        ...prev,
        coins: prev.coins + reward,
        dailyWheel: {
          lastWheelSpinAt: new Date().toISOString(),
          dailyWheelClaimed: true,
          wheelReward: reward,
        },
      }
    })
    return reward
  }, [])

  const claimMissionReward = useCallback((missionId: string): boolean => {
    let success = false
    setState(prev => {
      const mission = prev.missions.find(m => m.id === missionId)
      if (mission && mission.completed && !mission.claimed) {
        success = true
        return {
          ...prev,
          coins: prev.coins + mission.reward,
          missions: prev.missions.map(m => 
            m.id === missionId ? { ...m, claimed: true } : m
          ),
        }
      }
      return prev
    })
    if (success) {
      queueMicrotask(() =>
        track(AnalyticsEvents.MISSION_COMPLETED, { mission_id: missionId }),
      )
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
        return {
          ...prev,
          xp: newXp - xpNeeded,
          level: newLevel,
          coins: prev.coins + newLevel * 100,
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

  const buyVanityItem = useCallback((itemId: string, priceCoins: number): boolean => {
    let success = false
    setState(prev => {
      if (prev.coins >= priceCoins && !prev.userVanity.ownedItemIds.includes(itemId)) {
        success = true
        return {
          ...prev,
          coins: prev.coins - priceCoins,
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

export { SYMBOLS, BET_OPTIONS, WHEEL_REWARDS }
