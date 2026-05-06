"use client"

import { cn } from "@/lib/utils"
import { ALL_VANITY_ITEMS, RARITY_COLORS, TROPHY_DEFINITIONS } from "@/lib/vanity-data"
import { 
  X, 
  User, 
  Crown, 
  Trophy, 
  Coins, 
  TrendingUp,
  Star,
  Sparkles,
  Award,
  Flame,
  Lock,
} from "lucide-react"

interface PlayerProfile {
  rank: number
  username: string
  value: number
  avatar?: string
  frame?: string
  title?: string
  pet?: string
  vipTier?: number
  isCurrentUser?: boolean
}

interface PlayerProfileModalProps {
  player: PlayerProfile
  onClose: () => void
}

// Pet emoji mapping
const PET_EMOJI: Record<string, string> = {
  cat: "🐱",
  dragon: "🐉",
  phoenix: "🔥",
  unicorn: "🦄",
  robot: "🤖",
  celestial: "✨",
}

export function PlayerProfileModal({ player, onClose }: PlayerProfileModalProps) {
  // Resolve equipped cosmetics from IDs
  const frameItem = player.frame ? ALL_VANITY_ITEMS.find(i => i.id === player.frame) : null
  const titleItem = player.title ? ALL_VANITY_ITEMS.find(i => i.previewImage === player.title || i.id === player.title) : null
  const petItem = player.pet ? ALL_VANITY_ITEMS.find(i => i.id === player.pet) : null
  const showPet = petItem && petItem.id !== "pet-none"

  // Frame styling
  const frameParts = frameItem ? RARITY_COLORS[frameItem.rarity] : null

  // Mock public stats (what other players can see)
  const publicStats = {
    level: Math.floor(Math.random() * 50) + 10,
    totalSpins: Math.floor(Math.random() * 10000) + 1000,
    biggestWin: Math.floor(Math.random() * 50000) + 5000,
    memberSince: "2024",
  }
  
  // Mock trophy showcase (random unlocked trophies for other players)
  const mockTrophies = TROPHY_DEFINITIONS.slice(0, 6).map(t => ({
    ...t,
    unlocked: Math.random() > 0.4,
  }))
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-card rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        
        {/* Header with avatar showcase */}
        <div className="relative pt-8 pb-6 px-6 bg-gradient-to-b from-primary/20 to-transparent flex-shrink-0">
          <div className="flex flex-col items-center">
            {/* Avatar with frame and pet */}
            <div className="relative mb-3">
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center bg-muted",
                frameParts ? cn("border-4", frameParts.border, "shadow-xl") : "border-2 border-muted-foreground"
              )}
              style={frameParts ? { boxShadow: `0 0 20px ${frameParts.text.replace('text-', '')}` } : undefined}
              >
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
              
              {/* Pet badge */}
              {showPet && (
                <div 
                  className={cn(
                    "absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-lg",
                    "bg-card border-2 shadow-lg",
                    RARITY_COLORS[petItem.rarity].border
                  )}
                  title={petItem.name}
                >
                  {PET_EMOJI[petItem.previewImage] || "🐾"}
                </div>
              )}
            </div>
            
            {/* Username */}
            <h3 className="text-xl font-bold text-foreground">{player.username}</h3>
            
            {/* Title and VIP badge */}
            <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
              {titleItem && (
                <span className={cn(
                  "text-sm font-medium",
                  RARITY_COLORS[titleItem.rarity].text
                )}>
                  {titleItem.previewImage || titleItem.name}
                </span>
              )}
              {!titleItem && player.title && (
                <span className="text-sm text-muted-foreground">{player.title}</span>
              )}
              {player.vipTier && player.vipTier >= 2 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  VIP {player.vipTier}
                </span>
              )}
            </div>
            
            {/* Leaderboard rank pill */}
            <div className="mt-3 px-4 py-1.5 rounded-full bg-primary/20 border border-primary">
              <span className="text-sm font-bold text-primary">Rank #{player.rank}</span>
            </div>
          </div>
        </div>
        
        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-6">
          {/* Equipped Cosmetics Showcase */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Equipped Cosmetics
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {/* Frame */}
              <div className={cn(
                "p-2 rounded-lg border text-center",
                frameItem ? cn(RARITY_COLORS[frameItem.rarity].border, RARITY_COLORS[frameItem.rarity].bg) : "border-muted bg-muted/20"
              )}>
                <p className="text-[10px] text-muted-foreground uppercase">Frame</p>
                <p className={cn("text-xs font-bold truncate", frameItem ? RARITY_COLORS[frameItem.rarity].text : "text-muted-foreground")}>
                  {frameItem?.name || "Basic"}
                </p>
              </div>
              
              {/* Title */}
              <div className={cn(
                "p-2 rounded-lg border text-center",
                titleItem ? cn(RARITY_COLORS[titleItem.rarity].border, RARITY_COLORS[titleItem.rarity].bg) : "border-muted bg-muted/20"
              )}>
                <p className="text-[10px] text-muted-foreground uppercase">Title</p>
                <p className={cn("text-xs font-bold truncate", titleItem ? RARITY_COLORS[titleItem.rarity].text : "text-muted-foreground")}>
                  {titleItem?.name || "Player"}
                </p>
              </div>
              
              {/* Pet */}
              <div className={cn(
                "p-2 rounded-lg border text-center",
                showPet ? cn(RARITY_COLORS[petItem.rarity].border, RARITY_COLORS[petItem.rarity].bg) : "border-muted bg-muted/20"
              )}>
                <p className="text-[10px] text-muted-foreground uppercase">Pet</p>
                <p className={cn("text-xs font-bold truncate", showPet ? RARITY_COLORS[petItem.rarity].text : "text-muted-foreground")}>
                  {showPet ? petItem.name : "None"}
                </p>
              </div>
            </div>
          </div>

          {/* Public Stats */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-muted-foreground mb-3">Public Stats</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">Level</span>
                </div>
                <span className="text-lg font-bold text-foreground">{publicStats.level}</span>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Spins</span>
                </div>
                <span className="text-lg font-bold text-foreground">{publicStats.totalSpins.toLocaleString()}</span>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Coins className="h-3.5 w-3.5 text-secondary" />
                  <span className="text-xs text-muted-foreground">Biggest Win</span>
                </div>
                <span className="text-lg font-bold text-foreground">{publicStats.biggestWin.toLocaleString()}</span>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs text-muted-foreground">Leaderboard</span>
                </div>
                <span className="text-lg font-bold text-foreground">#{player.rank}</span>
              </div>
            </div>
          </div>
          
          {/* Trophy Case */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Trophy Case
              <span className="ml-auto text-xs font-normal">
                {mockTrophies.filter(t => t.unlocked).length}/{mockTrophies.length}
              </span>
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {mockTrophies.map(trophy => {
                const iconClass = cn("h-5 w-5", trophy.unlocked ? "text-amber-400" : "text-muted-foreground")
                return (
                  <div
                    key={trophy.id}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2",
                      trophy.unlocked
                        ? "bg-amber-500/10 border-amber-500"
                        : "bg-muted/20 border-muted"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      trophy.unlocked ? "bg-amber-500/20" : "bg-muted/40"
                    )}>
                      {trophy.icon === "star"    && <Award    className={iconClass} />}
                      {trophy.icon === "zap"     && <Sparkles className={iconClass} />}
                      {trophy.icon === "crown"   && <Crown    className={iconClass} />}
                      {trophy.icon === "coins"   && <Coins    className={iconClass} />}
                      {trophy.icon === "palette" && <Award    className={iconClass} />}
                      {trophy.icon === "flame"   && <Flame    className={iconClass} />}
                      {trophy.icon === "gem"     && <Star     className={iconClass} />}
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold text-center",
                      trophy.unlocked ? "text-amber-400" : "text-muted-foreground"
                    )}>
                      {trophy.unlocked ? trophy.name : "???"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Private data notice */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-muted">
            <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Coin balance, purchase history, and account details are private.
            </p>
          </div>
          
          {/* Member since */}
          <div className="mt-4 text-center">
            <span className="text-xs text-muted-foreground">Playing since {publicStats.memberSince}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
