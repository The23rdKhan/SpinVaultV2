// Vanity item types and data for Lucky Slots

export type VanityCategory = "avatar" | "frame" | "title" | "pet" | "cabinet" | "room" | "car" | "badge"
export type VanityRarity = "common" | "rare" | "epic" | "legendary" | "mythic"

export interface VanityItem {
  id: string
  name: string
  category: VanityCategory
  rarity: VanityRarity
  priceCoins: number
  unlockLevel?: number
  previewImage: string // CSS gradient, emoji, or image path
  animationAsset?: string
  description: string
  isLimited?: boolean
}

export interface UserVanity {
  ownedItemIds: string[]
  equippedAvatarId?: string
  equippedFrameId?: string
  equippedTitleId?: string
  equippedPetId?: string
  equippedCabinetId?: string
  featuredCarId?: string
  featuredRoomId?: string
  trophyIds: string[]
}

export interface Trophy {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: string
}

export interface LeaderboardEntry {
  rank: number
  username: string
  value: number
  avatar?: string
  frame?: string
  title?: string
  vipTier?: number
  isCurrentUser?: boolean
}

// Rarity colors and styling
export const RARITY_COLORS: Record<VanityRarity, { bg: string; text: string; border: string; glow: string }> = {
  common: { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500", glow: "" },
  rare: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500", glow: "shadow-blue-500/30" },
  epic: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500", glow: "shadow-purple-500/40" },
  legendary: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500", glow: "shadow-amber-500/50" },
  mythic: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500", glow: "shadow-rose-500/60" },
}

// Rarity labels
export const RARITY_LABELS: Record<VanityRarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
}

// ============ AVATARS ============
export const AVATARS: VanityItem[] = [
  { id: "avatar-default", name: "Default", category: "avatar", rarity: "common", priceCoins: 0, previewImage: "default", description: "The classic player avatar" },
  { id: "avatar-cool", name: "Cool Cat", category: "avatar", rarity: "common", priceCoins: 1000, previewImage: "cool-cat", description: "Smooth operator" },
  { id: "avatar-lucky", name: "Lady Luck", category: "avatar", rarity: "rare", priceCoins: 5000, previewImage: "lady-luck", description: "Fortune favors the bold" },
  { id: "avatar-high-roller", name: "High Roller", category: "avatar", rarity: "epic", priceCoins: 15000, previewImage: "high-roller", description: "Big bets, bigger wins" },
  { id: "avatar-vip", name: "VIP Elite", category: "avatar", rarity: "legendary", priceCoins: 50000, previewImage: "vip-elite", description: "The pinnacle of prestige" },
  { id: "avatar-dragon", name: "Dragon Master", category: "avatar", rarity: "mythic", priceCoins: 150000, previewImage: "dragon-master", description: "Ancient power flows through you", isLimited: true },
]

// ============ PROFILE FRAMES ============
export const FRAMES: VanityItem[] = [
  { id: "frame-basic", name: "Basic Circle", category: "frame", rarity: "common", priceCoins: 0, previewImage: "border-2 border-muted-foreground rounded-full", description: "The default profile frame" },
  { id: "frame-gold", name: "Golden Ring", category: "frame", rarity: "rare", priceCoins: 5000, previewImage: "border-3 border-amber-500 rounded-full shadow-lg shadow-amber-500/30", description: "A shining golden border" },
  { id: "frame-neon", name: "Neon Glow", category: "frame", rarity: "rare", priceCoins: 5000, previewImage: "border-3 border-cyan-400 rounded-full shadow-lg shadow-cyan-400/50", description: "Pulsing neon energy", animationAsset: "pulse-glow" },
  { id: "frame-fire", name: "Inferno", category: "frame", rarity: "epic", priceCoins: 15000, previewImage: "border-4 border-orange-500 rounded-full shadow-xl shadow-orange-500/60", description: "Burning flames surround you", animationAsset: "fire-flicker" },
  { id: "frame-diamond", name: "Diamond Elite", category: "frame", rarity: "legendary", priceCoins: 50000, previewImage: "border-4 border-white rounded-full shadow-2xl shadow-white/70", description: "The mark of a true high roller", animationAsset: "diamond-sparkle" },
  { id: "frame-cyber", name: "Cyber Grid", category: "frame", rarity: "epic", priceCoins: 15000, previewImage: "border-3 border-fuchsia-500 rounded-lg shadow-lg shadow-fuchsia-500/40", description: "Digital matrix frame", animationAsset: "cyber-scan" },
  { id: "frame-ocean", name: "Ocean Depths", category: "frame", rarity: "epic", priceCoins: 15000, previewImage: "border-4 border-teal-400 rounded-full shadow-xl shadow-teal-400/50", description: "Waves of treasure" },
  { id: "frame-cosmic", name: "Cosmic Void", category: "frame", rarity: "mythic", priceCoins: 100000, previewImage: "border-4 border-indigo-400 rounded-full", description: "Stars orbit your profile", animationAsset: "cosmic-orbit", isLimited: true },
]

