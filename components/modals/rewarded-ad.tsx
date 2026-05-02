"use client"

import { useState, useEffect } from "react"
import { track } from "@/lib/analytics/track"
import { useAuth } from "@/lib/auth-context"
import { AnalyticsEvents } from "@shared/analytics/event-names"
import { useGame } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X, Play, Gift, Loader2, Check } from "lucide-react"

interface RewardedAdProps {
  onClose: () => void
  onRewardClaimed?: (amount: number) => void
}

type AdState = "ready" | "watching" | "complete"

export function RewardedAd({ onClose, onRewardClaimed }: RewardedAdProps) {
  const { watchAd, canWatchAd, adsWatchedToday, maxDailyAds } = useAuth()
  const { addCoins } = useGame()
  const [adState, setAdState] = useState<AdState>("ready")
  const [progress, setProgress] = useState(0)
  const [reward, setReward] = useState(0)
  const [displayedReward, setDisplayedReward] = useState(0)

  const adsRemaining = maxDailyAds - adsWatchedToday

  // Simulate ad progress
  useEffect(() => {
    if (adState === "watching") {
      const duration = 2000 // 2 seconds simulated ad
      const interval = 50
      const steps = duration / interval
      let currentStep = 0

      const timer = setInterval(() => {
        currentStep++
        setProgress((currentStep / steps) * 100)

        if (currentStep >= steps) {
          clearInterval(timer)
          handleAdComplete()
        }
      }, interval)

      return () => clearInterval(timer)
    }
  }, [adState])

  // Animate reward count-up
  useEffect(() => {
    if (adState === "complete" && reward > 0) {
      const duration = 1000
      const interval = 30
      const steps = duration / interval
      const increment = reward / steps
      let current = 0

      const timer = setInterval(() => {
        current += increment
        if (current >= reward) {
          setDisplayedReward(reward)
          clearInterval(timer)
        } else {
          setDisplayedReward(Math.floor(current))
        }
      }, interval)

      return () => clearInterval(timer)
    }
  }, [adState, reward])

  const handleWatchAd = async () => {
    if (!canWatchAd()) return
    track(AnalyticsEvents.REWARDED_AD_STARTED)
    setAdState("watching")
  }

  const handleAdComplete = async () => {
    const earnedReward = await watchAd()
    track(AnalyticsEvents.REWARDED_AD_COMPLETED, { reward_coins: earnedReward })
    setReward(earnedReward)
    addCoins(earnedReward)
    setAdState("complete")
    onRewardClaimed?.(earnedReward)
  }

  const handleClaim = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div 
        className={cn(
          "w-full max-w-sm bg-card rounded-3xl overflow-hidden",
          "border border-border shadow-2xl",
          "animate-in zoom-in-95 duration-300"
        )}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary via-secondary to-primary p-6 text-center">
          <button
            onClick={onClose}
            disabled={adState === "watching"}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/20 hover:bg-black/30 disabled:opacity-50"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
            {adState === "complete" ? (
              <Check className="w-8 h-8 text-white" />
            ) : adState === "watching" ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : (
              <Gift className="w-8 h-8 text-white" />
            )}
          </div>

          <h3 className="text-xl font-bold text-white">
            {adState === "complete" 
              ? "Reward Earned!" 
              : adState === "watching"
              ? "Watching Ad..."
              : "Free Coins!"}
          </h3>
          <p className="text-white/80 text-sm mt-1">
            {adState === "complete"
              ? "Coins added to your wallet"
              : adState === "watching"
              ? "Please wait..."
              : `Watch a short video for free coins`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {adState === "ready" && (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-primary mb-1">100-300</div>
                <div className="text-sm text-muted-foreground">Free Coins</div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
                <Play className="w-4 h-4" />
                <span>{adsRemaining} of {maxDailyAds} watches remaining today</span>
              </div>

              <Button
                onClick={handleWatchAd}
                disabled={!canWatchAd()}
                className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground"
              >
                <Play className="w-5 h-5 mr-2" />
                {canWatchAd() ? "Watch Ad" : "Come Back Tomorrow"}
              </Button>
            </>
          )}

          {adState === "watching" && (
            <div className="py-8">
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-primary transition-all duration-100 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Ad playing... {Math.floor(progress)}%
              </p>
            </div>
          )}

          {adState === "complete" && (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-primary mb-1 animate-bounce-in">
                  +{displayedReward.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Coins Earned</div>
              </div>

              <Button
                onClick={handleClaim}
                className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground"
              >
                Collect Reward
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
