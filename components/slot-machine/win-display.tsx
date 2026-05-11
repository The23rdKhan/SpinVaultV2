"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import type { WinType } from "@/lib/game-context"

interface WinDisplayProps {
  show: boolean
  amount: number
  winType: WinType
  freeSpins: number
  onClose?: () => void
}

const WIN_CONFIG = {
  normal: {
    title: "WIN",
    duration: 2000,
    particles: 6,
    gradient: "from-primary to-primary/80",
    textClass: "text-primary",
    showFullscreen: false,
  },
  bigWin: {
    title: "BIG WIN!",
    duration: 3500,
    particles: 12,
    gradient: "from-primary via-win to-primary",
    textClass: "text-win",
    showFullscreen: true,
  },
  megaWin: {
    title: "MEGA WIN!!",
    duration: 4500,
    particles: 20,
    gradient: "from-win via-primary to-win",
    textClass: "text-win",
    showFullscreen: true,
  },
  jackpot: {
    title: "JACKPOT!!!",
    duration: 6000,
    particles: 30,
    gradient: "from-jackpot via-primary to-jackpot",
    textClass: "text-jackpot",
    showFullscreen: true,
  },
  none: {
    title: "",
    duration: 0,
    particles: 0,
    gradient: "",
    textClass: "",
    showFullscreen: false,
  },
}

export function WinDisplay({ show, amount, winType, freeSpins, onClose }: WinDisplayProps) {
  const [displayAmount, setDisplayAmount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  const config = WIN_CONFIG[winType] || WIN_CONFIG.normal

  useEffect(() => {
    if (show && amount > 0 && winType !== "none") {
      setIsVisible(true)
      
      // Animate counting up
      const duration = Math.min(1500, config.duration * 0.4)
      const steps = 30
      const increment = amount / steps
      let current = 0
      
      const interval = setInterval(() => {
        current += increment
        if (current >= amount) {
          setDisplayAmount(amount)
          clearInterval(interval)
        } else {
          setDisplayAmount(Math.floor(current))
        }
      }, duration / steps)

      // Auto-close
      const closeTimeout = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, config.duration)

      return () => {
        clearInterval(interval)
        clearTimeout(closeTimeout)
      }
    } else {
      setDisplayAmount(0)
    }
  }, [show, amount, winType, config.duration, onClose])

  if (!isVisible || winType === "none") return null

  // Small inline win display for normal wins
  if (!config.showFullscreen) {
    return (
      <div className={cn(
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40",
        "px-8 py-4 rounded-2xl",
        "bg-card/95 border-2 border-primary",
        "shadow-[0_0_40px_var(--primary-color)]",
        "animate-bounce-in"
      )}>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">WIN</span>
          <span className="text-3xl md:text-4xl font-black text-primary">
            ${displayAmount.toLocaleString()}
          </span>
        </div>
      </div>
    )
  }

  // Full screen celebration for big wins
  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-background/90 backdrop-blur-md",
        "animate-in fade-in duration-300"
      )}
      onClick={() => {
        setIsVisible(false)
        onClose?.()
      }}
    >
      {/* Particle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(config.particles)].map((_, i) => {
          const size = Math.random() * 20 + 10
          const startX = Math.random() * 100
          const startY = Math.random() * 100
          const delay = Math.random() * 0.5
          
          return (
            <div
              key={i}
              className={cn(
                "absolute rounded-full",
                winType === "jackpot" ? "bg-jackpot" : winType === "megaWin" ? "bg-win" : "bg-primary"
              )}
              style={{
                width: size,
                height: size,
                left: `${startX}%`,
                top: `${startY}%`,
                opacity: 0.7,
                animation: `particle-burst 2s ease-out ${delay}s infinite`,
              }}
            />
          )
        })}
      </div>

      {/* Main content */}
      <div className={cn(
        "relative flex flex-col items-center gap-6 p-10 rounded-3xl",
        "bg-gradient-to-b from-card to-card/90",
        "border-4",
        winType === "jackpot" ? "border-jackpot animate-jackpot-flash" : "border-primary",
        "shadow-2xl"
      )}>
        {/* Title */}
        <div className={cn(
          "text-4xl md:text-6xl font-black",
          "text-transparent bg-clip-text bg-gradient-to-r",
          config.gradient,
          winType === "jackpot" && "animate-pulse"
        )}>
          {config.title}
        </div>

        {/* Win amount */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-lg text-muted-foreground uppercase tracking-widest">YOU WON</span>
          <div className={cn(
            "text-5xl md:text-7xl font-black",
            config.textClass,
            "animate-win-shimmer"
          )}>
            ${displayAmount.toLocaleString()}
          </div>
        </div>

        {/* Free spins bonus */}
        {freeSpins > 0 && (
          <div className="flex flex-col items-center gap-2 mt-2 p-5 bg-gradient-to-r from-secondary/20 via-secondary/30 to-secondary/20 rounded-2xl border border-secondary">
            <span className="text-secondary text-xl font-bold uppercase tracking-wider">Bonus!</span>
            <span className="text-3xl font-black text-foreground">
              +{freeSpins} FREE SPINS
            </span>
          </div>
        )}

        {/* Tap to continue */}
        <p className="text-sm text-muted-foreground animate-pulse">Tap anywhere to continue</p>

        {/* Corner sparkles */}
        <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary rounded-full animate-ping opacity-50" />
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-primary rounded-full animate-ping opacity-50" style={{ animationDelay: '0.2s' }} />
        <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-primary rounded-full animate-ping opacity-50" style={{ animationDelay: '0.4s' }} />
        <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-primary rounded-full animate-ping opacity-50" style={{ animationDelay: '0.6s' }} />
      </div>
    </div>
  )
}