// ============ TITLES ============
export const TITLES: VanityItem[] = [
  { id: "title-player", name: "Player", category: "title", rarity: "common", priceCoins: 0, previewImage: "Player", description: "Everyone starts somewhere" },
  { id: "title-spinner", name: "Spinner", category: "title", rarity: "common", priceCoins: 500, previewImage: "Spinner", description: "You love to spin" },
  { id: "title-lucky", name: "Lucky One", category: "title", rarity: "rare", priceCoins: 5000, previewImage: "Lucky One", description: "Fortune favors you" },
  { id: "title-whale", name: "Whale", category: "title", rarity: "epic", priceCoins: 15000, previewImage: "Whale", description: "Big bets, big wins" },
  { id: "title-legend", name: "Legend", category: "title", rarity: "legendary", priceCoins: 50000, previewImage: "Legend", description: "Your name echoes through the halls" },
  { id: "title-jackpot", name: "Jackpot King", category: "title", rarity: "legendary", priceCoins: 75000, previewImage: "Jackpot King", description: "Master of the jackpot" },
  { id: "title-ghost", name: "Phantom", category: "title", rarity: "rare", priceCoins: 5000, previewImage: "Phantom", description: "Silent but deadly" },
  { id: "title-diamond", name: "Diamond Hands", category: "title", rarity: "epic", priceCoins: 20000, previewImage: "Diamond Hands", description: "Never cash out early" },
  { id: "title-mythic", name: "The Chosen", category: "title", rarity: "mythic", priceCoins: 200000, previewImage: "The Chosen", description: "Destiny itself bows to you", isLimited: true },
]

// ============ PETS (Companions) ============
export const PETS: VanityItem[] = [
  { id: "pet-none", name: "No Pet", category: "pet", rarity: "common", priceCoins: 0, previewImage: "", description: "Solo player" },
  { id: "pet-cat", name: "Lucky Cat", category: "pet", rarity: "rare", priceCoins: 8000, previewImage: "cat", description: "Brings good fortune", animationAsset: "cat-idle" },
  { id: "pet-dragon", name: "Mini Dragon", category: "pet", rarity: "epic", priceCoins: 25000, previewImage: "dragon", description: "Guards your treasure", animationAsset: "dragon-fly" },
  { id: "pet-phoenix", name: "Phoenix", category: "pet", rarity: "legendary", priceCoins: 75000, previewImage: "phoenix", description: "Rise from losses", animationAsset: "phoenix-flame" },
  { id: "pet-unicorn", name: "Golden Unicorn", category: "pet", rarity: "legendary", priceCoins: 100000, previewImage: "unicorn", description: "Mythical luck", animationAsset: "unicorn-sparkle" },
  { id: "pet-robot", name: "Slot Bot", category: "pet", rarity: "epic", priceCoins: 30000, previewImage: "robot", description: "Calculated wins", animationAsset: "robot-beep" },
  { id: "pet-celestial", name: "Celestial Spirit", category: "pet", rarity: "mythic", priceCoins: 250000, previewImage: "celestial", description: "A being of pure luck energy", animationAsset: "celestial-glow", isLimited: true },
]

