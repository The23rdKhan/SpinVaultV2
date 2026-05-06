"use client"

import { cn } from "@/lib/utils"
import { useGame, BET_OPTIONS } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { Minus, Plus, Info, Grid3X3, Zap, FastForward } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface ControlDeckProps {
  onOpenInfo: () => void
  onOpenLines: () => void
}

export function ControlDeck({ onOpenInfo, onOpenLines }: ControlDeckProps) {
  const { 
    coins, 
    currentBet, 
    setBet, 
    spin, 
    isSpinning, 
    freeSpins,
    lastWin,
    totalSpins,
    biggestWin,
  } = useGame()

  const [displayedWin, setDisplayedWin] = useState(0)
  const [autoSpin, setAutoSpin] = useState(false)
  const [fastMode, setFastMode] = useState(false)
  const countUpRef = useRef<NodeJS.Timeout | null>(null)

  // Animated win counter
  useEffect(() => {
    if (lastWin > 0 && !isSpinning) {
      setDisplayedWin(0)
      let current = 0
      const step = Math.ceil(lastWin / 30)
      
      countUpRef.current = setInterval(() => {
        current += step
        if (current >= lastWin) {
          setDisplayedWin(lastWin)
          if (countUpRef.current) clearInterval(countUpRef.current)
        } else {
          setDisplayedWin(current)
        }
      }, fastMode ? 25 : 50)
    } else if (lastWin === 0) {
      setDisplayedWin(0)
    }

    return () => {
      if (countUpRef.current) clearInterval(countUpRef.current)
    }
  }, [lastWin, isSpinning, fastMode])

  const canSpin = (coins >= currentBet || freeSpins > 0) && !isSpinning

  const decreaseBet = () => {
    const currentIndex = BET_OPTIONS.indexOf(currentBet)
    if (currentIndex > 0) {
      setBet(BET_OPTIONS[currentIndex - 1])
    }
  }

  const increaseBet = () => {
    const currentIndex = BET_OPTIONS.indexOf(currentBet)
    if (currentIndex < BET_OPTIONS.length - 1) {
      setBet(BET_OPTIONS[currentIndex + 1])
    }
  }

  const setMaxBet = () => {
    setBet(BET_OPTIONS[BET_OPTIONS.length - 1])
  }

  const handleSpin = () => {
    if (canSpin) {
      spin()
    }
  }

  const toggleAutoSpin = () => {
    setAutoSpin(prev => !prev)
  }

  const toggleFastMode = () => {
    setFastMode(prev => !prev)
  }

  return (
    <div className="w-full">
      {/* Quick action buttons */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenInfo}
          className={cn(
            "h-9 px-3 rounded-full",
            "bg-cabinet-inner/50 border border-cabinet-border",
            "hover:bg-cabinet-inner hover:border-primary/50",
            "text-xs font-medium"
          )}
        >
          <Info className="h-3.5 w-3.5 mr-1.5" />
          INFO
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenLines}
          className={cn(
            "h-9 px-3 rounded-full",
            "bg-cabinet-inner/50 border border-cabinet-border",
            "hover:bg-cabinet-inner hover:border-primary/50",
            "text-xs font-medium"
          )}
        >
          <Grid3X3 className="h-3.5 w-3.5 mr-1.5" />
          LINES
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAutoSpin}
          className={cn(
            "h-9 px-3 rounded-full",
            "border",
            autoSpin 
              ? "bg-primary/20 border-primary text-primary" 
              : "bg-cabinet-inner/50 border-cabinet-border hover:bg-cabinet-inner hover:border-primary/50",
            "text-xs font-medium"
          )}
        >
          <Zap className="h-3.5 w-3.5 mr-1.5" />
          AUTO
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFastMode}
          className={cn(
            "h-9 px-3 rounded-full",
            "border",
            fastMode 
              ? "bg-primary/20 border-primary text-primary" 
              : "bg-cabinet-inner/50 border-cabinet-border hover:bg-cabinet-inner hover:border-primary/50",
            "text-xs font-medium"
          )}
        >
          <FastForward className="h-3.5 w-3.5 mr-1.5" />
          FAST
        </Button>
      </div>

      {/* Stats bar */}
      <div className="glass-panel rounded-t-xl px-3 py-2 md:px-4 md:py-3 border-b-0">
        <div className="flex items-center justify-between text-xs md:text-sm">
          <div className="flex flex-col items-center">
            <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Last Win</span>
            <span className={cn(
              "font-bold",
              lastWin > 0 ? "text-win animate-win-shimmer" : "text-foreground"
            )}>
              ${displayedWin.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Total Spins</span>
            <span className="font-bold text-foreground">{totalSpins.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Best Win</span>
            <span className="font-bold text-primary">${biggestWin.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Control panel */}
      <div 
        className={cn(
          "cabinet-frame rounded-b-2xl rounded-t-none",
          "px-3 py-4 md:px-6 md:py-5"
        )}
      >
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* Bet controls */}
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={decreaseBet}
              disabled={isSpinning || currentBet === BET_OPTIONS[0]}
              className={cn(
                "h-10 w-10 md:h-12 md:w-12 rounded-full",
                "bg-cabinet-inner border-2 border-cabinet-border",
                "hover:bg-cabinet-inner/80 hover:border-primary/50",
                "disabled:opacity-40"
              )}
            >
              <Minus className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            
            <div className="flex flex-col items-center px-3 md:px-4">
              <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Bet</span>
              <span className="text-lg md:text-2xl font-black gold-text">${currentBet}</span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={increaseBet}
              disabled={isSpinning || currentBet === BET_OPTIONS[BET_OPTIONS.length - 1]}
              className={cn(
                "h-10 w-10 md:h-12 md:w-12 rounded-full",
                "bg-cabinet-inner border-2 border-cabinet-border",
                "hover:bg-cabinet-inner/80 hover:border-primary/50",
                "disabled:opacity-40"
              )}
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>

          {/* Spin button */}
          <button
            onClick={handleSpin}
            disabled={!canSpin}
            className={cn(
              "spin-button h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 rounded-full",
              "flex items-center justify-center",
              "text-white font-black text-sm md:text-lg",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              canSpin && !isSpinning && "animate-button-ready",
              isSpinning && "opacity-80"
            )}
          >
            {isSpinning ? (
              <span className="animate-pulse">STOP</span>
            ) : freeSpins > 0 ? (
              <div className="flex flex-col items-center">
                <span className="text-xs md:text-sm">FREE</span>
                <span className="text-sm md:text-lg">SPIN</span>
              </div>
            ) : autoSpin ? (
              <div className="flex flex-col items-center">
                <Zap className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-xs">AUTO</span>
              </div>
            ) : (
              "SPIN"
            )}
          </button>

          {/* Max bet & Balance */}
          <div className="flex flex-col items-center gap-1 md:gap-2">
            <Button
              variant="ghost"
              onClick={setMaxBet}
              disabled={isSpinning}
              className={cn(
                "h-8 md:h-10 px-3 md:px-4 rounded-full",
                "bg-cabinet-inner border-2 border-primary/50",
                "hover:bg-primary/20 hover:border-primary",
                "text-xs md:text-sm font-bold text-primary"
              )}
            >
              MAX
            </Button>
            
            <div className="flex flex-col items-center">
              <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Balance</span>
              <span className="text-sm md:text-lg font-bold text-foreground">${coins.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Insufficient funds warning */}
        {coins < currentBet && freeSpins === 0 && (
          <p className="text-center text-destructive text-xs md:text-sm mt-3 animate-shake">
            Not enough coins! Visit the shop.
          </p>
        )}
      </div>
    </div>
  )
}
