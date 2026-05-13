/**
 * Canonical slot spin evaluation (paylines, meter, RNG grid).
 * Imported by mobile (`game-context`) and Edge (`slot-engine` re-export).
 */

export interface SymbolDef {
  id: string
  name: string
  value: number
  /**
   * Virtual-reel stop count (out of 64 stops per reel).
   * Higher = more frequent. Drives `buildRandomGridIds` probability.
   *
   * Reel design targets ~94–96% RTP from paylines + ~0.6% from jackpot.
   * Adjust these values to tune volatility or RTP — do NOT change
   * payline math or bet sizing instead.
   */
  weight: number
  isWild?: boolean
  isScatter?: boolean
}

export const BET_OPTIONS: readonly number[] = [
  10, 25, 50, 100, 250, 500,        // starter tiers — always available
  1_000,                             // requires 50K coins
  5_000,                             // requires 250K coins
  10_000,                            // requires 500K coins
  1_000_000,                         // requires 50M coins
  10_000_000,                        // requires 500M coins
  100_000_000,                       // requires 5B coins
]

/**
 * Coins required in the player's wallet to unlock a bet tier.
 * Always 50× the bet amount; tiers ≤ $500 are always available (gate = 0).
 */
export function coinGateForBet(bet: number): number {
  if (bet <= 500) return 0
  return bet * 50
}

/**
 * Returns true when the player's current coin balance qualifies them to
 * see and use `bet` in the bet selector.
 */
export function isBetUnlocked(bet: number, coins: number): boolean {
  return coins >= coinGateForBet(bet)
}

/** Smallest / largest allowed line bet (integer coins). */
export const MIN_LINE_BET = BET_OPTIONS[0]
export const MAX_LINE_BET = BET_OPTIONS[BET_OPTIONS.length - 1]!

/**
 * Snap a target line bet to the nearest value the wallet is allowed to select:
 * integer in [MIN_LINE_BET, MAX_LINE_BET] that passes `isBetUnlocked`, or the
 * largest allowed value below `target` if `target` is too high for the gate.
 */
export function clampBetSelect(target: number, coins: number): number {
  const t = Math.max(MIN_LINE_BET, Math.min(MAX_LINE_BET, Math.round(target)))
  if (isBetUnlocked(t, coins)) return t
  let lo = MIN_LINE_BET
  let hi = t
  let best = MIN_LINE_BET
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (isBetUnlocked(mid, coins)) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return best
}

/** Edge / client guard: integer line bet within bounds and tier gate for wallet balance. */
export function isValidSpinRequestBet(bet: number, walletCoins: number): boolean {
  return (
    Number.isInteger(bet) &&
    bet >= MIN_LINE_BET &&
    bet <= MAX_LINE_BET &&
    isBetUnlocked(bet, walletCoins)
  )
}

/**
 * Historical fallback bet used for free spins before the "use current bet" change.
 * Free spins now evaluate at the player's `currentBet` (cost is still 0).
 * Kept as a reference value for UI display (e.g. InfoModal) and older save migrations.
 */
export const FREE_SPIN_LINE_BET = 250

/**
 * Symbol roster with explicit virtual-reel stop counts (sum = 64 per reel).
 *
 * Probability per reel position = weight / 64.
 *
 * Jackpot trigger (5× Lucky Seven, Wild substitutes):
 *   P = ((seven.weight + wild.weight) / 64)^5 = (3/64)^5 ≈ 1 in 4,420,000 spins
 *
 * Previous flat-weight system had Seven at 6/96 = 6.25%, giving a jackpot
 * frequency of roughly 1 in 85,000 — about 52× too common for a $250K prize.
 *
 * To tune RTP: increase low-value symbol weights to add more 3-match hits, or
 * decrease high-value symbol weights to reduce big-win frequency. Re-run the
 * simulateRtp() export after any change to verify the target 94–96% range.
 */
export const SYMBOLS: SymbolDef[] = [
  //                                       weight  stops/64   P(per reel)
  { id: 'seven',   name: 'Lucky Seven', value: 100, weight: 2  }, //  2/64 =  3.1%  jackpot trigger — intentionally rare
  { id: 'diamond', name: 'Diamond',     value: 75,  weight: 3  }, //  3/64 =  4.7%
  { id: 'bell',    name: 'Bell',        value: 50,  weight: 5  }, //  5/64 =  7.8%
  { id: 'cherry',  name: 'Cherry',      value: 30,  weight: 8  }, //  8/64 = 12.5%
  { id: 'lemon',   name: 'Lemon',       value: 20,  weight: 12 }, // 12/64 = 18.8%
  { id: 'orange',  name: 'Orange',      value: 15,  weight: 14 }, // 14/64 = 21.9%
  { id: 'grape',   name: 'Grape',       value: 10,  weight: 18 }, // 18/64 = 28.1%
  { id: 'wild',    name: 'Wild',        value: 0,   weight: 1,  isWild: true    }, //  1/64 =  1.6%
  { id: 'scatter', name: 'Scatter',     value: 0,   weight: 1,  isScatter: true }, //  1/64 =  1.6%
  //                                        TOTAL:  64  ✓
]

