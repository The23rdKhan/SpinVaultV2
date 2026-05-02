import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useGame, SYMBOLS, type ReelGrid as ReelGridType } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { SlotSymbolView } from './SlotSymbol'

interface ReelGridProps {
  onSpinComplete?: () => void
}

export function ReelGrid({ onSpinComplete }: ReelGridProps) {
  const t = useCasinoTheme()
  const { reelGrid, isSpinning, winningPositions, stopSpin } = useGame()
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false, false, false])
  const [displayGrid, setDisplayGrid] = useState<ReelGridType>(reelGrid)
  const spinIntervalRefs = useRef<(ReturnType<typeof setInterval> | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ])
  const spinTimeoutRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ])

  useEffect(() => {
    if (!isSpinning) return

    const reelDelays = [0, 150, 300, 450, 600]
    const stopDelays = [1500, 1800, 2100, 2400, 2700]
    const startKickTimeouts: ReturnType<typeof setTimeout>[] = []
    const auxiliaryTimeouts: ReturnType<typeof setTimeout>[] = []

    reelDelays.forEach((delay, colIndex) => {
      const kick = setTimeout(() => {
        setSpinningReels((prev) => {
          const next = [...prev]
          next[colIndex] = true
          return next
        })

        spinIntervalRefs.current[colIndex] = setInterval(() => {
          setDisplayGrid((prev) => {
            const next = [...prev]
            next[colIndex] = [
              SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
              SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
              SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            ]
            return next
          })
        }, 80)
      }, delay)
      startKickTimeouts.push(kick)
    })

    stopDelays.forEach((delay, colIndex) => {
      spinTimeoutRefs.current[colIndex] = setTimeout(() => {
        if (spinIntervalRefs.current[colIndex]) {
          clearInterval(spinIntervalRefs.current[colIndex]!)
          spinIntervalRefs.current[colIndex] = null
        }

        setSpinningReels((prev) => {
          const next = [...prev]
          next[colIndex] = false
          return next
        })

        if (colIndex === 4) {
          auxiliaryTimeouts.push(
            setTimeout(() => {
              stopSpin()
              onSpinComplete?.()
            }, 100)
          )
        }
      }, delay)
    })

    return () => {
      startKickTimeouts.forEach(clearTimeout)
      spinIntervalRefs.current.forEach((interval, i) => {
        if (interval) clearInterval(interval)
        spinIntervalRefs.current[i] = null
      })
      spinTimeoutRefs.current.forEach((timeout, i) => {
        if (timeout) clearTimeout(timeout)
        spinTimeoutRefs.current[i] = null
      })
      auxiliaryTimeouts.forEach(clearTimeout)
    }
  }, [isSpinning, stopSpin, onSpinComplete])

  useEffect(() => {
    if (!isSpinning) {
      setDisplayGrid(reelGrid)
    }
  }, [reelGrid, isSpinning])

  return (
    <View style={styles.wrap}>
      <View style={[styles.inner, { backgroundColor: t.reelBg, borderColor: t.reelBorder }]}>
        <View style={[styles.payline, { backgroundColor: t.primary }]} />
        <View style={styles.grid}>
          {displayGrid.map((column, colIndex) => (
            <View key={colIndex} style={styles.col}>
              {column.map((symbol, rowIndex) => {
                const key = `${colIndex}-${rowIndex}`
                const win = winningPositions.has(key)
                return (
                  <View
                    key={key}
                    style={[
                      styles.cell,
                      { borderColor: t.border },
                      win && {
                        borderColor: t.primary,
                        shadowColor: t.primary,
                        shadowOpacity: 0.7,
                        shadowRadius: 8,
                      },
                    ]}
                  >
                    <SlotSymbolView
                      symbol={symbol}
                      isWinning={win}
                      isSpinning={spinningReels[colIndex]}
                    />
                  </View>
                )
              })}
            </View>
          ))}
        </View>
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
