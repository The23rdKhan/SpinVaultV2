"use client"

import { useGame, type Theme } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, Lock, Palette } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const THEMES: { id: Theme; name: string; description: string; color: string }[] = [
  { id: "vegas", name: "Vegas", description: "Classic gold and red luxury", color: "from-amber-500 to-red-600" },
  { id: "cyber", name: "Cyber", description: "Futuristic neon vibes", color: "from-cyan-400 to-purple-600" },
  { id: "treasure", name: "Treasure", description: "Pirate adventure teal", color: "from-teal-400 to-amber-500" },
]

export function ThemeSwitcher() {
  const { currentTheme, setTheme, ownedThemes } = useGame()

  const handleThemeChange = (theme: Theme) => {
    if (ownedThemes.includes(theme)) {
      setTheme(theme)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="rounded-full border-primary/50 bg-card/80 backdrop-blur-sm"
        >
          <Palette className="h-5 w-5 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border">
        {THEMES.map((theme) => {
          const isOwned = ownedThemes.includes(theme.id)
          const isActive = currentTheme === theme.id
          
          return (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              disabled={!isOwned}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive && "bg-primary/10"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full bg-gradient-to-br",
                theme.color
              )} />
              <div className="flex-1">
                <div className="font-medium text-foreground">{theme.name}</div>
                <div className="text-xs text-muted-foreground">{theme.description}</div>
              </div>
              {isActive && <Check className="h-4 w-4 text-primary" />}
              {!isOwned && <Lock className="h-4 w-4 text-muted-foreground" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