const symbolById = new Map(SYMBOLS.map((s) => [s.id, s]))

/** Row-per-column definitions for each of the 9 paylines. */
const PAYLINES: readonly number[][] = [
  [1, 1, 1, 1, 1], // middle row
  [0, 0, 0, 0, 0], // top row
  [2, 2, 2, 2, 2], // bottom row
  [0, 1, 2, 1, 0], // V shape
  [2, 1, 0, 1, 2], // inverted V
  [0, 0, 1, 2, 2], // diagonal down
  [2, 2, 1, 0, 0], // diagonal up
  [1, 0, 0, 0, 1], // top bump
  [1, 2, 2, 2, 1], // bottom bump
]

export type WinType = 'none' | 'normal' | 'bigWin' | 'megaWin' | 'jackpot'

export interface WinningLineSerialized {
  positions: [number, number][]
  symbol_id: string
  /** Display multiplier (1 | 2.5 | 5). Coin reward calc uses `match_count`, not float equality. */
  multiplier: number
  /** Symbols matched along the payline (source of truth for `lineWinCoins`). */
  match_count: 3 | 4 | 5
}

export interface SpinResultSummary {
  total_win: number
  free_spins_won: number
  is_jackpot: boolean
  bonus_meter_payout: number
  bonus_progress_after: number
  win_multiplier: number
  win_type: WinType
  winning_lines: WinningLineSerialized[]
  /** Coins awarded purely for scatter count (2+ scatters). Included in total_win. */
  scatter_payout: number
  /** Number of scatter symbols that appeared this spin (0–15). */
  scatter_count: number
  /** Flat Mega Jackpot prize (JACKPOT_FIXED_PAYOUT) when triggered, else 0. Included in total_win. */
  jackpot_bonus: number
  /**
   * Mystery Multiplier value applied to the base win this spin (2 | 3 | 5 | 8 | 10).
   * null when the feature did not trigger or when there was no base win to multiply.
   * total_win already reflects this multiplier.
   */
  mystery_multiplier: number | null
  /** Set when committing to DB / mobile replay */
  used_free_spin?: boolean
}

export function bonusMeterPayoutForBet(currentBet: number): number {
  // 8× the bet with no upper cap — stays proportionally meaningful at every tier.
  return Math.max(350, Math.round(currentBet * 8))
}

/**
 * Minimum Mega Jackpot prize. All bets ≤ $10K pay this flat amount.
 * High-roller bets above this floor scale as bet × 25.
 */
export const JACKPOT_BASE_PAYOUT = 250_000

/**
 * Returns the Mega Jackpot prize for a given line bet.
 * - Standard bets ($10–$10K): always $250,000
 * - Whale bets ($1M+): bet × 25  (e.g. $1M bet → $25M, $100M bet → $2.5B)
 */
export function jackpotPayoutForBet(bet: number): number {
  return Math.max(JACKPOT_BASE_PAYOUT, bet * 25)
}


/**
 * Scatter coin payout multipliers keyed by scatter count.
 * Applies to any spin with 2+ scatters anywhere on the grid.
 * Stacks on top of the free-spins trigger (3+ scatters still awards free spins AND coins).
 */
export const SCATTER_PAYOUT_MULTIPLIERS: Readonly<Record<number, number>> = {
  2: 2,   // 2 scatters →  2× bet
  3: 5,   // 3 scatters →  5× bet  (+ 10 free spins)
  4: 20,  // 4 scatters → 20× bet  (+ 10 free spins)
  5: 100, // 5 scatters → 100× bet (+ 10 free spins)
}

export function scatterPayoutForBet(scatterCount: number, bet: number): number {
  const mult = SCATTER_PAYOUT_MULTIPLIERS[Math.min(scatterCount, 5)] ?? 0
  return mult * bet
}

function getWinType(winMultiplier: number): WinType {
  if (winMultiplier >= 25) return 'jackpot'
  if (winMultiplier >= 10) return 'megaWin'
  if (winMultiplier >= 5) return 'bigWin'
  if (winMultiplier > 0) return 'normal'
  return 'none'
}

/** Integer-safe line win; matches legacy `floor(bet * (value/10) * mult * jackpotMult)` with mult 1 | 2.5 | 5. */
function lineWinCoins(
  bet: number,
  symValue: number,
  matchCount: number,
  jackpotMult: number,
): number {
  let num = 1
  let den = 1
  if (matchCount === 5) {
    num = 5
    den = 1
  } else if (matchCount === 4) {
    num = 5
    den = 2
  }
  return Math.floor((bet * symValue * num * jackpotMult) / (10 * den))
}

