"use client"

import { useGame, type Theme } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Coins, Check, Lock, Sparkles, Crown, Gem, Zap, Star, Gift } from "lucide-react"
import { useState } from "react"
import { VanityStore } from "./vanity-store"
import { CosmeticChest } from "./cosmetic-chest"
import { ThemeUnlockCards } from "./theme-unlock-cards"

interface CoinPack {
  id: string
  coins: number
  bonus: number
  price: string
  popular?: boolean
  icon: typeof Coins
}

const COIN_PACKS: CoinPack[] = [
  { id: "starter", coins: 1000, bonus: 0, price: "$0.99", icon: Coins },
  { id: "basic", coins: 5000, bonus: 500, price: "$4.99", icon: Coins },
  { id: "popular", coins: 15000, bonus: 3000, price: "$9.99", popular: true, icon: Sparkles },
  { id: "premium", coins: 50000, bonus: 15000, price: "$24.99", icon: Crown },
  { id: "ultimate", coins: 150000, bonus: 50000, price: "$49.99", icon: Gem },
]

interface FreeSpinBundle {
  id: string
  spins: number
  price: number
  icon: typeof Zap
}

const FREE_SPIN_BUNDLES: FreeSpinBundle[] = [
  { id: "mini", spins: 5, price: 500, icon: Zap },
  { id: "standard", spins: 15, price: 1200, icon: Sparkles },
  { id: "mega", spins: 50, price: 3500, icon: Star },
]

export function ShopPage() {
  const { coins, addCoins, buyTheme, ownedThemes, setTheme, freeSpins } = useGame()
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null)

  const showMessage = (msg: string) => {
    setPurchaseMessage(msg)
    setTimeout(() => setPurchaseMessage(null), 2000)
  }

  const handleBuyCoinPack = (pack: CoinPack) => {
    const totalCoins = pack.coins + pack.bonus
    addCoins(totalCoins)
    showMessage(`Added ${totalCoins.toLocaleString()} coins!`)
  }

  const handleBuyFreeSpins = (bundle: FreeSpinBundle) => {
    if (coins >= bundle.price) {
      // Note: In a real implementation, you'd add the spins via context
      showMessage(`Added ${bundle.spins} Free Spins!`)
    } else {
      showMessage("Not enough coins!")
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 overflow-y-auto">
      {/* Purchase message toast */}
      {purchaseMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg animate-bounce-in">
          {purchaseMessage}
        </div>
      )}

      {/* Starter Pack Featured Offer */}
      <div className={cn(
        "relative p-5 rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-primary/20 via-card to-accent/20",
        "border-2 border-primary"
      )}>
        <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-bl-lg">
          LIMITED OFFER
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">Starter Pack</h3>
            <p className="text-sm text-muted-foreground">10,000 coins + 10 Free Spins</p>
            <p className="text-xs text-win font-medium mt-1">First purchase only - 50% OFF!</p>
          </div>
          <Button
            onClick={() => {
              addCoins(10000)
              showMessage("Welcome bonus claimed!")
            }}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            $2.99
          </Button>
        </div>
      </div>

      {/* Free Spins Bundles */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-secondary" />
          Free Spins Bundles
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {FREE_SPIN_BUNDLES.map((bundle) => {
            const canAfford = coins >= bundle.price
            const Icon = bundle.icon
            
            return (
              <button
                key={bundle.id}
                onClick={() => handleBuyFreeSpins(bundle)}
                disabled={!canAfford}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl",
                  "bg-card border-2 transition-all",
                  canAfford 
                    ? "border-secondary/50 hover:border-secondary hover:scale-105" 
                    : "border-border opacity-60"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-secondary" />
                </div>
                <span className="text-lg font-bold text-foreground">{bundle.spins}</span>
                <span className="text-xs text-muted-foreground">Free Spins</span>
                <div className="flex items-center gap-1">
                  <Coins className="h-3 w-3 text-primary" />
                  <span className="text-sm font-bold">{bundle.price.toLocaleString()}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Coin Packs Section */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          Coin Packs
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COIN_PACKS.map((pack) => {
            const Icon = pack.icon
            return (
              <div
                key={pack.id}
                className={cn(
                  "relative p-4 rounded-xl",
                  "bg-card border-2",
                  pack.popular ? "border-primary" : "border-border",
                  "transition-transform hover:scale-105"
                )}
              >
                {pack.popular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                    BEST VALUE
                  </div>
                )}
                
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br from-primary/20 to-accent/20"
                  )}>
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">
                      {pack.coins >= 1000 
                        ? `${(pack.coins / 1000).toFixed(0)}k` 
                        : pack.coins
                      }
                    </div>
                    {pack.bonus > 0 && (
                      <div className="text-xs text-win font-medium">
                        +{pack.bonus >= 1000 ? `${(pack.bonus / 1000).toFixed(0)}k` : pack.bonus}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => handleBuyCoinPack(pack)}
                    size="sm"
                    className={cn(
                      "w-full font-bold",
                      pack.popular 
                        ? "bg-primary hover:bg-primary/90" 
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    )}
                  >
                    {pack.price}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Theme Unlocks Section */}
      <ThemeUnlockCards />

      {/* Cosmetic Chest Section */}
      <section>
        <CosmeticChest />
      </section>

      {/* Vanity Store Section */}
      <section>
        <VanityStore />
      </section>

      {/* Balance bar */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-card/95 backdrop-blur border border-border rounded-full shadow-lg flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-bold text-foreground">{coins.toLocaleString()}</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-secondary" />
          <span className="font-bold text-foreground">{freeSpins}</span>
        </div>
      </div>
    </div>
  )
}
