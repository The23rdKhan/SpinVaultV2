"use client"

import { useGame } from "@/lib/game-context"
import { cn } from "@/lib/utils"
import { Coins } from "lucide-react"

export function WalletDisplay() {
  const { coins } = useGame()

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2",
      "bg-card/80 backdrop-blur-sm rounded-full",
      "border border-border",
      "shadow-lg"
    )}>
      <div className="relative">
        <Coins className="h-5 w-5 text-primary animate-coin-float" />
        <div className="absolute inset-0 blur-md bg-primary/30" />
      </div>
      <span className="font-bold text-lg text-foreground">
        {coins.toLocaleString()}
      </span>
    </div>
  )
}
