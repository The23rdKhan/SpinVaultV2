"use client"

import { useState } from "react"
import { useGame } from "@/lib/game-context"
import { ALL_VANITY_ITEMS, RARITY_COLORS } from "@/lib/vanity-data"
import { cn } from "@/lib/utils"
import { 
  Trophy, 
  Crown, 
  Coins, 
  TrendingUp, 
  Medal,
  ChevronRight,
  User,
} from "lucide-react"
import { PlayerProfileModal } from "./player-profile-modal"

type LeaderboardType = "biggestWin" | "totalWinnings"

interface LeaderboardEntry {
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

// Generate mock leaderboard data
const generateMockLeaderboard = (
  type: LeaderboardType,
  currentUserStats: { username: string; value: number; frame?: string; title?: string; pet?: string }
): LeaderboardEntry[] => {
  const names = [
    "LuckyAce", "SpinMaster", "JackpotJenny", "GoldenDragon", "HighRoller99",
    "DiamondQueen", "SlotKing", "FortuneSeeker", "WildWinner", "MegaSpinner",
    "CyberSlots", "TreasureHunter", "NeonNinja", "VIPVictor", "BonusBoss",
    "ReelDeal", "CashCow", "BigBetBob", "LadyLuck", "PlatinumPlayer",
  ]
  
  const petOptions = ["pet-none", "pet-cat", "pet-dragon", "pet-phoenix", "pet-unicorn", "pet-robot"]
  const mockEntries: LeaderboardEntry[] = names.slice(0, 20).map((name, i) => ({
    rank: i + 1,
    username: name,
    value: type === "biggestWin" 
      ? Math.floor(50000 / (i + 1) + Math.random() * 5000)
      : Math.floor(500000 / (i + 1) + Math.random() * 50000),
    vipTier: Math.max(1, 5 - Math.floor(i / 4)),
    frame: i < 3 ? "frame-diamond" : i < 10 ? "frame-gold" : "frame-basic",
    title: i === 0 ? "Jackpot King" : i < 5 ? "Legend" : "Player",
    pet: i < 5 ? petOptions[Math.floor(Math.random() * petOptions.length)] : "pet-none",
  }))
  
  // Insert current user somewhere in the list
  const userRank = Math.floor(Math.random() * 50) + 21 // Rank 21-70
  const userEntry: LeaderboardEntry = {
    rank: userRank,
    username: currentUserStats.username,
    value: currentUserStats.value,
    isCurrentUser: true,
    vipTier: 1,
    frame: currentUserStats.frame ?? "frame-basic",
    title: currentUserStats.title ?? "Player",
    pet: currentUserStats.pet ?? "pet-none",
  }
  
  return [...mockEntries, userEntry].sort((a, b) => b.value - a.value).map((entry, i) => ({
    ...entry,
    rank: i + 1,
  }))
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  onClick: () => void
}

function LeaderboardRow({ entry, onClick }: LeaderboardRowProps) {
  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-amber-500/20 text-amber-400 border-amber-500"
    if (rank === 2) return "bg-zinc-300/20 text-zinc-300 border-zinc-400"
    if (rank === 3) return "bg-orange-600/20 text-orange-500 border-orange-600"
    return "bg-muted/30 text-muted-foreground border-transparent"
  }
  
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-amber-400" />
    if (rank === 2) return <Medal className="h-4 w-4 text-zinc-300" />
    if (rank === 3) return <Medal className="h-4 w-4 text-orange-500" />
    return null
  }
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
        "hover:bg-muted/50 active:scale-[0.98]",
        entry.isCurrentUser && "bg-primary/10 border border-primary"
      )}
    >
      {/* Rank */}
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold",
        getRankStyle(entry.rank)
      )}>
        {getRankIcon(entry.rank) || entry.rank}
      </div>
      
      {/* Avatar with equipped frame and pet */}
      {(() => {
        const frameItem = entry.frame ? ALL_VANITY_ITEMS.find(i => i.id === entry.frame) : null
        const frameParts = frameItem ? RARITY_COLORS[frameItem.rarity] : null
        const petItem = entry.pet ? ALL_VANITY_ITEMS.find(i => i.id === entry.pet) : null
        const showPet = petItem && petItem.id !== "pet-none"
        
        return (
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center bg-muted",
              frameParts ? cn("border-2", frameParts.border) : "border border-muted-foreground"
            )}>
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            {showPet && (
              <div 
                className={cn(
                  "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                  "bg-card border border-border shadow-sm"
                )}
                title={petItem.name}
              >
                {petItem.previewImage === "cat" && "🐱"}
                {petItem.previewImage === "dragon" && "🐉"}
                {petItem.previewImage === "phoenix" && "🔥"}
                {petItem.previewImage === "unicorn" && "🦄"}
                {petItem.previewImage === "robot" && "🤖"}
                {petItem.previewImage === "celestial" && "✨"}
              </div>
            )}
          </div>
        )
      })()}

      {/* Info */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(
            "font-bold text-sm truncate",
            entry.isCurrentUser ? "text-primary" : "text-foreground"
          )}>
            {entry.username}
          </span>
          {entry.vipTier && entry.vipTier >= 3 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 flex-shrink-0">
              VIP {entry.vipTier}
            </span>
          )}
        </div>
        {entry.title && (
          <span className={cn(
            "text-[11px]",
            (() => {
              const titleItem = ALL_VANITY_ITEMS.find(i => i.id === entry.title || i.previewImage === entry.title)
              return titleItem ? RARITY_COLORS[titleItem.rarity].text : "text-muted-foreground"
            })()
          )}>
            {entry.title}
          </span>
        )}
      </div>
      
      {/* Value */}
      <div className="flex items-center gap-1.5 text-right">
        <Coins className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">{entry.value.toLocaleString()}</span>
      </div>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}

