"use client"

import { useState, useCallback } from "react"
import { useGame } from "@/lib/game-context"
import {
  type VanityCategory,
  type VanityItem,
  type UserVanity,
  RARITY_COLORS,
  RARITY_LABELS,
  getItemsByCategory,
  ALL_VANITY_ITEMS,
} from "@/lib/vanity-data"
import { cn } from "@/lib/utils"
import {
  Coins,
  Check,
  Lock,
  Crown,
  Star,
  Sparkles,
  User,
  Heart,
  Monitor,
  Home,
  Car,
  Award,
  Tag,
  Circle,
  Package,
  ShoppingBag,
  ChevronRight,
} from "lucide-react"

// ── helpers ──────────────────────────────────────────────────────────────────

const CATEGORIES: { id: VanityCategory; label: string; icon: typeof Crown }[] = [
  { id: "avatar",   label: "Avatars",   icon: User    },
  { id: "frame",    label: "Frames",    icon: Circle  },
  { id: "title",    label: "Titles",    icon: Tag     },
  { id: "pet",      label: "Pets",      icon: Heart   },
  { id: "cabinet",  label: "Cabinets",  icon: Monitor },
  { id: "room",     label: "Rooms",     icon: Home    },
  { id: "car",      label: "Garage",    icon: Car     },
  { id: "badge",    label: "Badges",    icon: Award   },
]

const VANITY_FIELD: Record<VanityCategory, keyof UserVanity | null> = {
  avatar:  "equippedAvatarId",
  frame:   "equippedFrameId",
  title:   "equippedTitleId",
  pet:     "equippedPetId",
  cabinet: "equippedCabinetId",
  room:    "featuredRoomId",
  car:     "featuredCarId",
  badge:   null,
}

const getEquippedId = (category: VanityCategory, userVanity: UserVanity): string | undefined => {
  const field = VANITY_FIELD[category]
  if (!field) return undefined
  return userVanity[field] as string | undefined
}

const EQUIP_LABEL: Record<VanityCategory, string> = {
  avatar:  "Equip",
  frame:   "Equip",
  title:   "Equip",
  pet:     "Equip",
  cabinet: "Equip",
  room:    "Feature",
  car:     "Feature",
  badge:   "Earned",
}

// ── item preview ─────────────────────────────────────────────────────────────

