"use client"

import { WalletDisplay } from "@/components/wallet/wallet-display"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { cn } from "@/lib/utils"

interface HeaderProps {
  title?: string
}

export function Header({ title = "Lucky Slots" }: HeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-40",
      "flex items-center justify-between",
      "px-4 h-16",
      "bg-background/80 backdrop-blur-lg",
      "border-b border-border"
    )}>
      {/* Logo / Title */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          "bg-gradient-to-br from-primary to-accent",
          "shadow-lg"
        )}>
          <span className="text-xl">7</span>
        </div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        <WalletDisplay />
        <ThemeSwitcher />
      </div>
    </header>
  )
}
