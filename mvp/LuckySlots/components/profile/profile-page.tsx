"use client"

import { useGame } from "@/lib/game-context"
import { useAuth } from "@/lib/auth-context"
import { useAppearance, type AppearanceMode } from "@/lib/appearance-context"
import { 
  ALL_VANITY_ITEMS, 
  RARITY_COLORS,
  RARITY_LABELS,
  TROPHY_DEFINITIONS,
} from "@/lib/vanity-data"
import { ItemPreview } from "@/components/shop/vanity-store"
import { HelpFeedback } from "./help-feedback"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  User, 
  Trophy, 
  Coins, 
  Sparkles, 
  Target, 
  Flame,
  TrendingUp,
  Award,
  Edit2,
  Volume2,
  VolumeX,
  Music,
  Vibrate,
  Bell,
  BellOff,
  Clock,
  Shield,
  HelpCircle,
  MessageCircle,
  ChevronRight,
  Crown,
  Link2,
  LogOut,
  RotateCcw,
  Gift,
  Megaphone,
  Calendar,
  Loader2,
  Sun,
  Moon,
  Monitor
} from "lucide-react"
import { useState } from "react"

const VIP_TIERS = [
  { level: 1, name: "Bronze", minXp: 0, color: "from-amber-700 to-amber-900" },
  { level: 2, name: "Silver", minXp: 5000, color: "from-gray-400 to-gray-600" },
  { level: 3, name: "Gold", minXp: 15000, color: "from-yellow-400 to-amber-500" },
  { level: 4, name: "Platinum", minXp: 50000, color: "from-cyan-300 to-blue-400" },
  { level: 5, name: "Diamond", minXp: 150000, color: "from-purple-400 to-pink-400" },
]

