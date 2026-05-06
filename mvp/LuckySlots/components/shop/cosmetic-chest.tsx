"use client"

import { useState } from "react"
import { useGame } from "@/lib/game-context"
import { ALL_VANITY_ITEMS, RARITY_COLORS, RARITY_LABELS, type VanityRarity } from "@/lib/vanity-data"
import { ItemPreview } from "./vanity-store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Coins, Gift, Sparkles, X } from "lucide-react"

const CHEST_PRICE = 500
const RARITY_ODDS: Record<VanityRarity, number> = {
  common: 0.70,
  rare: 0.20,
  epic: 0.08,
  legendary: 0.02,
  mythic: 0,
}

export function CosmeticChest() {
  const { coins, buyVanityItem } = useGame()
  const [isOpening, setIsOpening] = useState(false)
  const [wonItem, setWonItem] = useState<(typeof ALL_VANITY_ITEMS)[0] | null>(null)
  const [showOdds, setShowOdds] = useState(false)

  const canAfford = coins >= CHEST_PRICE

  const openChest = () => {
    if (!canAfford || isOpening) return

    setIsOpening(true)

    // Weighted random selection
    const roll = Math.random()
    let selectedRarity: VanityRarity
    let cumulative = 0

    if (roll < cumulative + RARITY_ODDS.common) {
      selectedRarity = "common"
    } else if (roll < (cumulative += RARITY_ODDS.common) + RARITY_ODDS.rare) {
      selectedRarity = "rare"
    } else if (roll < (cumulative += RARITY_ODDS.rare) + RARITY_ODDS.epic) {
      selectedRarity = "epic"
    } else {
      selectedRarity = "legendary"
    }

    // Filter items by rarity that haven't been owned yet
    const itemsOfRarity = ALL_VANITY_ITEMS.filter(item => item.rarity === selectedRarity)
    const randomItem = itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)]

    // Simulate opening animation delay
    setTimeout(() => {
      buyVanityItem(randomItem.id, 0) // Free since we're paying with chest
      setWonItem(randomItem)
      setIsOpening(false)
    }, 1500)
  }

  if (wonItem) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative w-full max-w-sm mx-4 p-6 rounded-2xl bg-card border-2 border-primary shadow-2xl">
          {/* Close button */}
          <button
            onClick={() => setWonItem(null)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Won item display */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">You won!</p>
              <h3 className={cn(
                "text-2xl font-bold mb-1",
                RARITY_COLORS[wonItem.rarity].text
              )}>
                {wonItem.name}
              </h3>
              <p className={cn(
                "text-xs uppercase font-semibold tracking-wider",
                RARITY_COLORS[wonItem.rarity].text
              )}>
                {RARITY_LABELS[wonItem.rarity]}
              </p>
            </div>

            {/* Item preview */}
            <div className={cn(
              "w-24 h-24 rounded-xl flex items-center justify-center",
              RARITY_COLORS[wonItem.rarity].bg,
              RARITY_COLORS[wonItem.rarity].border,
              "border-2 shadow-lg"
            )}>
              <ItemPreview item={wonItem} size="md" />
            </div>

            {/* Item description */}
            <p className="text-sm text-muted-foreground text-center">
              {wonItem.description}
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => setWonItem(null)}
                className="flex-1 bg-muted hover:bg-muted/80 text-foreground"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          Cosmetic Chest
        </h3>
        <button
          onClick={() => setShowOdds(!showOdds)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showOdds ? "Hide" : "Show"} Odds
        </button>
      </div>

      {/* Odds display */}
      {showOdds && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border">
          <p className="text-xs font-semibold text-foreground mb-2">Drop Rate Odds:</p>
          <div className="space-y-1.5">
            {([
              { rarity: "common" as VanityRarity, odds: 70 },
              { rarity: "rare" as VanityRarity, odds: 20 },
              { rarity: "epic" as VanityRarity, odds: 8 },
              { rarity: "legendary" as VanityRarity, odds: 2 },
            ]).map(({ rarity, odds }) => (
              <div key={rarity} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded",
                    RARITY_COLORS[rarity].bg,
                    RARITY_COLORS[rarity].border,
                    "border"
                  )} />
                  <span className="text-xs capitalize font-medium text-foreground">
                    {RARITY_LABELS[rarity]}
                  </span>
                </div>
                <span className="text-xs font-bold text-muted-foreground">
                  {odds}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chest card */}
      <div className={cn(
        "relative p-6 rounded-xl border-2 overflow-hidden transition-all",
        canAfford
          ? "bg-gradient-to-br from-primary/10 to-transparent border-primary/50 hover:border-primary cursor-pointer"
          : "bg-muted/20 border-muted opacity-60"
      )}>
        {/* Shimmer effect when opening */}
        {isOpening && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">
              {isOpening ? "✨" : "🎁"}
            </div>
            <div>
              <h4 className="font-bold text-foreground">Mystery Chest</h4>
              <p className="text-sm text-muted-foreground">
                Get a random cosmetic
              </p>
            </div>
          </div>

          <Button
            onClick={openChest}
            disabled={!canAfford || isOpening}
            className={cn(
              "rounded-lg font-bold",
              canAfford && !isOpening
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isOpening ? (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-spin" />
                Opening...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                {CHEST_PRICE.toLocaleString()}
              </span>
            )}
          </Button>
        </div>
      </div>

      {!canAfford && (
        <p className="text-xs text-destructive text-center">
          Need {(CHEST_PRICE - coins).toLocaleString()} more coins
        </p>
      )}
    </section>
  )
}
