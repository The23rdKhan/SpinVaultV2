"use client"

import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game-context"
import { Sparkles, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FreeSpinsWalletProps {
  onPlayClick?: () => void
}

export function FreeSpinsWallet({ onPlayClick }: FreeSpinsWalletProps) {
  const { freeSpins } = useGame()

  return (
    <div className={cn(
      "glass-panel p-4 rounded-xl",
      freeSpins > 0 && "border-secondary/50 bg-secondary/10"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            freeSpins > 0 
              ? "bg-gradient-to-br from-secondary to-secondary/80 animate-glow-pulse" 
              : "bg-muted/50"
          )}>
            <Sparkles className={cn(
              "h-6 w-6",
              freeSpins > 0 ? "text-white" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Free Spins</h3>
            <p className="text-sm text-muted-foreground">
              {freeSpins > 0 ? "Ready to use!" : "Win from Scatters"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={cn(
            "text-3xl font-black",
            freeSpins > 0 ? "text-secondary" : "text-muted-foreground"
          )}>
            {freeSpins}
          </div>
          
          {freeSpins > 0 && onPlayClick && (
            <Button
              size="sm"
              onClick={onPlayClick}
              className={cn(
                "h-10 px-4 rounded-full",
                "bg-secondary hover:bg-secondary/90 text-white"
              )}
            >
              <Play className="h-4 w-4 mr-1" />
              Play
            </Button>
          )}
        </div>
      </div>

      {/* Info text */}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Land 3+ Scatter symbols to win 10 Free Spins. Free spins use your current bet without deducting coins!
        </p>
      </div>
    </div>
  )
}
