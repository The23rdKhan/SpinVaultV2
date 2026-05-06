import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated'
import { useGame, SYMBOLS, type ReelGrid as ReelGridType } from '@/lib/game-context'
import type { WinType } from '@shared/slot/evaluate-spin'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { SlotSymbolView } from './SlotSymbol'
import { PaylineOverlay } from './PaylineOverlay'
import { useHaptics } from '@/lib/use-haptics'

interface ReelGridProps {
  onSpinComplete?: () => void
  /** When true, show the center row guide (e.g. while the Lines sheet is open). */
  linesModalOpen?: boolean
}

const NUM_COLS = 5
const SETTLE_PX = 6 // px overshoot on land

/** Stagger delay per column for winning symbol pulse, in ms. */
const COL_STAGGER_MS = 80

/** Cell border/shadow escalation per win tier — mirrors SlotSymbol TIER_PULSE intensity. */
interface CellTier { shadowOpacity: number; shadowRadius: number; elevation: number }
const CELL_TIER: Record<Exclude<WinType, 'none'>, CellTier> = {
  normal:  { shadowOpacity: 0.45, shadowRadius: 6,  elevation: 3  },
  bigWin:  { shadowOpacity: 0.62, shadowRadius: 10, elevation: 5  },
  megaWin: { shadowOpacity: 0.78, shadowRadius: 16, elevation: 8  },
  jackpot: { shadowOpacity: 0.92, shadowRadius: 22, elevation: 12 },
}

function ReelColumn({
  colIndex,
  column,
  isSpinning: colSpinning,
  winningPositions,
  settleSignal,
  winTier,
  tierAccent,
}: {
  colIndex: number
  column: ReelGridType[number]
  isSpinning: boolean
  winningPositions: Set<string>
  settleSignal: number
  /** Win tier of the last resolved spin — used to escalate cell glow and symbol pulse. */
  winTier: Exclude<WinType, 'none'>
  /** Resolved accent color matching the win tier (gold/jackpot/primary/win). */
  tierAccent: string
}) {
  const t = useCasinoTheme()
  const reduceMotion = useReducedMotion()
  const translateY = useSharedValue(0)

  useEffect(() => {
    if (settleSignal === 0) return
    if (reduceMotion) {
      // Snap directly to 0 without spring — respects reduced motion preference
      translateY.value = withTiming(0, { duration: 0 })
      return
    }
    translateY.value = SETTLE_PX
    translateY.value = withSpring(0, { damping: 10, stiffness: 220, mass: 0.6 })
  }, [settleSignal, translateY, reduceMotion])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const columnDelay = colIndex * COL_STAGGER_MS
  const cellTier = CELL_TIER[winTier]

  return (
    <Animated.View style={[styles.col, animStyle]}>
      {column.map((symbol, rowIndex) => {
        const key = `${colIndex}-${rowIndex}`
        const isWin = winningPositions.has(key)
        return (
          <View
            key={key}
            style={[
              styles.cell,
              { borderColor: t.border },
              isWin && {
                borderColor: tierAccent,
                shadowColor: tierAccent,
                shadowOpacity: cellTier.shadowOpacity,
                shadowRadius: cellTier.shadowRadius,
                elevation: cellTier.elevation,
              },
            ]}
          >
            <SlotSymbolView
              symbol={symbol}
              isWinning={isWin}
              isSpinning={colSpinning}
              columnDelay={isWin ? columnDelay : 0}
              winTier={isWin ? winTier : undefined}
            />
          </View>
        )
      })}
    </Animated.View>
  )
}

