"use client"

import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { Target, Check, Coins, Zap, Trophy, Crown } from "lucide-react"

const MISSION_ICONS: Record<string, typeof Target> = {
  spin20: Zap,
  win5: Trophy,
  maxbet1: Crown,
}

export function TodaysMissions() {
  const { missions, claimMissionReward } = useGame()

  const completedCount = missions.filter(m => m.completed).length
  const allCompleted = completedCount === missions.length

  return (
    <div className="glass-panel p-4 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">Today&apos;s Missions</h3>
        </div>
        <div className="text-xs text-muted-foreground">
          {completedCount}/{missions.length} complete
        </div>
      </div>

      {/* Mission list */}
      <div className="space-y-3">
        {missions.map((mission) => {
          const Icon = MISSION_ICONS[mission.id] || Target
          const progress = Math.min(mission.progress, mission.target)
          const progressPercent = (progress / mission.target) * 100

          return (
            <div
              key={mission.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl",
                "bg-cabinet-inner/50 border border-cabinet-border",
                mission.completed && !mission.claimed && "border-win/50 bg-win/10"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                mission.completed ? "bg-win/20" : "bg-primary/20"
              )}>
                {mission.claimed ? (
                  <Check className="h-5 w-5 text-win" />
                ) : (
                  <Icon className={cn("h-5 w-5", mission.completed ? "text-win" : "text-primary")} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "font-medium text-sm",
                    mission.claimed && "line-through text-muted-foreground"
                  )}>
                    {mission.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-primary" />
                    <span className="text-xs font-bold">{mission.reward}</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">{mission.description}</p>
                
                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        mission.completed 
                          ? "bg-gradient-to-r from-win to-win/80" 
                          : "bg-gradient-to-r from-primary to-primary/80"
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {progress}/{mission.target}
                  </span>
                </div>
              </div>

              {/* Claim button */}
              {mission.completed && !mission.claimed && (
                <Button
                  size="sm"
                  onClick={() => claimMissionReward(mission.id)}
                  className={cn(
                    "h-8 px-3 rounded-full",
                    "bg-win hover:bg-win/90 text-white",
                    "animate-glow-pulse"
                  )}
                >
                  Claim
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* All completed bonus */}
      {allCompleted && (
        <div className={cn(
          "mt-4 p-3 rounded-xl text-center",
          "bg-gradient-to-r from-win/20 via-primary/20 to-win/20",
          "border border-win/30"
        )}>
          <p className="text-sm font-medium text-win">All missions completed!</p>
          <p className="text-xs text-muted-foreground">New missions tomorrow</p>
        </div>
      )}
    </div>
  )
}