export function ProfilePage() {
  const { 
    username, 
    setUsername, 
    level, 
    xp, 
    coins, 
    totalSpins, 
    biggestWin,
    dailyStreak,
    ownedThemes,
    currentTheme,
    soundEnabled,
    musicEnabled,
    hapticsEnabled,
    notificationsEnabled,
    toggleSound,
    toggleMusic,
    toggleHaptics,
    toggleNotifications,
    sessionReminderMinutes,
    setSessionReminder,
    cooldownEnabled,
    toggleCooldown,
    userVanity,
    trophies,
    recentBigWins,
    leaderboardStats,
  } = useGame()

  const {
    user,
    isGuest,
    notificationPrefs,
    setNotificationPref,
    signInWithApple,
    signInWithGoogle,
    linkAccount,
    signOut,
    restorePurchases,
  } = useAuth()

  const { mode: appearanceMode, setMode: setAppearanceMode } = useAppearance()

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(username)
  const [isLinking, setIsLinking] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [showLinkOptions, setShowLinkOptions] = useState(false)

  const totalXp = level * 1000 + xp
  const currentVipTier = [...VIP_TIERS].reverse().find(t => totalXp >= t.minXp) || VIP_TIERS[0]
  const nextVipTier = VIP_TIERS.find(t => t.minXp > totalXp)
  
  const xpNeeded = level * 1000
  const xpProgress = (xp / xpNeeded) * 100

  const handleSaveName = () => {
    if (editName.trim()) {
      setUsername(editName.trim())
    }
    setIsEditing(false)
  }

  const handleLinkAccount = async (provider: "apple" | "google") => {
    setIsLinking(true)
    try {
      await linkAccount(provider)
      setShowLinkOptions(false)
    } finally {
      setIsLinking(false)
    }
  }

  const handleRestorePurchases = async () => {
    setIsRestoring(true)
    try {
      await restorePurchases()
    } finally {
      setIsRestoring(false)
    }
  }

  const stats = [
    { label: "Total Spins", value: totalSpins.toLocaleString(), icon: Target },
    { label: "Biggest Win", value: `$${biggestWin.toLocaleString()}`, icon: Trophy },
    { label: "Day Streak", value: dailyStreak.toString(), icon: Flame },
    { label: "Themes Owned", value: ownedThemes.length.toString(), icon: Sparkles },
  ]

  const achievements = [
    { 
      id: "first-spin", 
      name: "First Spin", 
      description: "Complete your first spin",
      unlocked: totalSpins >= 1,
      progress: Math.min(totalSpins, 1),
      target: 1,
      icon: Target
    },
    { 
      id: "high-roller", 
      name: "High Roller", 
      description: "Spin 100 times",
      unlocked: totalSpins >= 100,
      progress: Math.min(totalSpins, 100),
      target: 100,
      icon: TrendingUp
    },
    { 
      id: "big-winner", 
      name: "Big Winner", 
      description: "Win 1,000+ coins in one spin",
      unlocked: biggestWin >= 1000,
      progress: Math.min(biggestWin, 1000),
      target: 1000,
      icon: Trophy
    },
    { 
      id: "collector", 
      name: "Collector", 
      description: "Own all 3 themes",
      unlocked: ownedThemes.length >= 3,
      progress: ownedThemes.length,
      target: 3,
      icon: Sparkles
    },
    { 
      id: "dedicated", 
      name: "Dedicated", 
      description: "7 day login streak",
      unlocked: dailyStreak >= 7,
      progress: Math.min(dailyStreak, 7),
      target: 7,
      icon: Flame
    },
    { 
      id: "millionaire", 
      name: "Millionaire", 
      description: "Have 100,000+ coins",
      unlocked: coins >= 100000,
      progress: Math.min(coins, 100000),
      target: 100000,
      icon: Coins
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 overflow-y-auto">
      {/* Profile header with VIP badge */}
      <div className={cn(
        "relative p-5 rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-card via-card to-primary/10",
        "border border-border"
      )}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center",
              "bg-gradient-to-br",
              currentVipTier.color,
              "shadow-lg p-1"
            )}>
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                <User className="h-8 w-8 text-foreground" />
              </div>
            </div>
            <div className={cn(
              "absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full",
              "bg-gradient-to-r text-[10px] font-bold text-white",
              currentVipTier.color
            )}>
              <Crown className="h-3 w-3 inline mr-0.5" />
              {currentVipTier.name}
            </div>
          </div>

          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-3 py-1 bg-input border border-border rounded-lg text-foreground text-sm"
                  maxLength={20}
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveName}>Save</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{username}</h2>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-primary/20 rounded-full text-xs font-medium text-primary">
                Level {level}
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                isGuest 
                  ? "bg-amber-500/20 text-amber-500" 
                  : "bg-win/20 text-win"
              )}>
                {isGuest ? "Guest" : user?.provider === "apple" ? "Apple" : user?.provider === "google" ? "Google" : "Signed In"}
              </span>
            </div>
            
            {nextVipTier && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span>{currentVipTier.name}</span>
                  <span>{nextVipTier.name}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full bg-gradient-to-r", currentVipTier.color)}
                    style={{ width: `${Math.min(100, ((totalXp - currentVipTier.minXp) / (nextVipTier.minXp - currentVipTier.minXp)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 bg-background/50 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Level {level}</span>
              <span className="text-foreground font-medium">{xp}/{xpNeeded} XP</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
          <div className="p-3 bg-background/50 rounded-xl flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Wallet</span>
            <div className="flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-primary" />
              <span className="font-bold text-foreground">{coins.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Section */}
      <section>
        <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Account
        </h3>
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {/* Account Status */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  isGuest ? "bg-amber-500/20" : "bg-win/20"
                )}>
                  {isGuest ? (
                    <User className="h-5 w-5 text-amber-500" />
                  ) : user?.provider === "apple" ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {isGuest ? "Guest Account" : user?.email || "Signed In"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isGuest ? "Your progress is saved locally" : "Progress synced across devices"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Link Account (for guests) */}
          {isGuest && (
            <div className="p-4">
              {showLinkOptions ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Link your account to save progress across devices
                  </p>
                  <button
                    onClick={() => handleLinkAccount("apple")}
                    disabled={isLinking}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                  >
                    {isLinking ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        <span className="font-medium">Continue with Apple</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleLinkAccount("google")}
                    disabled={isLinking}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                  >
                    {isLinking ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span className="font-medium">Continue with Google</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowLinkOptions(false)}
                    className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLinkOptions(true)}
                  className="w-full flex items-center justify-between text-left hover:bg-muted/50 -m-4 p-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Link2 className="h-4 w-4 text-primary" />
                    <div>
                      <div className="text-sm font-medium text-foreground">Link Account</div>
                      <div className="text-xs text-muted-foreground">Save your progress to the cloud</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* Restore Purchases */}
          <button
            onClick={handleRestorePurchases}
            disabled={isRestoring}
            className="flex items-center justify-between p-4 w-full text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <RotateCcw className={cn("h-4 w-4 text-muted-foreground", isRestoring && "animate-spin")} />
              <div>
                <div className="text-sm font-medium text-foreground">Restore Purchases</div>
                <div className="text-xs text-muted-foreground">Recover previously purchased items</div>
              </div>
            </div>
            {isRestoring && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </button>

          {/* Sign Out (for signed-in users) */}
          {!isGuest && (
            <button
              onClick={signOut}
              className="flex items-center gap-3 p-4 w-full text-left hover:bg-destructive/10 transition-colors text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          )}
        </div>
      </section>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className="p-3 bg-card rounded-xl border border-border text-center"
          >
            <stat.icon className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold text-foreground">{stat.value}</div>
            <div className="text-[10px] text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Equipped Vanity Items */}
      <section>
        <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Equipped Items
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: "equippedAvatarId",  label: "Avatar"  },
            { key: "equippedFrameId",   label: "Frame"   },
            { key: "equippedTitleId",   label: "Title"   },
            { key: "equippedPetId",     label: "Pet"     },
            { key: "equippedCabinetId", label: "Cabinet" },
            { key: "featuredRoomId",    label: "Room"    },
          ] as const).map(({ key, label }) => {
            const itemId = userVanity[key]
            const item = itemId ? ALL_VANITY_ITEMS.find(i => i.id === itemId) : null
            const rarity = item ? RARITY_COLORS[item.rarity] : null

            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2",
                  rarity ? cn(rarity.border, rarity.bg) : "border-muted bg-muted/20"
                )}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10">
                  {item ? <ItemPreview item={item} size="sm" /> : <span className="text-muted-foreground text-xl">—</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className={cn("text-xs font-bold truncate", rarity ? rarity.text : "text-muted-foreground")}>
                    {item ? item.name : "None"}
                  </p>
                  {item && (
                    <p className={cn("text-[9px] uppercase font-semibold", rarity?.text)}>
                      {RARITY_LABELS[item.rarity]}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Trophy Case */}
      <section>
        <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          Trophy Case
          <span className="ml-auto text-xs text-muted-foreground font-normal">
            {trophies.filter(t => t.unlocked).length}/{trophies.length} unlocked
          </span>
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {trophies.map((trophy) => {
            const iconClass = cn("h-6 w-6", trophy.unlocked ? "text-amber-400" : "text-muted-foreground")
            const trophyDef = TROPHY_DEFINITIONS.find(d => d.id === trophy.id)

            return (
              <div
                key={trophy.id}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 transition-all",
                  trophy.unlocked
                    ? "bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/20"
                    : "bg-muted/20 border-muted"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center",
                  trophy.unlocked ? "bg-amber-500/20" : "bg-muted/40"
                )}>
                  {trophy.icon === "star"    && <Award   className={iconClass} />}
                  {trophy.icon === "zap"     && <Sparkles className={iconClass} />}
                  {trophy.icon === "crown"   && <Crown   className={iconClass} />}
                  {trophy.icon === "coins"   && <Coins   className={iconClass} />}
                  {trophy.icon === "palette" && <Award   className={iconClass} />}
                  {trophy.icon === "flame"   && <Flame   className={iconClass} />}
                  {trophy.icon === "gem"     && <Sparkles className={iconClass} />}
                  {trophy.icon === "sparkles" && <Sparkles className={iconClass} />}
                  {trophy.icon === "car"     && <Trophy  className={iconClass} />}
                </div>

                {/* Name */}
                <p className={cn(
                  "text-[10px] font-bold text-center leading-tight",
                  trophy.unlocked ? "text-amber-400" : "text-muted-foreground"
                )}>
                  {trophy.unlocked ? trophy.name : "???"}
                </p>

                {/* Description on unlock */}
                {trophy.unlocked && (
                  <p className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-2">
                    {trophyDef?.description}
                  </p>
                )}

                {/* Lock overlay */}
                {!trophy.unlocked && (
                  <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
                    <p className="text-[9px] text-muted-foreground/60 text-center leading-tight px-1">
                      {trophyDef?.description}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Recent Big Wins */}
      {recentBigWins.length > 0 && (
        <section>
          <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Recent Big Wins
          </h3>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {recentBigWins.slice(0, 5).map((win, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-bold uppercase",
                    win.type === "jackpot" && "bg-purple-500/20 text-purple-400",
                    win.type === "megaWin" && "bg-amber-500/20 text-amber-400",
                    win.type === "bigWin" && "bg-green-500/20 text-green-400"
                  )}>
                    {win.type === "jackpot" ? "Jackpot" : win.type === "megaWin" ? "Mega" : "Big"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {win.multiplier.toFixed(1)}x
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground">{win.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements with progress */}
      <section>
        <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          Achievements
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((achievement) => {
            const progressPercent = (achievement.progress / achievement.target) * 100
            
            return (
              <div 
                key={achievement.id}
                className={cn(
                  "p-3 rounded-xl border",
                  achievement.unlocked 
                    ? "bg-win/10 border-win" 
                    : "bg-card border-border"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    achievement.unlocked ? "bg-win text-white" : "bg-muted text-muted-foreground"
                  )}>
                    <achievement.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">
                      {achievement.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {achievement.description}
                    </div>
                    {!achievement.unlocked && (
                      <div className="mt-1.5">
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          {achievement.progress.toLocaleString()}/{achievement.target.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Notification Preferences */}
      <section>
        <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Notification Preferences
        </h3>
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          <SettingToggle
            icon={Gift}
            label="Daily Bonus Reminders"
            description="Get notified about unclaimed bonuses"
            enabled={notificationPrefs.dailyBonus}
            onToggle={() => setNotificationPref("dailyBonus", !notificationPrefs.dailyBonus)}
          />
          <SettingToggle
            icon={Gift}
            label="Gift Notifications"
            description="When you receive a gift"
            enabled={notificationPrefs.giftNotifications}
            onToggle={() => setNotificationPref("giftNotifications", !notificationPrefs.giftNotifications)}
          />
          <SettingToggle
            icon={Calendar}
            label="Event Reminders"
            description="Special events and tournaments"
            enabled={notificationPrefs.eventReminders}
            onToggle={() => setNotificationPref("eventReminders", !notificationPrefs.eventReminders)}
          />
          <SettingToggle
            icon={Megaphone}
            label="Promotions"
            description="Deals and special offers"
            enabled={notificationPrefs.promotions}
            onToggle={() => setNotificationPref("promotions", !notificationPrefs.promotions)}
          />
        </div>
      </section>

      {/* Appearance Section */}
      <section>
        <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Sun className="h-4 w-4 text-primary" />
          Appearance
        </h3>
        <div className="bg-card rounded-xl border border-border p-2">
          <div className="grid grid-cols-3 gap-2">
            {([
              { mode: "dark" as AppearanceMode, icon: Moon, label: "Dark" },
              { mode: "light" as AppearanceMode, icon: Sun, label: "Light" },
              { mode: "system" as AppearanceMode, icon: Monitor, label: "System" },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setAppearanceMode(mode)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                  appearanceMode === mode
                    ? "bg-primary/20 border-2 border-primary"
                    : "bg-muted/30 border-2 border-transparent hover:bg-muted/50"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5",
                  appearanceMode === mode ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  appearanceMode === mode ? "text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Settings Section */}
      <section>
        <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          Settings
        </h3>
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          <SettingToggle
            icon={soundEnabled ? Volume2 : VolumeX}
            label="Sound Effects"
            enabled={soundEnabled}
            onToggle={toggleSound}
          />
          <SettingToggle
            icon={Music}
            label="Background Music"
            enabled={musicEnabled}
            onToggle={toggleMusic}
          />
          <SettingToggle
            icon={Vibrate}
            label="Haptic Feedback"
            enabled={hapticsEnabled}
            onToggle={toggleHaptics}
          />
          <SettingToggle
            icon={notificationsEnabled ? Bell : BellOff}
            label="Push Notifications"
            enabled={notificationsEnabled}
            onToggle={toggleNotifications}
          />
        </div>
      </section>

      {/* Responsible Play Section */}
      <section>
        <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Responsible Play
        </h3>
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Session Reminder</div>
                <div className="text-xs text-muted-foreground">Get reminded after playing</div>
              </div>
            </div>
            <select
              value={sessionReminderMinutes || ""}
              onChange={(e) => setSessionReminder(e.target.value ? Number(e.target.value) : null)}
              className="text-sm bg-muted border-none rounded-lg px-3 py-1.5 text-foreground"
            >
              <option value="">Off</option>
              <option value="30">30 min</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          <SettingToggle
            icon={Shield}
            label="Cooldown Mode"
            description="30 second delay between spins"
            enabled={cooldownEnabled}
            onToggle={toggleCooldown}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 px-1">
          Play responsibly. This is a simulated casino game for entertainment purposes only.
        </p>
      </section>

      {/* Help & Feedback Section */}
      <HelpFeedback />

      {/* Support Links */}
      <section>
        <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          Support
        </h3>
        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          <SupportLink icon={HelpCircle} label="Help Center" />
          <SupportLink icon={MessageCircle} label="Contact Support" />
        </div>
      </section>
    </div>
  )
}

function SettingToggle({ 
  icon: Icon, 
  label, 
  description,
  enabled, 
  onToggle 
}: { 
  icon: typeof Volume2
  label: string
  description?: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between p-4 w-full text-left hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <div className={cn(
        "w-10 h-6 rounded-full transition-colors relative",
        enabled ? "bg-primary" : "bg-muted"
      )}>
        <div className={cn(
          "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
          enabled ? "translate-x-5" : "translate-x-1"
        )} />
      </div>
    </button>
  )
}

function SupportLink({ icon: Icon, label }: { icon: typeof HelpCircle, label: string }) {
  return (
    <button className="flex items-center justify-between p-4 w-full text-left hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}
