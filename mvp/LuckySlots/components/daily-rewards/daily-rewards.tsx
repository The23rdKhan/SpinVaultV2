"use client"

import { useGame } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Gift, Check, Lock, Coins, Flame } from "lucide-react"
import { useState } from "react"
import { DailyWheel } from "./daily-wheel"
import { TodaysMissions } from "./todays-missions"
import { FreeSpinsWallet } from "./free-spins-wallet"
import { WatchAdCard } from "./watch-ad-card"
import { Leaderboard } from "@/components/social/leaderboard"

interface DailyRewardsProps {
  onNavigateToPlay?: () => void
}

export function DailyRewards({ onNavigateToPlay }: DailyRewardsProps) {
  const { dailyRewards, dailyStreak, claimDailyReward, coins } = useGame()
  const [claimAnimation, setClaimAnimation] = useState<number | null>(null)

  const handleClaim = (day: number) => {
    if (claimDailyReward(day)) {
      setClaimAnimation(day)
      setTimeout(() => setClaimAnimation(null), 1000)
    }
  }

  const nextClaimableDay = dailyStreak + 1

  return (
    <div className="p-4 pb-24 space-y-6 overflow-y-auto">
      {/* Header with balance */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Rewards
          </h2>
          <p className="text-sm text-muted-foreground">
            Collect daily bonuses!
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full border border-border">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-bold text-foreground">{coins.toLocaleString()}</span>
        </div>
      </div>

      {/* Streak indicator */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 glass-panel rounded-xl">
        <Flame className="h-6 w-6 text-secondary" />
        <span className="text-2xl font-black text-foreground">{dailyStreak}</span>
        <span className="text-sm text-muted-foreground">day streak</span>
      </div>

      {/* Watch Ad Card */}
      <WatchAdCard />

      {/* Daily Wheel */}
      <DailyWheel />

      {/* Rewards grid */}
      <div className="glass-panel p-4 rounded-xl">
        <h3 className="font-bold text-foreground mb-4">Daily Login Rewards</h3>
        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {dailyRewards.map((reward) => {
            const isClaimed = reward.claimed
            const isClaimable = reward.day === nextClaimableDay
            const isLocked = reward.day > nextClaimableDay
            const isAnimating = claimAnimation === reward.day

            return (
              <button
                key={reward.day}
                onClick={() => isClaimable && handleClaim(reward.day)}
                disabled={!isClaimable}
                className={cn(
                  "relative flex flex-col items-center gap-1 p-2 md:p-3 rounded-xl",
                  "transition-all duration-200",
                  isClaimed && "bg-win/20 border-2 border-win",
                  isClaimable && "bg-primary/20 border-2 border-primary animate-glow-pulse cursor-pointer hover:scale-105",
                  isLocked && "bg-muted/50 border-2 border-border opacity-60",
                  isAnimating && "animate-bounce-in"
                )}
              >
                {/* Day number */}
                <span className="text-[10px] font-medium text-muted-foreground">
                  D{reward.day}
                </span>

                {/* Icon */}
                <div className={cn(
                  "w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center",
                  isClaimed && "bg-win text-primary-foreground",
                  isClaimable && "bg-primary text-primary-foreground",
                  isLocked && "bg-muted text-muted-foreground"
                )}>
                  {isClaimed ? (
                    <Check className="h-3 w-3 md:h-5 md:w-5" />
                  ) : isLocked ? (
                    <Lock className="h-3 w-3 md:h-5 md:w-5" />
                  ) : (
                    <Gift className="h-3 w-3 md:h-5 md:w-5" />
                  )}
                </div>

                {/* Reward amount */}
                <div className="flex items-center gap-0.5">
                  <Coins className="h-2.5 w-2.5 text-primary" />
                  <span className={cn(
                    "text-[10px] md:text-xs font-bold",
                    isClaimed ? "text-win" : "text-foreground"
                  )}>
                    {reward.coins >= 1000 
                      ? `${(reward.coins / 1000).toFixed(reward.coins % 1000 === 0 ? 0 : 1)}k`
                      : reward.coins
                    }
                  </span>
                </div>

                {/* Claim badge */}
                {isClaimable && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                )}
              </button>
            )
          })}
        </div>

        {/* Progress bar for weekly bonus */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Weekly Mega Bonus</span>
            <div className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-jackpot" />
              <span className="font-bold text-jackpot">2,500</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-jackpot transition-all duration-500"
              style={{ width: `${(dailyStreak / 7) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            {[1,2,3,4,5,6,7].map(day => (
              <div 
                key={day}
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  day <= dailyStreak ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Today's Missions */}
      <TodaysMissions />

      {/* Free Spins Wallet */}
      <FreeSpinsWallet onPlayClick={onNavigateToPlay} />

      {/* Gift Inbox placeholder */}
      <div className="glass-panel p-4 rounded-xl opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
            <Gift className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Gift Inbox</h3>
            <p className="text-sm text-muted-foreground">No gifts yet - check back soon!</p>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <Leaderboard />
    </div>
  )
}
