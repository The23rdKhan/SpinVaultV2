"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { useGame, WHEEL_REWARDS } from "@/lib/game-context"
import { Coins } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DailyWheel() {
  const { dailyWheel, spinDailyWheel, coins } = useGame()
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [displayReward, setDisplayReward] = useState<number | null>(null)
  const wheelRef = useRef<HTMLDivElement>(null)

  const segmentAngle = 360 / WHEEL_REWARDS.length
  const colors = [
    "from-red-500 to-red-600",
    "from-blue-500 to-blue-600",
    "from-green-500 to-green-600",
    "from-yellow-500 to-yellow-600",
    "from-purple-500 to-purple-600",
    "from-pink-500 to-pink-600",
    "from-cyan-500 to-cyan-600",
    "from-orange-500 to-orange-600",
  ]

  const handleSpin = () => {
    if (dailyWheel.dailyWheelClaimed || isSpinning) return

    setIsSpinning(true)
    setDisplayReward(null)

    // Get reward from context (this also updates state)
    const reward = spinDailyWheel()
    const rewardIndex = WHEEL_REWARDS.indexOf(reward)
    
    // Calculate rotation to land on the reward
    // Add multiple full rotations for effect
    const extraRotations = 5
    const targetAngle = rewardIndex * segmentAngle
    const newRotation = rotation + (360 * extraRotations) + (360 - targetAngle) + (segmentAngle / 2)
    
    setRotation(newRotation)

    // Show reward after animation
    setTimeout(() => {
      setIsSpinning(false)
      setDisplayReward(reward)
    }, 4000)
  }

  const canSpin = !dailyWheel.dailyWheelClaimed && !isSpinning

  return (
    <div className="glass-panel p-4 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">Daily Wheel</h3>
        {dailyWheel.dailyWheelClaimed && (
          <span className="text-xs text-muted-foreground">Spun today</span>
        )}
      </div>

      {/* Wheel container */}
      <div className="relative mx-auto w-48 h-48 md:w-56 md:h-56">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
        </div>

        {/* Wheel */}
        <div 
          ref={wheelRef}
          className={cn(
            "relative w-full h-full rounded-full",
            "border-4 border-primary shadow-[0_0_30px_var(--primary-color)]",
            "transition-transform ease-out",
            isSpinning ? "duration-[4000ms]" : "duration-0"
          )}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Segments */}
          {WHEEL_REWARDS.map((reward, index) => {
            const startAngle = index * segmentAngle
            const endAngle = (index + 1) * segmentAngle
            
            return (
              <div
                key={index}
                className={cn(
                  "absolute inset-0 overflow-hidden",
                )}
                style={{
                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((endAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((endAngle - 90) * Math.PI / 180)}%)`,
                }}
              >
                <div className={cn("w-full h-full bg-gradient-to-br", colors[index % colors.length])} />
                {/* Reward label */}
                <div 
                  className="absolute top-[15%] left-1/2 -translate-x-1/2 text-white font-bold text-xs md:text-sm"
                  style={{ 
                    transform: `rotate(${startAngle + segmentAngle / 2}deg) translateY(-20px)`,
                    transformOrigin: 'center center',
                  }}
                >
                  {reward}
                </div>
              </div>
            )
          })}
          
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-card border-2 border-primary shadow-lg flex items-center justify-center">
            <Coins className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
        </div>

        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl -z-10" />
      </div>

      {/* Spin button or result */}
      <div className="mt-4 text-center">
        {displayReward !== null ? (
          <div className="animate-bounce-in">
            <p className="text-sm text-muted-foreground mb-1">You won</p>
            <div className="flex items-center justify-center gap-2">
              <Coins className="h-6 w-6 text-win animate-coin-float" />
              <span className="text-2xl font-black text-win">{displayReward}</span>
            </div>
          </div>
        ) : dailyWheel.dailyWheelClaimed ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">Come back tomorrow!</p>
            {dailyWheel.wheelReward && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs">Today&apos;s reward:</span>
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-bold">{dailyWheel.wheelReward}</span>
              </div>
            )}
          </div>
        ) : (
          <Button
            onClick={handleSpin}
            disabled={!canSpin}
            className={cn(
              "w-full max-w-[200px] h-12 rounded-full font-bold",
              "bg-gradient-to-r from-primary via-accent to-primary",
              "hover:from-primary/90 hover:via-accent/90 hover:to-primary/90",
              canSpin && "animate-glow-pulse"
            )}
          >
            {isSpinning ? "SPINNING..." : "SPIN THE WHEEL!"}
          </Button>
        )}
      </div>
    </div>
  )
}
