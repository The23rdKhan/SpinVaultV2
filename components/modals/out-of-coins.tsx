"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X, Coins, Play, ShoppingBag, Gift } from "lucide-react"

interface OutOfCoinsProps {
  onClose: () => void
  onWatchAd: () => void
  onGoToShop: () => void
  onGoToRewards: () => void
}

export function OutOfCoinsModal({ 
  onClose, 
  onWatchAd, 
  onGoToShop,
  onGoToRewards 
}: OutOfCoinsProps) {
  const { canWatchAd, adsWatchedToday, maxDailyAds } = useAuth()

  const adsRemaining = maxDailyAds - adsWatchedToday

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
        <div className="relative bg-gradient-to-r from-destructive/80 to-destructive p-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/20 hover:bg-black/30"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
            <Coins className="w-8 h-8 text-white" />
          </div>

          <h3 className="text-xl font-bold text-white">Out of Coins!</h3>
          <p className="text-white/80 text-sm mt-1">
            Get more coins to keep playing
          </p>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {/* Watch Ad Option */}
          {canWatchAd() && (
            <button
              onClick={onWatchAd}
              className={cn(
                "w-full p-4 rounded-2xl border-2 border-primary bg-primary/10",
                "flex items-center gap-4 text-left",
                "hover:bg-primary/20 transition-colors"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Play className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">Watch Ad</div>
                <div className="text-sm text-muted-foreground">
                  Get 100-300 free coins ({adsRemaining} left today)
                </div>
              </div>
              <span className="text-xs font-bold text-primary bg-primary/20 px-2 py-1 rounded-full">
                FREE
              </span>
            </button>
          )}

          {/* Daily Rewards Option */}
          <button
            onClick={onGoToRewards}
            className={cn(
              "w-full p-4 rounded-2xl border border-border bg-card",
              "flex items-center gap-4 text-left",
              "hover:bg-muted/50 transition-colors"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 text-secondary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-foreground">Daily Rewards</div>
              <div className="text-sm text-muted-foreground">
                Claim bonuses and spin the wheel
              </div>
            </div>
          </button>

          {/* Shop Option */}
          <button
            onClick={onGoToShop}
            className={cn(
              "w-full p-4 rounded-2xl border border-border bg-card",
              "flex items-center gap-4 text-left",
              "hover:bg-muted/50 transition-colors"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-foreground">Visit Shop</div>
              <div className="text-sm text-muted-foreground">
                Browse coin packs and deals
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
