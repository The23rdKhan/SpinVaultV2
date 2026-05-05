import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import { useGame, SYMBOLS, type ReelGrid as ReelGridType } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { SlotSymbolView } from './SlotSymbol'
import { PaylineOverlay } from './PaylineOverlay'
import { useHaptics } from '@/lib/use-haptics'

interface ReelGridProps {
  onSpinComplete?: () => void
}

const NUM_COLS = 5
const SETTLE_PX = 6 // px overshoot on land

function ReelColumn({
  colIndex,
  column,
  isSpinning: colSpinning,
  winningPositions,
  settleSignal,
}: {
  colIndex: number
  column: ReelGridType[number]
  isSpinning: boolean
  winningPositions: Set<string>
  settleSignal: number
}) {
  const t = useCasinoTheme()
  const translateY = useSharedValue(0)

  useEffect(() => {
    if (settleSignal === 0) return
    translateY.value = SETTLE_PX
    translateY.value = withSpring(0, { damping: 10, stiffness: 220, mass: 0.6 })
  }, [settleSignal, translateY])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

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
                borderColor: t.machineAccent,
                shadowColor: t.machineAccent,
                shadowOpacity: 0.55,
                shadowRadius: 8,
                elevation: 4,
              },
            ]}
          >
            <SlotSymbolView symbol={symbol} isWinning={isWin} isSpinning={colSpinning} />
          </View>
        )
      })}
    </Animated.View>
  )
}

export function ReelGrid({ onSpinComplete }: ReelGridProps) {
  const t = useCasinoTheme()
  const { reelGrid, isSpinning, reelsLocked, winningPositions, winningLines, stopSpin } = useGame()
  const { reelStop } = useHaptics()

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
        // Haptic for each reel landing
        reelStop()

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
  }, [isSpinning, stopSpin, reelStop])

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
        <View style={[styles.payline, { backgroundColor: t.machineAccent }]} />
        <View style={styles.grid}>
          {displayGrid.map((column, colIndex) => (
            <ReelColumn
              key={colIndex}
              colIndex={colIndex}
              column={column}
              isSpinning={spinningReels[colIndex]}
              winningPositions={winningPositions}
              settleSignal={settleSignals[colIndex]}
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