export function ReelGrid({ onSpinComplete, linesModalOpen = false }: ReelGridProps) {
  const t = useCasinoTheme()
  const { reelGrid, isSpinning, reelsLocked, winningPositions, winningLines, stopSpin, lastWinType } = useGame()

  // Resolve the effective win tier (default to 'normal' when no win or type is 'none').
  const activeTier: Exclude<WinType, 'none'> =
    lastWinType === 'none' || lastWinType == null ? 'normal' : lastWinType

  // Accent color for cell borders and shadows, matched to the win tier.
  const tierAccent =
    activeTier === 'jackpot' ? t.gold
    : activeTier === 'megaWin' ? t.jackpot
    : activeTier === 'bigWin'  ? t.primary
    : t.win

  const showCenterPaylineGuide =
    !isSpinning && (linesModalOpen || winningLines.length > 0)
  const { reelStop, reelStopFinal } = useHaptics()

  // Stable ref so the last-column stop timeout always calls the current callback
  const onSpinCompleteRef = useRef(onSpinComplete)
  onSpinCompleteRef.current = onSpinComplete

  const [spinningReels, setSpinningReels] = useState<boolean[]>(Array(NUM_COLS).fill(false))
  const [displayGrid, setDisplayGrid] = useState<ReelGridType>(reelGrid)
  // Each element increments when that reel lands — used as a signal to trigger settle spring
  const [settleSignals, setSettleSignals] = useState<number[]>(Array(NUM_COLS).fill(0))

  const spinIntervalRefs = useRef<(ReturnType<typeof setInterval> | null)[]>(
    Array(NUM_COLS).fill(null),
  )
  const spinTimeoutRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>(
    Array(NUM_COLS).fill(null),
  )

  useEffect(() => {
    if (!isSpinning) return

    const reelDelays = [0, 150, 300, 450, 600]
    const stopDelays = [1500, 1800, 2100, 2400, 2700]
    const startTimeouts: ReturnType<typeof setTimeout>[] = []
    const auxTimeouts: ReturnType<typeof setTimeout>[] = []

    reelDelays.forEach((delay, col) => {
      startTimeouts.push(
        setTimeout(() => {
          setSpinningReels((prev) => {
            const next = [...prev]; next[col] = true; return next
          })
          spinIntervalRefs.current[col] = setInterval(() => {
            setDisplayGrid((prev) => {
              const next = [...prev]
              next[col] = [
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
              ]
              return next
            })
          }, 80)
        }, delay),
      )
    })

    stopDelays.forEach((delay, col) => {
      spinTimeoutRefs.current[col] = setTimeout(() => {
        if (spinIntervalRefs.current[col]) {
          clearInterval(spinIntervalRefs.current[col]!)
          spinIntervalRefs.current[col] = null
        }
        setSpinningReels((prev) => {
          const next = [...prev]; next[col] = false; return next
        })
        // Trigger settle spring for this column
        setSettleSignals((prev) => {
          const next = [...prev]; next[col] = prev[col] + 1; return next
        })
        if (col === NUM_COLS - 1) {
          reelStopFinal()
        } else {
          reelStop()
        }

        if (col === NUM_COLS - 1) {
          auxTimeouts.push(
            setTimeout(() => {
              stopSpin()
              onSpinCompleteRef.current?.()
            }, 100),
          )
        }
      }, delay)
    })

    return () => {
      startTimeouts.forEach(clearTimeout)
      auxTimeouts.forEach(clearTimeout)
      spinIntervalRefs.current.forEach((iv, i) => {
        if (iv) clearInterval(iv); spinIntervalRefs.current[i] = null
      })
      spinTimeoutRefs.current.forEach((to, i) => {
        if (to) clearTimeout(to); spinTimeoutRefs.current[i] = null
      })
    }
  // reelStopFinal is included because it closes over hapticsEnabled — omitting
  // it would cause a stale closure if haptics are toggled while reels are spinning.
  }, [isSpinning, stopSpin, reelStop, reelStopFinal])

  useEffect(() => {
    if (!isSpinning) setDisplayGrid(reelGrid)
  }, [reelGrid, isSpinning])

  // When results are locked (reelsLocked), freeze reel shuffle intervals immediately
  // so the final grid shows correct symbols before the settle animation completes.
  useEffect(() => {
    if (!reelsLocked) return
    spinIntervalRefs.current.forEach((iv, i) => {
      if (iv) {
        clearInterval(iv)
        spinIntervalRefs.current[i] = null
      }
    })
    setDisplayGrid(reelGrid)
  }, [reelsLocked, reelGrid])

  return (
    <View style={styles.wrap}>
      <View style={[styles.inner, { backgroundColor: t.reelBg, borderColor: t.reelBorder }]}>
        {showCenterPaylineGuide ? (
          <View style={[styles.payline, { backgroundColor: t.machineAccent }]} />
        ) : null}
        <View style={styles.grid}>
          {displayGrid.map((column, colIndex) => (
            <ReelColumn
              key={colIndex}
              colIndex={colIndex}
              column={column}
              isSpinning={spinningReels[colIndex]}
              winningPositions={winningPositions}
              settleSignal={settleSignals[colIndex]}
              winTier={activeTier}
              tierAccent={tierAccent}
            />
          ))}
        </View>
        {!isSpinning && winningLines.length > 0 && (
          <PaylineOverlay winningLines={winningLines} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  inner: {
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
    position: 'relative',
  },
  payline: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '50%',
    marginTop: -1,
    height: 2,
    opacity: 0.7,
    zIndex: 2,
    pointerEvents: 'none',
  },
  grid: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
    gap: 6,
  },
  cell: {
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
})