export function ItemPreview({ item, size = "md" }: { item: VanityItem; size?: "sm" | "md" }) {
  const rarityStyle = RARITY_COLORS[item.rarity]
  const px = size === "sm" ? "text-2xl" : "text-3xl"
  const avatarSz = size === "sm" ? "w-9 h-9" : "w-12 h-12"
  const cabinetH = size === "sm" ? "w-7 h-10" : "w-9 h-14"

  switch (item.category) {
    case "avatar":
      return (
        <div className={cn("rounded-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-secondary/30 border-2", avatarSz, rarityStyle.border)}>
          <User className={cn("h-5 w-5", rarityStyle.text)} />
        </div>
      )
    case "frame":
      return (
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-muted border-4", rarityStyle.border, "shadow-lg")}>
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )
    case "title":
      return <span className={cn("font-bold text-sm leading-tight text-center px-1", rarityStyle.text)}>{item.previewImage}</span>
    case "pet":
      return (
        <span className={px}>
          {item.previewImage === "cat"       ? "🐱"
         : item.previewImage === "dragon"    ? "🐉"
         : item.previewImage === "phoenix"   ? "🔥"
         : item.previewImage === "unicorn"   ? "🦄"
         : item.previewImage === "robot"     ? "🤖"
         : item.previewImage === "celestial" ? "✨"
         : "—"}
        </span>
      )
    case "cabinet":
      return (
        <div className={cn("rounded border-2 flex-shrink-0", cabinetH,
          item.previewImage === "gold"    ? "bg-gradient-to-b from-amber-400 to-amber-600 border-amber-500"
        : item.previewImage === "neon"    ? "bg-gradient-to-b from-cyan-400 to-fuchsia-500 border-cyan-400"
        : item.previewImage === "royal"   ? "bg-gradient-to-b from-purple-400 to-purple-700 border-purple-500"
        : item.previewImage === "cosmic"  ? "bg-gradient-to-b from-indigo-400 via-purple-500 to-pink-500 border-indigo-400"
        : item.previewImage === "diamond" ? "bg-gradient-to-b from-white via-cyan-200 to-white border-cyan-300"
        : item.previewImage === "void"    ? "bg-gradient-to-b from-black via-purple-900 to-black border-purple-800"
        : "bg-gradient-to-b from-red-600 to-red-800 border-red-500"
        )} />
      )
    case "room":
      return (
        <span className={px}>
          {item.previewImage === "casino-floor"  ? "🎰"
         : item.previewImage === "penthouse"     ? "🏙️"
         : item.previewImage === "yacht"         ? "🛥️"
         : item.previewImage === "space-station" ? "🚀"
         : item.previewImage === "underwater"    ? "🌊"
         : item.previewImage === "volcano"       ? "🌋"
         : "🌌"}
        </span>
      )
    case "car":
      return (
        <span className={px}>
          {item.previewImage === "sedan"    ? "🚗"
         : item.previewImage === "sports"   ? "🏎️"
         : item.previewImage === "supercar" ? "🚙"
         : item.previewImage === "hypercar" ? "🏎️"
         : item.previewImage === "vintage"  ? "🚘"
         : item.previewImage === "limo"     ? "🚐"
         : "🛸"}
        </span>
      )
    case "badge":
      return (
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2", rarityStyle.bg, rarityStyle.border)}>
          {item.previewImage === "star"    ? <Star    className={cn("h-5 w-5", rarityStyle.text)} />
          : item.previewImage === "spin"   ? <Sparkles className={cn("h-5 w-5", rarityStyle.text)} />
          : item.previewImage === "crown"  ? <Crown   className={cn("h-5 w-5", rarityStyle.text)} />
          : item.previewImage === "trophy" ? <Award   className={cn("h-5 w-5", rarityStyle.text)} />
          : item.previewImage === "coins"  ? <Coins   className={cn("h-5 w-5", rarityStyle.text)} />
          : <Star className={cn("h-5 w-5", rarityStyle.text)} />}
        </div>
      )
    default:
      return <Sparkles className={cn("h-6 w-6", rarityStyle.text)} />
  }
}

// ── item card ─────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: VanityItem
  isOwned: boolean
  isEquipped: boolean
  canAfford: boolean
  onBuy: () => void
  onEquip: () => void
  justEquipped: boolean
}

