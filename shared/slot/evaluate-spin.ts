/**
 * Canonical slot spin evaluation (paylines, meter, RNG grid).
 * Imported by mobile (`game-context`) and Edge (`slot-engine` re-export).
 */

export interface SymbolDef {
  id: string
  name: string
  value: number
  isWild?: boolean
  isScatter?: boolean
}

export const BET_OPTIONS: readonly number[] = [10, 25, 50, 100, 250, 500]

/** Line wins while using a free spin are evaluated at this bet (not UI `currentBet`). */
export const FREE_SPIN_LINE_BET = 250

export const SYMBOLS: SymbolDef[] = [
  { id: 'seven', name: 'Lucky Seven', value: 100 },
  { id: 'diamond', name: 'Diamond', value: 75 },
  { id: 'bell', name: 'Bell', value: 50 },
  { id: 'cherry', name: 'Cherry', value: 30 },
  { id: 'lemon', name: 'Lemon', value: 20 },
  { id: 'orange', name: 'Orange', value: 15 },
  { id: 'grape', name: 'Grape', value: 10 },
  { id: 'wild', name: 'Wild', value: 0, isWild: true },
  { id: 'scatter', name: 'Scatter', value: 0, isScatter: true },
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
  /** Set when committing to DB / mobile replay */
  used_free_spin?: boolean
}

export function bonusMeterPayoutForBet(currentBet: number): number {
  return Math.min(5000, Math.max(350, Math.round(currentBet * 8)))
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

function getRandomSymbol(): SymbolDef {
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

  const middleRow = gridIds.map((col) => col[1])
  const isJackpot = middleRow.every((id) => id === 'seven')
  const jackpotMultiplier = isJackpot ? 10 : 1

  const { totalWin, lines } = checkPaylines(gridIds, currentBet, jackpotMultiplier)
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

  const lineBet = usedFreeSpin ? FREE_SPIN_LINE_BET : input.currentBet
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