// ============ CABINETS (Machine Skins) ============
export const CABINETS: VanityItem[] = [
  { id: "cabinet-classic", name: "Classic Red", category: "cabinet", rarity: "common", priceCoins: 0, previewImage: "classic", description: "The original casino look" },
  { id: "cabinet-gold", name: "Golden Luxe", category: "cabinet", rarity: "rare", priceCoins: 15000, previewImage: "gold", description: "Dripping in gold trim" },
  { id: "cabinet-neon", name: "Neon Nights", category: "cabinet", rarity: "rare", priceCoins: 15000, previewImage: "neon", description: "Cyberpunk aesthetic", animationAsset: "neon-pulse" },
  { id: "cabinet-royal", name: "Royal Purple", category: "cabinet", rarity: "epic", priceCoins: 40000, previewImage: "royal", description: "Fit for royalty" },
  { id: "cabinet-diamond", name: "Diamond Encrusted", category: "cabinet", rarity: "legendary", priceCoins: 150000, previewImage: "diamond", description: "Studded with gems", animationAsset: "diamond-shimmer" },
  { id: "cabinet-cosmic", name: "Cosmic Stars", category: "cabinet", rarity: "legendary", priceCoins: 200000, previewImage: "cosmic", description: "Written in the stars", animationAsset: "cosmic-twinkle" },
  { id: "cabinet-void", name: "Void Machine", category: "cabinet", rarity: "mythic", priceCoins: 500000, previewImage: "void", description: "From another dimension", animationAsset: "void-ripple", isLimited: true },
]

// ============ ROOMS (Background Environments) ============
export const ROOMS: VanityItem[] = [
  { id: "room-casino", name: "Casino Floor", category: "room", rarity: "common", priceCoins: 0, previewImage: "casino-floor", description: "Classic Vegas vibes" },
  { id: "room-penthouse", name: "Penthouse Suite", category: "room", rarity: "rare", priceCoins: 25000, previewImage: "penthouse", description: "High-rise luxury" },
  { id: "room-yacht", name: "Private Yacht", category: "room", rarity: "epic", priceCoins: 75000, previewImage: "yacht", description: "Play on the waves" },
  { id: "room-space", name: "Space Station", category: "room", rarity: "epic", priceCoins: 100000, previewImage: "space-station", description: "Orbit in style" },
  { id: "room-underwater", name: "Underwater Palace", category: "room", rarity: "legendary", priceCoins: 200000, previewImage: "underwater", description: "Atlantean riches" },
  { id: "room-volcano", name: "Volcano Lair", category: "room", rarity: "legendary", priceCoins: 250000, previewImage: "volcano", description: "Play with fire" },
  { id: "room-dimension", name: "Pocket Dimension", category: "room", rarity: "mythic", priceCoins: 750000, previewImage: "dimension", description: "Your own private universe", animationAsset: "dimension-warp", isLimited: true },
]

// ============ CARS (Garage Flex) ============
export const CARS: VanityItem[] = [
  { id: "car-sedan", name: "Luxury Sedan", category: "car", rarity: "common", priceCoins: 10000, previewImage: "sedan", description: "Classy and reliable" },
  { id: "car-sports", name: "Sports Coupe", category: "car", rarity: "rare", priceCoins: 50000, previewImage: "sports", description: "Speed and style" },
  { id: "car-supercar", name: "Supercar", category: "car", rarity: "epic", priceCoins: 150000, previewImage: "supercar", description: "Pure adrenaline" },
  { id: "car-hypercar", name: "Hypercar", category: "car", rarity: "legendary", priceCoins: 500000, previewImage: "hypercar", description: "The pinnacle of engineering" },
  { id: "car-vintage", name: "Vintage Classic", category: "car", rarity: "epic", priceCoins: 125000, previewImage: "vintage", description: "Timeless elegance" },
  { id: "car-limo", name: "Stretch Limo", category: "car", rarity: "legendary", priceCoins: 400000, previewImage: "limo", description: "Arrive like a VIP" },
  { id: "car-hover", name: "Hovercraft", category: "car", rarity: "mythic", priceCoins: 1000000, previewImage: "hover", description: "From the future", animationAsset: "hover-float", isLimited: true },
]

