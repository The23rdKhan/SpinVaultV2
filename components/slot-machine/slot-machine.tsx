"use client"

import { useState, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game-context"
import { Marquee } from "./marquee"
import { ReelGrid } from "./reel-grid"
import { ControlDeck } from "./control-deck"
import { WinDisplay } from "./win-display"
import { InfoModal } from "./info-modal"
import { LinesModal } from "./lines-modal"

export function SlotMachine() {
  const { lastWin, lastWinType, isJackpotMode, winningLines, freeSpins } = useGame()
  const [showWin, setShowWin] = useState(false)
  const [winAmount, setWinAmount] = useState(0)
  const [winType, setWinType] = useState<typeof lastWinType>("none")
  const [freeSpinsWon, setFreeSpinsWon] = useState(0)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showLinesModal, setShowLinesModal] = useState(false)

  // Track win display when spin completes
  useEffect(() => {
    if (lastWin > 0 && winningLines.length > 0 && lastWinType !== "none") {
      setWinAmount(lastWin)
      setWinType(lastWinType)
      setShowWin(true)
    }
  }, [lastWin, lastWinType, winningLines])

  const handleWinClose = useCallback(() => {
    setShowWin(false)
    setWinType("none")
  }, [])

  const handleSpinComplete = useCallback(() => {
    // Additional logic if needed after spin
  }, [])

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto px-2 py-4 md:px-4 md:py-6 min-h-[calc(100vh-10rem)]">
      {/* Cabinet frame */}
      <div 
        className={cn(
          "relative w-full flex-1 flex flex-col",
          "cabinet-frame rounded-2xl",
          "overflow-hidden"
        )}
      >
        {/* Corner lights */}
        <div className="absolute top-3 left-3 w-3 h-3 md:w-4 md:h-4 rounded-full bg-primary/80 animate-cabinet-shimmer z-10" />
        <div className="absolute top-3 right-3 w-3 h-3 md:w-4 md:h-4 rounded-full bg-primary/80 animate-cabinet-shimmer z-10" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-3 left-3 w-3 h-3 md:w-4 md:h-4 rounded-full bg-primary/80 animate-cabinet-shimmer z-10" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-3 right-3 w-3 h-3 md:w-4 md:h-4 rounded-full bg-primary/80 animate-cabinet-shimmer z-10" style={{ animationDelay: '1.5s' }} />
        
        {/* Marquee section */}
        <Marquee />

        {/* Main reel area */}
        <div className="flex-1 flex flex-col justify-center px-4 md:px-6 py-4 md:py-6">
          <ReelGrid onSpinComplete={handleSpinComplete} />
        </div>

        {/* Paylines legend */}
        <div className="px-4 md:px-6 pb-3">
          <div className="flex items-center justify-center gap-3 md:gap-6 text-[10px] md:text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-[2px] bg-gradient-to-r from-primary to-primary/50 rounded-full" />
              <span>9 Paylines</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 md:w-5 md:h-5 rounded bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                <span className="text-[8px] md:text-[10px] font-black text-white">W</span>
              </div>
              <span>Wild</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 md:w-5 md:h-5 bg-gradient-to-br from-yellow-300 to-amber-500 shadow-sm" 
                style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }} 
              />
              <span>Scatter</span>
            </div>
          </div>
        </div>

        {/* Free spins banner */}
        {freeSpins > 0 && (
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 z-30 pointer-events-none">
            <div className="flex justify-center">
              <div className={cn(
                "px-6 py-2 rounded-full",
                "bg-gradient-to-r from-win/90 to-win",
                "text-white font-bold text-lg md:text-xl",
                "shadow-[0_0_30px_var(--win-color)]",
                "animate-bounce"
              )}>
                {freeSpins} FREE SPINS!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control deck (outside cabinet frame) */}
      <div className="w-full mt-4">
        <ControlDeck 
          onOpenInfo={() => setShowInfoModal(true)}
          onOpenLines={() => setShowLinesModal(true)}
        />
      </div>

      {/* Win overlay */}
      <WinDisplay 
        show={showWin}
        amount={winAmount}
        winType={winType}
        freeSpins={freeSpinsWon}
        onClose={handleWinClose}
      />

      {/* Modals */}
      <InfoModal open={showInfoModal} onClose={() => setShowInfoModal(false)} />
      <LinesModal open={showLinesModal} onClose={() => setShowLinesModal(false)} />
    </div>
  )
}
