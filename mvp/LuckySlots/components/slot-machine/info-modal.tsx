"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { SYMBOLS } from "@/lib/game-context"

interface InfoModalProps {
  open: boolean
  onClose: () => void
}

type Tab = "symbols" | "paylines" | "bonus"

export function InfoModal({ open, onClose }: InfoModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("symbols")

  if (!open) return null

  const regularSymbols = SYMBOLS.filter(s => !s.isWild && !s.isScatter)
  const specialSymbols = SYMBOLS.filter(s => s.isWild || s.isScatter)

  // Symbol display component
  const SymbolIcon = ({ symbol, size = "md" }: { symbol: typeof SYMBOLS[0], size?: "sm" | "md" | "lg" }) => {
    const sizeClasses = {
      sm: "w-8 h-8 text-sm",
      md: "w-10 h-10 md:w-12 md:h-12 text-base md:text-lg",
      lg: "w-14 h-14 md:w-16 md:h-16 text-xl md:text-2xl",
    }

    if (symbol.isWild) {
      return (
        <div className={cn(sizeClasses[size], "rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg")}>
          <span className="font-black text-white">W</span>
        </div>
      )
    }
    if (symbol.isScatter) {
      return (
        <div className={cn(sizeClasses[size], "bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-lg")}
          style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }}>
          <span className="font-black text-amber-900 text-xs">S</span>
        </div>
      )
    }

    const colors: Record<string, string> = {
      seven: "from-red-500 to-red-700",
      diamond: "from-cyan-300 to-cyan-500",
      bell: "from-amber-400 to-amber-600",
      cherry: "from-red-400 to-red-600",
      lemon: "from-yellow-300 to-yellow-500",
      orange: "from-orange-400 to-orange-600",
      grape: "from-purple-400 to-purple-600",
    }

    return (
      <div className={cn(sizeClasses[size], "rounded-lg flex items-center justify-center shadow-lg bg-gradient-to-br", colors[symbol.id] || "from-gray-400 to-gray-600")}>
        <span className="font-black text-white">{symbol.emoji}</span>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={cn(
        "relative w-full max-w-md max-h-[80vh] overflow-hidden rounded-2xl",
        "cabinet-frame"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cabinet-border">
          <h2 className="text-lg font-bold gold-text">Game Info</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cabinet-border">
          {(["symbols", "paylines", "bonus"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === "symbols" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Paying Symbols</h3>
                <div className="grid gap-2">
                  {regularSymbols.map((symbol) => (
                    <div key={symbol.id} className="flex items-center justify-between glass-panel p-2 rounded-lg">
                      <div className="flex items-center gap-3">
                        <SymbolIcon symbol={symbol} />
                        <span className="font-medium">{symbol.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">3x: <span className="text-foreground font-bold">{symbol.value}x</span></span>
                        <span className="text-muted-foreground">5x: <span className="text-win font-bold">{symbol.value * 5}x</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Special Symbols</h3>
                <div className="grid gap-2">
                  {specialSymbols.map((symbol) => (
                    <div key={symbol.id} className="flex items-center gap-3 glass-panel p-3 rounded-lg">
                      <SymbolIcon symbol={symbol} />
                      <div>
                        <span className="font-medium">{symbol.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {symbol.isWild ? "Substitutes for all symbols except Scatter" : "3+ triggers 10 Free Spins"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "paylines" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">This game has 9 fixed paylines. Wins are paid left to right.</p>
              
              <div className="grid gap-2">
                {[
                  { name: "Line 1", pattern: "Middle Row", positions: [1,1,1,1,1] },
                  { name: "Line 2", pattern: "Top Row", positions: [0,0,0,0,0] },
                  { name: "Line 3", pattern: "Bottom Row", positions: [2,2,2,2,2] },
                  { name: "Line 4", pattern: "V Shape", positions: [0,1,2,1,0] },
                  { name: "Line 5", pattern: "Inverted V", positions: [2,1,0,1,2] },
                  { name: "Line 6", pattern: "Diagonal Down", positions: [0,0,1,2,2] },
                  { name: "Line 7", pattern: "Diagonal Up", positions: [2,2,1,0,0] },
                  { name: "Line 8", pattern: "Top Bump", positions: [1,0,0,0,1] },
                  { name: "Line 9", pattern: "Bottom Bump", positions: [1,2,2,2,1] },
                ].map((line, idx) => (
                  <div key={idx} className="flex items-center justify-between glass-panel p-3 rounded-lg">
                    <div>
                      <span className="font-medium">{line.name}</span>
                      <p className="text-xs text-muted-foreground">{line.pattern}</p>
                    </div>
                    <div className="flex gap-1">
                      {line.positions.map((pos, i) => (
                        <div key={i} className="flex flex-col gap-0.5">
                          {[0,1,2].map(row => (
                            <div 
                              key={row}
                              className={cn(
                                "w-2 h-2 rounded-sm",
                                pos === row ? "bg-primary" : "bg-muted/30"
                              )}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "bonus" && (
            <div className="space-y-4">
              <div className="glass-panel p-4 rounded-lg space-y-3">
                <h3 className="font-bold text-win">Free Spins</h3>
                <p className="text-sm text-muted-foreground">
                  Land 3 or more Scatter symbols anywhere on the reels to trigger 10 Free Spins!
                </p>
                <div className="flex items-center gap-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-lg"
                      style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }}>
                      <span className="font-black text-amber-900 text-xs">S</span>
                    </div>
                  ))}
                  <span className="text-sm">=</span>
                  <span className="font-bold text-win">10 FREE SPINS</span>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-lg space-y-3">
                <h3 className="font-bold text-jackpot">Mega Jackpot</h3>
                <p className="text-sm text-muted-foreground">
                  Land 5 Lucky Sevens on the middle payline to win the MEGA JACKPOT with 10x multiplier!
                </p>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
                      <span className="font-black text-white">7</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel p-4 rounded-lg space-y-3">
                <h3 className="font-bold gold-text">Win Types</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Normal Win</span>
                    <span className="text-muted-foreground">Below 5x bet</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary font-medium">Big Win</span>
                    <span className="text-muted-foreground">5x - 10x bet</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-win font-medium">Mega Win</span>
                    <span className="text-muted-foreground">10x - 25x bet</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-jackpot font-bold">JACKPOT</span>
                    <span className="text-muted-foreground">25x+ bet</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
