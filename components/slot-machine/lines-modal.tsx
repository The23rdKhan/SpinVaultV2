"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

interface LinesModalProps {
  open: boolean
  onClose: () => void
}

const PAYLINES = [
  { name: "Line 1", description: "Middle Row", positions: [1,1,1,1,1], color: "bg-red-500" },
  { name: "Line 2", description: "Top Row", positions: [0,0,0,0,0], color: "bg-blue-500" },
  { name: "Line 3", description: "Bottom Row", positions: [2,2,2,2,2], color: "bg-green-500" },
  { name: "Line 4", description: "V Shape", positions: [0,1,2,1,0], color: "bg-yellow-500" },
  { name: "Line 5", description: "Inverted V", positions: [2,1,0,1,2], color: "bg-purple-500" },
  { name: "Line 6", description: "Diagonal Down", positions: [0,0,1,2,2], color: "bg-pink-500" },
  { name: "Line 7", description: "Diagonal Up", positions: [2,2,1,0,0], color: "bg-cyan-500" },
  { name: "Line 8", description: "Top Bump", positions: [1,0,0,0,1], color: "bg-orange-500" },
  { name: "Line 9", description: "Bottom Bump", positions: [1,2,2,2,1], color: "bg-indigo-500" },
]

export function LinesModal({ open, onClose }: LinesModalProps) {
  const [currentLine, setCurrentLine] = useState(0)

  if (!open) return null

  const payline = PAYLINES[currentLine]

  const goToPrev = () => {
    setCurrentLine(prev => prev === 0 ? PAYLINES.length - 1 : prev - 1)
  }

  const goToNext = () => {
    setCurrentLine(prev => prev === PAYLINES.length - 1 ? 0 : prev + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-2xl",
        "cabinet-frame"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cabinet-border">
          <h2 className="text-lg font-bold gold-text">Paylines</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Line indicator */}
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToPrev}
              className="h-10 w-10 rounded-full bg-cabinet-inner border border-cabinet-border"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="text-center">
              <div className={cn("text-2xl font-black", payline.color.replace("bg-", "text-"))}>
                {payline.name}
              </div>
              <div className="text-sm text-muted-foreground">{payline.description}</div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNext}
              className="h-10 w-10 rounded-full bg-cabinet-inner border border-cabinet-border"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Visual grid */}
          <div className="glass-panel p-4 rounded-xl mb-4">
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2].map(row => (
                payline.positions.map((pos, col) => (
                  <div
                    key={`${row}-${col}`}
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center transition-all",
                      pos === row 
                        ? cn(payline.color, "shadow-lg scale-110") 
                        : "bg-muted/20"
                    )}
                  >
                    {pos === row && (
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    )}
                  </div>
                ))
              ))}
            </div>
          </div>

          {/* Line dots */}
          <div className="flex justify-center gap-2">
            {PAYLINES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentLine(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentLine 
                    ? cn(PAYLINES[idx].color, "scale-125") 
                    : "bg-muted/40 hover:bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-muted-foreground">
            Match 3+ symbols from left to right to win!
          </p>
        </div>
      </div>
    </div>
  )
}