/**
 * Flat lookup table: each entry is the SymbolDef at that virtual-reel stop.
 * Computed once at module load — O(1) slice instead of O(n) weighted loop per call.
 * Length always equals the sum of all SYMBOLS[*].weight values.
 */
const REEL_LOOKUP: readonly SymbolDef[] = (() => {
  const table: SymbolDef[] = []
  for (const sym of SYMBOLS) {
    for (let i = 0; i < sym.weight; i++) table.push(sym)
  }
  return table
})()

/** Total reel stops. Used in simulateRtp to validate the reel design sums to 64. */
export const REEL_TOTAL_STOPS = REEL_LOOKUP.length

function getRandomSymbol(): SymbolDef {
  return REEL_LOOKUP[Math.floor(Math.random() * REEL_LOOKUP.length)]
}

export function buildRandomGridIds(): string[][] {
  const grid: string[][] = []
  for (let col = 0; col < 5; col++) {
    const column: string[] = []
    for (let row = 0; row < 3; row++) {
      column.push(getRandomSymbol().id)
    }
    grid.push(column)
  }
  return grid
}

function checkPaylines(
  gridIds: string[][],
  bet: number,
  jackpotMult: number,
): { totalWin: number; lines: WinningLineSerialized[] } {
  const lines: WinningLineSerialized[] = []

  const gridSyms = gridIds.map((col) =>
    col.map((id) => {
      const s = symbolById.get(id)
      if (!s) throw new Error(`unknown_symbol:${id}`)
      return s
    }),
  )

  PAYLINES.forEach((payline) => {
    const lineSymbols = payline.map((row, col) => gridSyms[col][row])
    let matchCount = 1
    const firstSymbol = lineSymbols[0].isWild ? null : lineSymbols[0]
    let matchSymbol: SymbolDef | null = firstSymbol

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
      const lineWinMult = matchCount === 5 ? 5 : matchCount === 4 ? 2.5 : 1
      const winPositions: [number, number][] = []
      for (let i = 0; i < matchCount; i++) {
        winPositions.push([i, payline[i]])
      }
      lines.push({
        positions: winPositions,
        symbol_id: matchSymbol.id,
        multiplier: lineWinMult,
        match_count: matchCount as 3 | 4 | 5,
      })
    }
  })

  const totalWin = lines.reduce((sum, line) => {
    const sym = symbolById.get(line.symbol_id)!
    return sum + lineWinCoins(bet, sym.value, line.match_count, jackpotMult)
  }, 0)

  return { totalWin, lines }
}

// ─── Mystery Multiplier ──────────────────────────────────────────────────────

/** Probability that a Mystery Multiplier triggers on any given spin that has a base win. */
const MYSTERY_MULTIPLIER_CHANCE = 0.06

/**
 * Weighted multiplier pool: [value, weight].
 * Higher multipliers are rarer. Weights don't need to sum to any specific total.
 */
const MYSTERY_MULTIPLIER_POOL: [number, number][] = [
  [2,  40],
  [3,  28],
  [5,  18],
  [8,   9],
  [10,  5],
]

function rollMysteryMultiplier(): number | null {
  if (Math.random() >= MYSTERY_MULTIPLIER_CHANCE) return null
  const totalWeight = MYSTERY_MULTIPLIER_POOL.reduce((s, [, w]) => s + w, 0)
  let roll = Math.random() * totalWeight
  for (const [value, weight] of MYSTERY_MULTIPLIER_POOL) {
    roll -= weight
    if (roll <= 0) return value
  }
  return MYSTERY_MULTIPLIER_POOL[0][0]
}

// ─── Grid evaluator ──────────────────────────────────────────────────────────

