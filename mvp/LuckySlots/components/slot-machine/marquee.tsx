"use client"

import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game-context"

export function Marquee() {
  const { bonusProgress, freeSpins, isJackpotMode } = useGame()

  return (
    <div className="relative w-full">
      {/* Main marquee container */}
      <div 
        className={cn(
          "relative overflow-hidden rounded-t-2xl",
          "bg-gradient-to-b from-card to-cabinet-bg",
          "border-2 border-b-0 border-cabinet-border",
          "shadow-[inset_0_-10px_30px_rgba(0,0,0,0.5)]"
        )}
      >
        {/* Top decorative lights */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
        
        {/* Jackpot banner */}
        <div className="relative py-3 md:py-4 px-4">
          <div className="flex items-center justify-center gap-3">
            {/* Left decoration */}
            <div className="hidden sm:flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <div 
                  key={i}
                  className={cn(
                    "w-2 h-2 md:w-3 md:h-3 rounded-full",
                    "bg-gradient-to-br from-primary to-primary/60",
                    "animate-cabinet-shimmer"
                  )}
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>

            {/* Jackpot text */}
            <div 
              className={cn(
                "px-4 md:px-6 py-1.5 md:py-2 rounded-full",
                "bg-gradient-to-r from-jackpot/80 via-jackpot to-jackpot/80",
                "border border-jackpot-glow/50",
                "shadow-[0_0_20px_var(--jackpot-glow)]",
                isJackpotMode && "animate-jackpot-flash"
              )}
            >
              <span className="text-sm md:text-lg lg:text-xl font-black text-white tracking-wider neon-text">
                MEGA JACKPOT
              </span>
            </div>

            {/* Right decoration */}
            <div className="hidden sm:flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <div 
                  key={i}
                  className={cn(
                    "w-2 h-2 md:w-3 md:h-3 rounded-full",
                    "bg-gradient-to-br from-primary to-primary/60",
                    "animate-cabinet-shimmer"
                  )}
                  style={{ animationDelay: `${i * 150 + 75}ms` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scrolling message / Bonus teaser */}
        <div className="relative h-8 md:h-10 overflow-hidden bg-cabinet-bg/50 border-t border-cabinet-border/30">
          {freeSpins > 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm md:text-base font-bold text-win animate-glow-pulse">
                FREE SPINS: {freeSpins} REMAINING!
              </span>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center">
              <div className="animate-marquee whitespace-nowrap">
                <span className="text-xs md:text-sm text-muted-foreground mx-4">
                  Match 5 SEVENS for MEGA JACKPOT
                </span>
                <span className="text-primary mx-2">*</span>
                <span className="text-xs md:text-sm text-muted-foreground mx-4">
                  3 SCATTERS = 10 FREE SPINS
                </span>
                <span className="text-primary mx-2">*</span>
                <span className="text-xs md:text-sm text-muted-foreground mx-4">
                  WILD substitutes any symbol
                </span>
                <span className="text-primary mx-2">*</span>
              </div>
            </div>
          )}
        </div>

        {/* Bonus meter */}
        <div className="px-4 py-2 bg-cabinet-bg/30">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Bonus
            </span>
            <div className="flex-1 h-2 md:h-3 rounded-full bg-cabinet-inner border border-cabinet-border/50 overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  "bg-gradient-to-r from-primary via-glow-secondary to-primary",
                  bonusProgress >= 100 && "animate-glow-pulse"
                )}
                style={{ width: `${bonusProgress}%` }}
              />
            </div>
            <span className="text-[10px] md:text-xs text-primary font-bold">
              {bonusProgress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
