"use client"

import { useState } from "react"
import { Header } from "@/components/navigation/header"
import { BottomNav, type TabId } from "@/components/navigation/bottom-nav"
import { SlotMachine } from "@/components/slot-machine"
import { DailyRewards } from "@/components/daily-rewards/daily-rewards"
import { ShopPage } from "@/components/shop/shop-page"
import { ProfilePage } from "@/components/profile/profile-page"
import { cn } from "@/lib/utils"

const TAB_TITLES: Record<TabId, string> = {
  play: "Lucky Slots",
  rewards: "Daily Rewards",
  shop: "Shop",
  profile: "Profile",
}

export function CasinoApp() {
  const [activeTab, setActiveTab] = useState<TabId>("play")

  const renderContent = () => {
    switch (activeTab) {
      case "play":
        return <SlotMachine />
      case "rewards":
        return <DailyRewards onNavigateToPlay={() => setActiveTab("play")} />
      case "shop":
        return <ShopPage />
      case "profile":
        return <ProfilePage />
      default:
        return null
    }
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col",
      "bg-background"
    )}>
      <Header title={TAB_TITLES[activeTab]} />
      
      <main className="flex-1 overflow-auto pb-16">
        {renderContent()}
      </main>
      
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
