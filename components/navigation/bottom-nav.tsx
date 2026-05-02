"use client"

import { cn } from "@/lib/utils"
import { Gamepad2, Gift, ShoppingBag, User } from "lucide-react"
import { useGame } from "@/lib/game-context"

export type TabId = "play" | "rewards" | "shop" | "profile"

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const TABS: { id: TabId; label: string; icon: typeof Gamepad2 }[] = [
  { id: "play", label: "Play", icon: Gamepad2 },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "shop", label: "Shop", icon: ShoppingBag },
  { id: "profile", label: "Profile", icon: User },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { isSpinning, reelsLocked } = useGame()
  
  // Dim during active spin animation, but allow interaction once result is locked
  const isDimmed = isSpinning && !reelsLocked
  
  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50",
      "bg-card/95 backdrop-blur-lg",
      "border-t border-border",
      "safe-area-inset-bottom",
      "transition-opacity duration-300",
      isDimmed && "opacity-60"
    )}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "w-16 h-full transition-all duration-200",
                "touch-manipulation",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "relative p-1.5 rounded-xl transition-all duration-200",
                isActive && "bg-primary/20 shadow-[0_0_10px_var(--glow-color)]"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110 text-primary drop-shadow-[0_0_4px_var(--glow-color)]"
                )} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-primary shadow-[0_0_6px_var(--glow-color)]" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-200",
                isActive && "font-bold"
              )}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