function ItemCard({ item, isOwned, isEquipped, canAfford, onBuy, onEquip, justEquipped }: ItemCardProps) {
  const rarity = RARITY_COLORS[item.rarity]

  return (
    <div className={cn(
      "relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-200",
      rarity.border,
      isEquipped
        ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg"
        : isOwned
          ? "shadow-md"
          : "opacity-90",
    )}>
      {/* Rarity + limited badges */}
      <div className="absolute top-2 left-2 z-10 flex gap-1">
        <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide", rarity.bg, rarity.text, "border", rarity.border)}>
          {RARITY_LABELS[item.rarity]}
        </span>
        {item.isLimited && (
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-rose-500/20 text-rose-400 border border-rose-500">
            Limited
          </span>
        )}
      </div>

      {/* Owned tick */}
      {isOwned && (
        <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}

      {/* Preview area */}
      <div className={cn("flex items-center justify-center h-20 pt-2", rarity.bg, "bg-opacity-30")}>
        <ItemPreview item={item} />
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 bg-card gap-1">
        <p className="font-bold text-sm text-foreground leading-snug">{item.name}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{item.description}</p>
        {item.unlockLevel && !isOwned && (
          <p className="text-[10px] text-muted-foreground">Requires Lv {item.unlockLevel}</p>
        )}

        {/* Action */}
        <div className="mt-auto pt-2">
          {isOwned ? (
            <button
              onClick={onEquip}
              disabled={isEquipped || item.category === "badge"}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all",
                isEquipped || item.category === "badge"
                  ? "bg-primary/15 text-primary border border-primary/40 cursor-default"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97]",
                justEquipped && "animate-pulse"
              )}
            >
              {isEquipped || item.category === "badge" ? (
                <><Check className="h-3.5 w-3.5" /> {item.category === "badge" ? "Earned" : "Equipped"}</>
              ) : (
                EQUIP_LABEL[item.category]
              )}
            </button>
          ) : item.priceCoins === 0 ? (
            <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-muted/50 text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Achievement unlock
            </div>
          ) : (
            <button
              onClick={onBuy}
              disabled={!canAfford}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all",
                canAfford
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 active:scale-[0.97]"
                  : "bg-muted/40 text-muted-foreground cursor-not-allowed"
              )}
            >
              <Coins className="h-3.5 w-3.5" />
              {item.priceCoins.toLocaleString()}
              {!canAfford && <Lock className="h-3 w-3 opacity-60" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

type StoreView = "shop" | "inventory"

export function VanityStore() {
  const [view, setView] = useState<StoreView>("shop")
  const [activeCategory, setActiveCategory] = useState<VanityCategory>("avatar")
  const [justEquippedId, setJustEquippedId] = useState<string | null>(null)
  const { coins, userVanity, buyVanityItem, equipVanityItem } = useGame()

  const equippedId = getEquippedId(activeCategory, userVanity)

  const allCategoryItems = getItemsByCategory(activeCategory)
  const displayItems = view === "inventory"
    ? allCategoryItems.filter(i => userVanity.ownedItemIds.includes(i.id))
    : allCategoryItems

  const ownedCount = ALL_VANITY_ITEMS.filter(i => userVanity.ownedItemIds.includes(i.id)).length

  const handleBuy = useCallback((item: VanityItem) => {
    buyVanityItem(item.id, item.priceCoins)
  }, [buyVanityItem])

  const handleEquip = useCallback((item: VanityItem) => {
    equipVanityItem(item.category, item.id)
    setJustEquippedId(item.id)
    setTimeout(() => setJustEquippedId(null), 1200)
  }, [equipVanityItem])

  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Vanity Store
        </h3>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/20 rounded-full">
          <Coins className="h-4 w-4 text-secondary" />
          <span className="font-bold text-foreground text-sm">{coins.toLocaleString()}</span>
        </div>
      </div>

      {/* Shop / Inventory toggle */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl">
        <button
          onClick={() => setView("shop")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
            view === "shop" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          Store
        </button>
        <button
          onClick={() => setView("inventory")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
            view === "inventory" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-4 w-4" />
          Inventory
          <span className={cn(
            "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
            view === "inventory" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {ownedCount}
          </span>
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 p-1 bg-muted/20 rounded-xl overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(({ id, icon: Icon }) => {
          const ownedInCategory = view === "inventory"
            ? getItemsByCategory(id).filter(i => userVanity.ownedItemIds.includes(i.id)).length
            : 0
          return (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 min-w-[52px]",
                activeCategory === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {view === "inventory" && ownedInCategory > 0 && (
                <span className={cn(
                  "text-[9px] font-bold",
                  activeCategory === id ? "text-primary-foreground/80" : "text-primary"
                )}>
                  {ownedInCategory}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Category label + equipped indicator */}
      {equippedId && (() => {
        const equipped = ALL_VANITY_ITEMS.find(i => i.id === equippedId)
        if (!equipped) return null
        const rarity = RARITY_COLORS[equipped.rarity]
        return (
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-sm", rarity.bg, rarity.border)}>
            <Check className={cn("h-4 w-4 flex-shrink-0", rarity.text)} />
            <span className="text-muted-foreground text-xs">Equipped:</span>
            <span className={cn("font-bold text-xs", rarity.text)}>{equipped.name}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
          </div>
        )
      })()}

      {/* Items grid */}
      {displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
          <p className="text-sm font-medium text-muted-foreground">No items owned in this category</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Switch to Store to browse and buy</p>
          <button
            onClick={() => setView("shop")}
            className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
          >
            Browse Store
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {displayItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              isOwned={userVanity.ownedItemIds.includes(item.id)}
              isEquipped={equippedId === item.id}
              canAfford={coins >= item.priceCoins}
              onBuy={() => handleBuy(item)}
              onEquip={() => handleEquip(item)}
              justEquipped={justEquippedId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