// ============ BADGES (Achievement Badges) ============
export const BADGES: VanityItem[] = [
  { id: "badge-newbie", name: "Newcomer", category: "badge", rarity: "common", priceCoins: 0, previewImage: "star", description: "Welcome to Lucky Slots" },
  { id: "badge-100spin", name: "Century Spinner", category: "badge", rarity: "rare", priceCoins: 0, previewImage: "spin", description: "100 spins completed", unlockLevel: 5 },
  { id: "badge-1000spin", name: "Spin Master", category: "badge", rarity: "epic", priceCoins: 0, previewImage: "crown", description: "1000 spins completed", unlockLevel: 15 },
  { id: "badge-bigwin", name: "Big Winner", category: "badge", rarity: "rare", priceCoins: 0, previewImage: "trophy", description: "Hit a Big Win" },
  { id: "badge-megawin", name: "Mega Winner", category: "badge", rarity: "epic", priceCoins: 0, previewImage: "fire", description: "Hit a Mega Win" },
  { id: "badge-jackpot", name: "Jackpot Hunter", category: "badge", rarity: "legendary", priceCoins: 0, previewImage: "diamond", description: "Hit the Jackpot" },
  { id: "badge-collector", name: "Theme Collector", category: "badge", rarity: "epic", priceCoins: 0, previewImage: "palette", description: "Own all themes" },
  { id: "badge-streak7", name: "Weekly Warrior", category: "badge", rarity: "rare", priceCoins: 0, previewImage: "flame", description: "7-day login streak" },
  { id: "badge-millionaire", name: "Millionaire", category: "badge", rarity: "legendary", priceCoins: 0, previewImage: "coins", description: "Earned 1M total coins" },
  { id: "badge-mythic-collector", name: "Mythic Collector", category: "badge", rarity: "mythic", priceCoins: 0, previewImage: "gem", description: "Own a mythic item", isLimited: true },
]

// All vanity items combined
export const ALL_VANITY_ITEMS: VanityItem[] = [
  ...AVATARS,
  ...FRAMES,
  ...TITLES,
  ...PETS,
  ...CABINETS,
  ...ROOMS,
  ...CARS,
  ...BADGES,
]

// Trophy definitions
export const TROPHY_DEFINITIONS: Omit<Trophy, "unlocked" | "unlockedAt">[] = [
  { id: "trophy-first-big", name: "First Big Win", description: "Hit your first Big Win (5x+)", icon: "star" },
  { id: "trophy-first-mega", name: "First Mega Win", description: "Hit your first Mega Win (10x+)", icon: "zap" },
  { id: "trophy-first-jackpot", name: "Jackpot!", description: "Hit your first Jackpot (25x+)", icon: "crown" },
  { id: "trophy-million", name: "Million Coin Club", description: "Accumulate 1,000,000 coins total", icon: "coins" },
  { id: "trophy-themes", name: "Theme Collector", description: "Own all three themes", icon: "palette" },
  { id: "trophy-streak7", name: "Weekly Dedication", description: "Maintain a 7-day login streak", icon: "flame" },
  { id: "trophy-vip", name: "VIP Status", description: "Reach VIP Tier 5", icon: "gem" },
  { id: "trophy-mythic", name: "Mythic Owner", description: "Own your first mythic item", icon: "sparkles" },
  { id: "trophy-garage", name: "Garage Full", description: "Own 5 or more cars", icon: "car" },
]

// Generate initial trophy state
export const generateInitialTrophies = (): Trophy[] => {
  return TROPHY_DEFINITIONS.map(t => ({ ...t, unlocked: false }))
}

// Category labels
export const CATEGORY_LABELS: Record<VanityCategory, string> = {
  avatar: "Avatars",
  frame: "Profile Frames",
  title: "Titles",
  pet: "Companions",
  cabinet: "Machine Skins",
  room: "Rooms",
  car: "Garage",
  badge: "Badges",
}

// Category icons (for UI)
export const CATEGORY_ICONS: Record<VanityCategory, string> = {
  avatar: "user",
  frame: "circle",
  title: "tag",
  pet: "heart",
  cabinet: "monitor",
  room: "home",
  car: "car",
  badge: "award",
}

// Get items by category
export const getItemsByCategory = (category: VanityCategory): VanityItem[] => {
  return ALL_VANITY_ITEMS.filter(item => item.category === category)
}

// Get default equipped vanity
export const getDefaultUserVanity = (): UserVanity => ({
  ownedItemIds: ["avatar-default", "frame-basic", "title-player", "pet-none", "cabinet-classic", "room-casino", "badge-newbie"],
  equippedAvatarId: "avatar-default",
  equippedFrameId: "frame-basic",
  equippedTitleId: "title-player",
  equippedPetId: "pet-none",
  equippedCabinetId: "cabinet-classic",
  featuredCarId: undefined,
  featuredRoomId: "room-casino",
  trophyIds: [],
})