export function Leaderboard() {
  const [type, setType] = useState<LeaderboardType>("biggestWin")
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null)
  const { username, leaderboardStats, userVanity } = useGame()

  // Resolve the display title from equipped title item
  const equippedTitleItem = userVanity.equippedTitleId
    ? ALL_VANITY_ITEMS.find(i => i.id === userVanity.equippedTitleId)
    : null
  const displayTitle = equippedTitleItem?.previewImage ?? "Player"

  const entries = generateMockLeaderboard(
    type,
    {
      username,
      value: type === "biggestWin"
        ? leaderboardStats.weeklyBiggestWin
        : leaderboardStats.weeklyTotalWinnings,
      frame: userVanity.equippedFrameId,
      title: displayTitle,
      pet: userVanity.equippedPetId,
    }
  )
  
  const topEntries = entries.slice(0, 20)
  const currentUserEntry = entries.find(e => e.isCurrentUser)
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Weekly Leaderboard
        </h3>
      </div>
      
      {/* Type tabs */}
      <div className="flex gap-2 p-1 bg-muted/30 rounded-xl">
        <button
          onClick={() => setType("biggestWin")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
            type === "biggestWin"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Crown className="h-4 w-4" />
          Biggest Win
        </button>
        <button
          onClick={() => setType("totalWinnings")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
            type === "totalWinnings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          Total Winnings
        </button>
      </div>
      
      {/* Leaderboard list */}
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {topEntries.map(entry => (
          <LeaderboardRow
            key={entry.rank}
            entry={entry}
            onClick={() => setSelectedPlayer(entry)}
          />
        ))}
      </div>
      
      {/* Current user position if not in top 20 */}
      {currentUserEntry && currentUserEntry.rank > 20 && (
        <div className="bg-card rounded-xl border border-primary p-1">
          <div className="text-center text-xs text-muted-foreground py-1">Your Position</div>
          <LeaderboardRow
            entry={currentUserEntry}
            onClick={() => setSelectedPlayer(currentUserEntry)}
          />
        </div>
      )}
      
      {/* Player profile modal */}
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
}
