"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { Play, Gift, Coins } from "lucide-react"
import { RewardedAd } from "@/components/modals/rewarded-ad"

export function WatchAdCard() {
  const { canWatchAd, adsWatchedToday, maxDailyAds } = useAuth()
  const [showAd, setShowAd] = useState(false)

  const adsRemaining = maxDailyAds - adsWatchedToday

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-primary/20 via-card to-secondary/20",
          "border border-primary/30 p-5"
        )}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <Play className="w-7 h-7 text-primary" />
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-foreground text-lg">Watch & Earn</h3>
            <p className="text-sm text-muted-foreground">
              {canWatchAd() 
                ? `${adsRemaining} of ${maxDailyAds} watches left today`
                : "Come back tomorrow for more"
              }
            </p>
          </div>

          <button
            onClick={() => setShowAd(true)}
            disabled={!canWatchAd()}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-xl",
              "transition-all duration-200",
              canWatchAd()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <span className="text-xs font-medium">FREE</span>
            <div className="flex items-center gap-1">
              <Coins className="w-4 h-4" />
              <span className="font-bold">100+</span>
            </div>
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: maxDailyAds }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "w-3 h-3 rounded-full transition-colors",
                idx < adsWatchedToday
                  ? "bg-primary"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {showAd && (
        <RewardedAd onClose={() => setShowAd(false)} />
      )}
    </>
  )
}
