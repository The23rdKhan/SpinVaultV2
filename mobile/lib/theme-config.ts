import type { Theme } from './game-context'

export interface ThemeConfig {
  id: Theme
  name: string
  description: string
  price: number
  unlocks: string[]
  
  // Visual customization
  background: string
  cabinetFrame: string
  cabinetBorder: string
  
  // Slot machine
  symbolSet: string[]
  wildName: string
  wildIcon: string
  scatterName: string
  scatterIcon: string
  
  // Win conditions
  jackpotName: string
  bonusName: string
  bonusText: string
  
  // Effects
  paylineStyle: "goldGlow" | "cyanLaser" | "mapTrail"
  winEffectStyle: "coinBurst" | "glitchBurst" | "doubloonBurst"
  particleEffectStyle: "goldDust" | "dataSparks" | "oceanMist"
  
  // UI
  spinButtonStyle: "gold" | "cyanPurple" | "coinGold"
  soundPack: "vegas" | "cyber" | "pirate"
}

export const THEME_CONFIGS: Record<Theme, ThemeConfig> = {
  vegas: {
    id: "vegas",
    name: "Vegas Classic",
    description: "Luxurious classic casino with golden accents",
    price: 0,
    unlocks: [
      "✓ Gold cabinet frame",
      "✓ Classic symbols (7, cherry, bell, diamond, bar)",
      "✓ Coin burst win effects",
      "✓ Jackpot Mode bonus display",
      "✓ Vegas sound effects",
    ],
    
    background: "oklch(0.12 0.02 20)",
    cabinetFrame: "border-amber-500",
    cabinetBorder: "border-amber-600",
    
    symbolSet: ["7️⃣", "🍒", "🔔", "💎", "🍫", "⭐", "🎯"],
    wildName: "Wild",
    wildIcon: "⭐",
    scatterName: "Scatter",
    scatterIcon: "🎯",
    
    jackpotName: "MEGA JACKPOT",
    bonusName: "Free Spins",
    bonusText: "Collect 3 scatters to unlock Free Spins",
    
    paylineStyle: "goldGlow",
    winEffectStyle: "coinBurst",
    particleEffectStyle: "goldDust",
    
    spinButtonStyle: "gold",
    soundPack: "vegas",
  },
  
  cyber: {
    id: "cyber",
    name: "Cyber Neon",
    description: "Futuristic neon casino with glitch effects",
    price: 5000,
    unlocks: [
      "✓ Neon reel frame",
      "✓ Cyber symbols (holo-7, chip, neon gem, laser star, orb)",
      "✓ Glitch win effects",
      "✓ System Jackpot bonus",
      "✓ Portal charge free spins",
      "✓ Cyber sound effects",
    ],
    
    background: "oklch(0.08 0.03 250)",
    cabinetFrame: "border-cyan-400",
    cabinetBorder: "border-cyan-500",
    
    symbolSet: ["ⓗ", "🔌", "💠", "⚡", "◆", "✦", "🌀"],
    wildName: "Glitch Wild",
    wildIcon: "✦",
    scatterName: "Portal Scatter",
    scatterIcon: "🌀",
    
    jackpotName: "SYSTEM JACKPOT",
    bonusName: "Portal Charge",
    bonusText: "Collect 3 portals to enter Cyber Spins",
    
    paylineStyle: "cyanLaser",
    winEffectStyle: "glitchBurst",
    particleEffectStyle: "dataSparks",
    
    spinButtonStyle: "cyanPurple",
    soundPack: "cyber",
  },
  
  treasure: {
    id: "treasure",
    name: "Treasure Island",
    description: "Pirate-themed casino with ocean adventure vibes",
    price: 5000,
    unlocks: [
      "✓ Treasure cabinet frame",
      "✓ Pirate symbols (coins, chest, compass, skull, map, flag)",
      "✓ Doubloon win effects",
      "✓ Treasure Vault bonus",
      "✓ Treasure map free spins",
      "✓ Pirate sound effects",
    ],
    
    background: "oklch(0.10 0.02 180)",
    cabinetFrame: "border-amber-600",
    cabinetBorder: "border-amber-700",
    
    symbolSet: ["🪙", "💰", "🧭", "☠️", "🗺️", "🏴", "🐙"],
    wildName: "Pirate Flag Wild",
    wildIcon: "🏴",
    scatterName: "Kraken Scatter",
    scatterIcon: "🐙",
    
    jackpotName: "TREASURE VAULT",
    bonusName: "Treasure Map",
    bonusText: "Collect 3 map pieces to open the vault",
    
    paylineStyle: "mapTrail",
    winEffectStyle: "doubloonBurst",
    particleEffectStyle: "oceanMist",
    
    spinButtonStyle: "coinGold",
    soundPack: "pirate",
  },
}

export function getThemeConfig(theme: Theme): ThemeConfig {
  return THEME_CONFIGS[theme]
}
