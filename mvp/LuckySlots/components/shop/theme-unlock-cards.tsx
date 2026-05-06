"use client"

import { useState } from "react"
import { useGame } from "@/lib/game-context"
import { THEME_CONFIGS, type ThemeConfig } from "@/lib/theme-config"
import { cn } from "@/lib/utils"
import { Coins, Check, Lock, Eye, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeUnlockCards() {
  const { coins, ownedThemes, currentTheme, buyTheme } = useGame()
  const [selectedPreview, setSelectedPreview] = useState<ThemeConfig | null>(null)

  const nonVegasThemes = ["cyber", "treasure"] as const

  return (
    <>
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4">Theme Unlocks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nonVegasThemes.map(themeId => {
            const config = THEME_CONFIGS[themeId]
            const isOwned = ownedThemes.includes(themeId)
            const isActive = currentTheme === themeId
            const coinsNeeded = Math.max(0, config.price - coins)

            return (
              <div
                key={themeId}
                className={cn(
                  "relative flex flex-col p-5 rounded-2xl border-2 transition-all",
                  isActive && "border-primary bg-primary/10 shadow-lg shadow-primary/20",
                  isOwned && !isActive && "border-border bg-card",
                  !isOwned && "border-border/50 bg-card/50"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{config.name}</h3>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                  {isActive && (
                    <div className="px-2 py-1 bg-primary/30 rounded-lg border border-primary/50">
                      <p className="text-xs font-bold text-primary">Active</p>
                    </div>
                  )}
                </div>

                {/* Unlocks list */}
                <div className="space-y-1.5 mb-4 flex-1">
                  {config.unlocks.map((unlock, i) => (
                    <p key={i} className="text-xs text-muted-foreground leading-snug">
                      {unlock}
                    </p>
                  ))}
                </div>

                {/* Coin cost / Status */}
                <div className="flex items-center gap-2 mb-3">
                  {isOwned ? (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                      <Check className="h-4 w-4" />
                      Unlocked
                    </div>
                  ) : coinsNeeded > 0 ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      <span>You need</span>
                      <span className="font-bold text-amber-400">{coinsNeeded.toLocaleString()}</span>
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                      Ready to unlock
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedPreview(config)}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Preview
                  </Button>
                  {!isOwned && coinsNeeded <= 0 && (
                    <Button
                      onClick={() => buyTheme(themeId, config.price)}
                      className="flex-1"
                      size="sm"
                    >
                      <Coins className="h-3.5 w-3.5 mr-1.5" />
                      Unlock {config.price.toLocaleString()}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="max-w-md w-full bg-card border-2 border-border rounded-2xl overflow-hidden max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{selectedPreview.name}</h2>
              <button
                onClick={() => setSelectedPreview(null)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Preview visual */}
              <div
                className={cn(
                  "h-32 rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2",
                  selectedPreview.cabinetBorder
                )}
                style={{
                  background: selectedPreview.background,
                }}
              >
                {/* Reel preview */}
                <div className="flex gap-1">
                  {selectedPreview.symbolSet.slice(0, 3).map((symbol, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-10 h-10 rounded-lg border border-border/50 flex items-center justify-center text-xl",
                        "bg-card/30 backdrop-blur"
                      )}
                    >
                      {symbol}
                    </div>
                  ))}
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {selectedPreview.jackpotName}
                </p>
              </div>

              {/* Includes section */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Includes</h3>
                <div className="space-y-1">
                  {selectedPreview.unlocks.map((unlock, i) => (
                    <p key={i} className="text-xs text-foreground leading-relaxed">
                      {unlock}
                    </p>
                  ))}
                </div>
              </div>

              {/* Special features */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Customizations</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <dt className="text-muted-foreground">Bonus Name:</dt>
                    <dd className="font-bold text-foreground">{selectedPreview.bonusName}</dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-muted-foreground">Wild Symbol:</dt>
                    <dd className="font-bold text-foreground">{selectedPreview.wildIcon} {selectedPreview.wildName}</dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-muted-foreground">Scatter Symbol:</dt>
                    <dd className="font-bold text-foreground">{selectedPreview.scatterIcon} {selectedPreview.scatterName}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4">
              <button
                onClick={() => setSelectedPreview(null)}
                className="w-full px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
