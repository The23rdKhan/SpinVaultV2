"use client"

import { cn } from "@/lib/utils"
import type { SlotSymbol } from "@/lib/game-context"

interface SymbolProps {
  symbol: SlotSymbol
  isWinning?: boolean
  isSpinning?: boolean
  delay?: number
}

// Premium symbol graphics using styled divs
const SymbolGraphics: Record<string, React.ReactNode> = {
  seven: (
    <div className="relative flex items-center justify-center w-full h-full">
      <span className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-gradient-to-b from-red-400 via-red-500 to-red-700 bg-clip-text drop-shadow-lg">
        7
      </span>
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 rounded-lg" />
    </div>
  ),
  diamond: (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rotate-45 bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-600 shadow-lg shadow-cyan-500/50" />
      <div className="absolute w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 rotate-45 bg-gradient-to-tl from-transparent via-white/40 to-white/60" />
    </div>
  ),
  bell: (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="flex flex-col items-center">
        <div className="w-8 h-7 md:w-10 md:h-9 lg:w-12 lg:h-10 rounded-t-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/40" />
        <div className="w-10 h-2 md:w-12 md:h-2.5 lg:w-14 lg:h-3 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-b-lg" />
        <div className="w-2 h-2 md:w-2.5 md:h-2.5 lg:w-3 lg:h-3 bg-yellow-700 rounded-full mt-0.5" />
      </div>
    </div>
  ),
  cherry: (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="flex gap-1">
        <div className="w-5 h-6 md:w-6 md:h-7 lg:w-7 lg:h-8 rounded-full bg-gradient-to-br from-red-400 via-red-500 to-red-700 shadow-lg shadow-red-500/40" />
        <div className="w-5 h-6 md:w-6 md:h-7 lg:w-7 lg:h-8 rounded-full bg-gradient-to-br from-red-400 via-red-500 to-red-700 shadow-lg shadow-red-500/40 -mt-1" />
      </div>
      <div className="absolute -top-1 left-1/2 w-1 h-4 md:h-5 bg-gradient-to-b from-green-500 to-green-700 rounded-full transform -translate-x-1/2 rotate-12" />
    </div>
  ),
  lemon: (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="w-9 h-7 md:w-11 md:h-9 lg:w-13 lg:h-10 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 shadow-lg shadow-yellow-400/40 transform rotate-12" />
      <div className="absolute w-7 h-5 md:w-9 md:h-7 lg:w-11 lg:h-8 rounded-full bg-gradient-to-tl from-transparent via-white/20 to-white/40 transform rotate-12" />
    </div>
  ),
  orange: (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-lg shadow-orange-500/40" />
      <div className="absolute w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-tl from-transparent via-white/15 to-white/30" />
      <div className="absolute -top-0.5 left-1/2 w-1.5 h-2 md:w-2 md:h-2.5 bg-green-600 rounded-full transform -translate-x-1/2" />
    </div>
  ),
  grape: (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="flex flex-col items-center -space-y-1">
        <div className="flex gap-0.5">
          <div className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700" />
          <div className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700" />
        </div>
        <div className="flex gap-0.5">
          <div className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700" />
          <div className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700" />
          <div className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700" />
        </div>
      </div>
    </div>
  ),
  wild: (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/50">
        <span className="text-xs md:text-sm lg:text-base font-black text-white tracking-wider">WILD</span>
      </div>
    </div>
  ),
  scatter: (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="relative">
        <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 clip-star shadow-lg shadow-yellow-400/60" 
          style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/50 clip-star"
          style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}
        />
      </div>
    </div>
  ),
}

export function Symbol({ symbol, isWinning = false, isSpinning = false, delay = 0 }: SymbolProps) {
  return (
    <div 
      className={cn(
        "relative w-full h-full flex items-center justify-center",
        "transition-all duration-300",
        isWinning && "animate-symbol-pulse",
        !isSpinning && "animate-symbol-land"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Symbol glow effect for wins */}
      {isWinning && (
        <div className="absolute inset-0 bg-glow/20 rounded-lg blur-md animate-glow-pulse" />
      )}
      
      {/* Symbol graphic */}
      <div className={cn(
        "relative z-10 w-full h-full flex items-center justify-center",
        isWinning && "drop-shadow-[0_0_10px_var(--glow-color)]"
      )}>
        {SymbolGraphics[symbol.id] || (
          <span className="text-3xl md:text-4xl lg:text-5xl">{symbol.emoji}</span>
        )}
      </div>
    </div>
  )
}
