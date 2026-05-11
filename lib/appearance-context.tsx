"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type AppearanceMode = "dark" | "light" | "system"

interface AppearanceContextType {
  mode: AppearanceMode
  resolvedMode: "dark" | "light"
  setMode: (mode: AppearanceMode) => void
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined)

const STORAGE_KEY = "lucky_slots_appearance"

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>("dark")
  const [resolvedMode, setResolvedMode] = useState<"dark" | "light">("dark")
  const [mounted, setMounted] = useState(false)

  // Load saved preference on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(STORAGE_KEY) as AppearanceMode | null
    if (saved && ["dark", "light", "system"].includes(saved)) {
      setModeState(saved)
    }
  }, [])

  // Detect system preference
  useEffect(() => {
    if (!mounted) return

    const updateResolvedMode = () => {
      if (mode === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        setResolvedMode(prefersDark ? "dark" : "light")
      } else {
        setResolvedMode(mode)
      }
    }

    updateResolvedMode()

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      if (mode === "system") {
        updateResolvedMode()
      }
    }
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [mode, mounted])

  // Apply to HTML element
  useEffect(() => {
    if (!mounted) return
    
    const html = document.documentElement
    if (resolvedMode === "light") {
      html.classList.add("light")
    } else {
      html.classList.remove("light")
    }
  }, [resolvedMode, mounted])

  const setMode = (newMode: AppearanceMode) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <AppearanceContext.Provider value={{ mode: "dark", resolvedMode: "dark", setMode: () => {} }}>
        {children}
      </AppearanceContext.Provider>
    )
  }

  return (
    <AppearanceContext.Provider value={{ mode, resolvedMode, setMode }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance() {
  const context = useContext(AppearanceContext)
  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider")
  }
  return context
}
