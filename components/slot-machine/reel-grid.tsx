"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { useGame, SYMBOLS, type ReelGrid as ReelGridType } from "@/lib/game-context"
import { Symbol } from "./symbol"

interface ReelGridProps {
  onSpinComplete?: () => void
}

export function ReelGrid({ onSpinComplete }: ReelGridProps) {
  const { reelGrid, isSpinning, winningPositions, stopSpin } = useGame()
  const [spinningReels, setSpinningReels] = useState<boolean[]>([false, false, false, false, false])
  const [displayGrid, setDisplayGrid] = useState<ReelGridType>(reelGrid)
  const spinIntervalRefs = useRef<(NodeJS.Timeout | null)[]>([null, null, null, null, null])
  const spinTimeoutRefs = useRef<(NodeJS.Timeout | null)[]>([null, null, null, null, null])

  // Handle spin start
  useEffect(() => {
    if (isSpinning) {
      // Start each reel with staggered timing
      const reelDelays = [0, 150, 300, 450, 600]
      
      reelDelays.forEach((delay, colIndex) => {
        setTimeout(() => {
          setSpinningReels(prev => {
            const next = [...prev]
            next[colIndex] = true
            return next
          })
          
          // Animate random symbols while spinning
          spinIntervalRefs.current[colIndex] = setInterval(() => {
            setDisplayGrid(prev => {
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
      })

      // Stop each reel with staggered timing
      const stopDelays = [1500, 1800, 2100, 2400, 2700]
      
      stopDelays.forEach((delay, colIndex) => {
        spinTimeoutRefs.current[colIndex] = setTimeout(() => {
          // Clear the interval for this reel
          if (spinIntervalRefs.current[colIndex]) {
            clearInterval(spinIntervalRefs.current[colIndex]!)
            spinIntervalRefs.current[colIndex] = null
          }
          
          setSpinningReels(prev => {
            const next = [...prev]
            next[colIndex] = false
            return next
          })
          
          // On last reel stop, trigger spin complete
          if (colIndex === 4) {
            setTimeout(() => {
              stopSpin()
              onSpinComplete?.()
            }, 100)
          }
        }, delay)
      })
    }

    return () => {
      // Cleanup
      spinIntervalRefs.current.forEach(interval => {
        if (interval) clearInterval(interval)
      })
      spinTimeoutRefs.current.forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
    }
  }, [isSpinning, stopSpin, onSpinComplete])

  // Update display grid when not spinning
  useEffect(() => {
    if (!isSpinning) {
      setDisplayGrid(reelGrid)
    }
  }, [reelGrid, isSpinning])

  return (
    <div className="relative w-full">
      {/* Reel container with cabinet styling */}
      <div className="cabinet-inner rounded-xl p-2 md:p-3">
        {/* Payline indicator (middle row) */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className={cn(
            "h-[2px] md:h-[3px] mx-2",
            "bg-gradient-to-r from-transparent via-primary to-transparent",
            winningPositions.size > 0 && "animate-payline-glow"
          )} />
        </div>

        {/* 5x3 Grid */}
        <div className="grid grid-cols-5 gap-1 md:gap-2">
          {displayGrid.map((column, colIndex) => (
            <div 
              key={colIndex}
              className={cn(
                "flex flex-col gap-1 md:gap-2",
                spinningReels[colIndex] && "animate-shake"
              )}
            >
              {column.map((symbol, rowIndex) => (
                <div
                  key={`${colIndex}-${rowIndex}`}
                  className={cn(
                    "reel-window aspect-square rounded-lg p-1 md:p-2",
                    "flex items-center justify-center",
                    "transition-all duration-200",
                    winningPositions.has(`${colIndex}-${rowIndex}`) && [
                      "ring-2 ring-glow",
                      "shadow-[0_0_20px_var(--glow-color)]",
                    ]
                  )}
                >
                  <Symbol 
                    symbol={symbol}
                    isWinning={winningPositions.has(`${colIndex}-${rowIndex}`)}
                    isSpinning={spinningReels[colIndex]}
                    delay={colIndex * 100}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Side lights */}
      <div className="absolute -left-2 md:-left-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {[0, 1, 2].map(i => (
          <div 
            key={i}
            className={cn(
              "w-2 h-8 md:w-3 md:h-12 rounded-full",
              "bg-gradient-to-b from-primary/80 to-primary/40",
              "animate-cabinet-shimmer"
            )}
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
      <div className="absolute -right-2 md:-right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {[0, 1, 2].map(i => (
          <div 
            key={i}
            className={cn(
              "w-2 h-8 md:w-3 md:h-12 rounded-full",
              "bg-gradient-to-b from-primary/80 to-primary/40",
              "animate-cabinet-shimmer"
            )}
            style={{ animationDelay: `${i * 200 + 100}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