export function evaluateGrid(
  gridIds: string[][],
  currentBet: number,
  prevBonusProgress: number,
): SpinResultSummary {
  let scatterCount = 0
  gridIds.forEach((col) => {
    col.forEach((id) => {
      if (id === 'scatter') scatterCount++
    })
  })
  const freeSpinsWon = scatterCount >= 3 ? 10 : 0
  const scatterPayout = scatterPayoutForBet(scatterCount, currentBet)

  const middleRow = gridIds.map((col) => col[1])
  // Wild substitutes for Seven in the jackpot check, raising probability to ~1 in 81,500
  const isJackpot = middleRow.every((id) => id === 'seven' || id === 'wild')
  // Jackpot scales with bet for whale tiers; standard bets always pay the $250K floor.
  const jackpotBonus = isJackpot ? jackpotPayoutForBet(currentBet) : 0

  const { totalWin: lineWin, lines } = checkPaylines(gridIds, currentBet, 1)
  const baseWin = lineWin + scatterPayout + jackpotBonus

  // Mystery Multiplier — rolls only when there's a base win to amplify
  const mysteryMultiplier = baseWin > 0 ? rollMysteryMultiplier() : null
  const totalWin = mysteryMultiplier != null ? baseWin * mysteryMultiplier : baseWin

  const winMultiplier = currentBet > 0 ? totalWin / currentBet : 0
  const winType = getWinType(winMultiplier)

  const bonusInc = totalWin > 0 ? 10 : 2
  const combinedMeter = prevBonusProgress + bonusInc
  let bonusMeterPayout = 0
  let bonusProgressAfter: number
  if (combinedMeter >= 100) {
    bonusMeterPayout = bonusMeterPayoutForBet(currentBet)
    bonusProgressAfter = combinedMeter % 100
  } else {
    bonusProgressAfter = combinedMeter
  }

  return {
    total_win: totalWin,
    free_spins_won: freeSpinsWon,
    is_jackpot: isJackpot,
    bonus_meter_payout: bonusMeterPayout,
    bonus_progress_after: bonusProgressAfter,
    win_multiplier: winMultiplier,
    win_type: winType,
    winning_lines: lines,
    scatter_payout: scatterPayout,
    scatter_count: scatterCount,
    jackpot_bonus: jackpotBonus,
    mystery_multiplier: mysteryMultiplier,
  }
}

export function computeBalancesAfterSpin(input: {
  walletCoins: number
  walletFreeSpins: number
  bonusMeterProgress: number
  currentBet: number
  gridIds: string[][]
}): {
  usedFreeSpin: boolean
  summary: SpinResultSummary
  coinBalanceAfter: number
  freeSpinBalanceAfter: number
} {
  const usedFreeSpin = input.walletFreeSpins > 0

  if (!usedFreeSpin && input.walletCoins < input.currentBet) {
    throw new Error('insufficient_coins')
  }
  if (usedFreeSpin && input.walletFreeSpins < 1) {
    throw new Error('no_free_spins')
  }

  // Free spins use the player's actual current bet for payout calculation —
  // they cost $0 but pay out at full bet value, making them valuable at every level.
  const lineBet = input.currentBet
  const summary = evaluateGrid(input.gridIds, lineBet, input.bonusMeterProgress)

  const betCost = usedFreeSpin ? 0 : input.currentBet
  const coinsAfterBet = input.walletCoins - betCost
  const coinBalanceAfter = coinsAfterBet + summary.total_win + summary.bonus_meter_payout
  const freeSpinBalanceAfter = input.walletFreeSpins - (usedFreeSpin ? 1 : 0) + summary.free_spins_won

  if (coinBalanceAfter < 0 || freeSpinBalanceAfter < 0) {
    throw new Error('balance_underflow')
  }

  return {
    usedFreeSpin,
    summary: { ...summary, used_free_spin: usedFreeSpin },
    coinBalanceAfter,
    freeSpinBalanceAfter,
  }
}

// ---------------------------------------------------------------------------
// RTP Simulation
// ---------------------------------------------------------------------------

export interface RtpSimResult {
  spins: number
  bet: number
  totalWagered: number
  totalReturned: number
  /** Observed RTP as a percentage, e.g. 94.2 */
  rtpPct: number
  jackpotHits: number
  freeSpinsTriggered: number
  reelStops: number
}

/**
 * Monte-Carlo RTP estimator.  Run from a Node script or unit test — never in
 * the hot game path.  Example:
 *
 * ```ts
 * import { simulateRtp } from '@shared/slot/evaluate-spin'
 * const result = simulateRtp({ spins: 1_000_000, bet: 100 })
 * console.log(`RTP: ${result.rtpPct.toFixed(2)}%  Jackpots: ${result.jackpotHits}`)
 * ```
 *
 * Typical output with the 64-stop reel design:
 *   RTP ≈ 94–96%   Jackpot ≈ 1 per 4.4M spins   Scatter trigger ≈ 1 per 700 spins
 */
export function simulateRtp(opts: { spins: number; bet: number }): RtpSimResult {
  const { spins, bet } = opts
  let totalReturned = 0
  let jackpotHits = 0
  let freeSpinsTriggered = 0

  for (let i = 0; i < spins; i++) {
    const grid = buildRandomGridIds()
    const result = evaluateGrid(grid, bet, 0)
    totalReturned += result.total_win + result.bonus_meter_payout + result.jackpot_bonus
    if (result.is_jackpot) jackpotHits++
    if (result.free_spins_won > 0) freeSpinsTriggered++
  }

  const totalWagered = spins * bet
  return {
    spins,
    bet,
    totalWagered,
    totalReturned,
    rtpPct: (totalReturned / totalWagered) * 100,
    jackpotHits,
    freeSpinsTriggered,
    reelStops: REEL_TOTAL_STOPS,
  }
}
