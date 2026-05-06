"use client"

import { GameProvider } from "@/lib/game-context"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { AppearanceProvider } from "@/lib/appearance-context"
import { CasinoApp } from "@/components/casino-app"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"

function AppContent() {
  const { hasCompletedOnboarding } = useAuth()

  if (!hasCompletedOnboarding) {
    return <OnboardingFlow />
  }

  return <CasinoApp />
}

export default function Home() {
  return (
    <AppearanceProvider>
      <AuthProvider>
        <GameProvider>
          <AppContent />
        </GameProvider>
      </AuthProvider>
    </AppearanceProvider>
  )
}
