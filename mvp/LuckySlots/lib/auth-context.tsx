"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

export type AuthProvider = "guest" | "apple" | "google" | "email"

export interface User {
  id: string
  username: string
  email?: string
  provider: AuthProvider
  createdAt: string
  isGuest: boolean
}

export interface NotificationPrefs {
  dailyBonus: boolean
  giftNotifications: boolean
  eventReminders: boolean
  promotions: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isGuest: boolean
  hasCompletedOnboarding: boolean
  notificationPrefs: NotificationPrefs
  adsWatchedToday: number
  maxDailyAds: number
  lastAdWatchedAt: string | null
  signInPromptsShown: number
  lastSignInPromptAt: string | null
}

interface AuthActions {
  signInAsGuest: () => void
  signInWithApple: () => Promise<boolean>
  signInWithGoogle: () => Promise<boolean>
  signInWithEmail: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string, username: string) => Promise<boolean>
  signOut: () => void
  linkAccount: (provider: AuthProvider) => Promise<boolean>
  completeOnboarding: () => void
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void
  watchAd: () => Promise<number>
  canWatchAd: () => boolean
  shouldShowSignInPrompt: () => boolean
  markSignInPromptShown: () => void
  restorePurchases: () => Promise<boolean>
}

const STORAGE_KEY = "lucky_slots_auth"
const MAX_DAILY_ADS = 3
const MIN_SIGN_IN_PROMPT_INTERVAL = 1000 * 60 * 30 // 30 minutes

const generateGuestId = () => `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isGuest: true,
  hasCompletedOnboarding: false,
  notificationPrefs: {
    dailyBonus: true,
    giftNotifications: true,
    eventReminders: true,
    promotions: false,
  },
  adsWatchedToday: 0,
  maxDailyAds: MAX_DAILY_ADS,
  lastAdWatchedAt: null,
  signInPromptsShown: 0,
  lastSignInPromptAt: null,
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Reset daily ad count if new day
        const today = new Date().toDateString()
        const lastAdDate = parsed.lastAdWatchedAt 
          ? new Date(parsed.lastAdWatchedAt).toDateString()
          : null
        
        if (lastAdDate !== today) {
          parsed.adsWatchedToday = 0
        }
        
        setState(parsed)
      }
    } catch (e) {
      console.error("Failed to load auth state:", e)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch (e) {
        console.error("Failed to save auth state:", e)
      }
    }
  }, [state, isLoaded])

  const signInAsGuest = useCallback(() => {
    const guestUser: User = {
      id: generateGuestId(),
      username: "Player",
      provider: "guest",
      createdAt: new Date().toISOString(),
      isGuest: true,
    }
    setState(prev => ({
      ...prev,
      user: guestUser,
      isAuthenticated: true,
      isGuest: true,
    }))
  }, [])

  const signInWithApple = useCallback(async (): Promise<boolean> => {
    // Simulated Apple sign-in (in production, use Apple Sign In SDK)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const user: User = {
      id: `apple_${Date.now()}`,
      username: state.user?.username || "Player",
      email: "user@icloud.com",
      provider: "apple",
      createdAt: new Date().toISOString(),
      isGuest: false,
    }
    
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
      isGuest: false,
    }))
    return true
  }, [state.user?.username])

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    // Simulated Google sign-in (in production, use Google Sign In SDK)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const user: User = {
      id: `google_${Date.now()}`,
      username: state.user?.username || "Player",
      email: "user@gmail.com",
      provider: "google",
      createdAt: new Date().toISOString(),
      isGuest: false,
    }
    
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
      isGuest: false,
    }))
    return true
  }, [state.user?.username])

  const signInWithEmail = useCallback(async (email: string, _password: string): Promise<boolean> => {
    // Simulated email sign-in
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const user: User = {
      id: `email_${Date.now()}`,
      username: state.user?.username || email.split("@")[0],
      email,
      provider: "email",
      createdAt: new Date().toISOString(),
      isGuest: false,
    }
    
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
      isGuest: false,
    }))
    return true
  }, [state.user?.username])

  const signUp = useCallback(async (email: string, _password: string, username: string): Promise<boolean> => {
    // Simulated sign-up
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const user: User = {
      id: `email_${Date.now()}`,
      username,
      email,
      provider: "email",
      createdAt: new Date().toISOString(),
      isGuest: false,
    }
    
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
      isGuest: false,
    }))
    return true
  }, [])

  const signOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      user: null,
      isAuthenticated: false,
      isGuest: true,
    }))
  }, [])

  const linkAccount = useCallback(async (provider: AuthProvider): Promise<boolean> => {
    if (!state.user || !state.isGuest) return false
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setState(prev => ({
      ...prev,
      user: prev.user ? {
        ...prev.user,
        provider,
        isGuest: false,
        email: provider === "apple" ? "user@icloud.com" : 
               provider === "google" ? "user@gmail.com" : prev.user.email,
      } : null,
      isGuest: false,
    }))
    return true
  }, [state.user, state.isGuest])

  const completeOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasCompletedOnboarding: true,
    }))
  }, [])

  const setNotificationPref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    setState(prev => ({
      ...prev,
      notificationPrefs: {
        ...prev.notificationPrefs,
        [key]: value,
      },
    }))
  }, [])

  const canWatchAd = useCallback((): boolean => {
    return state.adsWatchedToday < state.maxDailyAds
  }, [state.adsWatchedToday, state.maxDailyAds])

  const watchAd = useCallback(async (): Promise<number> => {
    if (!canWatchAd()) return 0
    
    // Simulate ad watching (in production, integrate with ad SDK)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const reward = Math.floor(Math.random() * 200) + 100 // 100-300 coins
    
    setState(prev => ({
      ...prev,
      adsWatchedToday: prev.adsWatchedToday + 1,
      lastAdWatchedAt: new Date().toISOString(),
    }))
    
    return reward
  }, [canWatchAd])

  const shouldShowSignInPrompt = useCallback((): boolean => {
    if (!state.isGuest) return false
    if (state.signInPromptsShown >= 3) return false // Max 3 prompts per session
    
    if (state.lastSignInPromptAt) {
      const timeSince = Date.now() - new Date(state.lastSignInPromptAt).getTime()
      if (timeSince < MIN_SIGN_IN_PROMPT_INTERVAL) return false
    }
    
    return true
  }, [state.isGuest, state.signInPromptsShown, state.lastSignInPromptAt])

  const markSignInPromptShown = useCallback(() => {
    setState(prev => ({
      ...prev,
      signInPromptsShown: prev.signInPromptsShown + 1,
      lastSignInPromptAt: new Date().toISOString(),
    }))
  }, [])

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    // Simulated restore (in production, check with app store)
    await new Promise(resolve => setTimeout(resolve, 1500))
    return true
  }, [])

  const value: AuthState & AuthActions = {
    ...state,
    signInAsGuest,
    signInWithApple,
    signInWithGoogle,
    signInWithEmail,
    signUp,
    signOut,
    linkAccount,
    completeOnboarding,
    setNotificationPref,
    watchAd,
    canWatchAd,
    shouldShowSignInPrompt,
    markSignInPromptShown,
    restorePurchases,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
