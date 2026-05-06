import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { track } from '@/lib/analytics/track'
import {
  signInWithAppleNative,
  signInWithGoogleNative,
} from '@/lib/native-social-auth'
import { routes } from '@/lib/app-routes'
import { getPasswordResetRedirectUrl, parseRecoveryTokensFromUrl } from '@/lib/password-recovery'
import { requestIapRestoreFromServer } from '@/lib/iap-restore-client'
import {
  ensureRevenueCatConfigured,
  isRevenueCatConfigured,
  syncRevenueCatUser,
} from '@/lib/revenuecat'
import Purchases from 'react-native-purchases'
import {
  pullNotificationPreferences,
  pushNotificationPreferences,
} from '@/lib/notification-preferences-db'
import { getSupabase } from '@/lib/supabase'
import { friendlyAuthMessage } from '@/lib/supabase-auth-errors'
import { AnalyticsEvents } from '@shared/analytics/event-names'

export type AuthProviderKind = 'guest' | 'apple' | 'google' | 'email'

export interface User {
  id: string
  username: string
  email?: string
  provider: AuthProviderKind
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

export type AuthCredentialResult = { ok: true } | { ok: false; error: string }

interface AuthActions {
  /** Resolves true when a guest session exists (anonymous Supabase or local fallback). */
  signInAsGuest: () => Promise<boolean>
  signInWithApple: () => Promise<boolean>
  signInWithGoogle: () => Promise<boolean>
  signInWithEmail: (email: string, password: string) => Promise<AuthCredentialResult>
  signUp: (email: string, password: string, username: string) => Promise<AuthCredentialResult>
  signOut: () => Promise<void>
  linkAccount: (provider: AuthProviderKind) => Promise<boolean>
  /** Sends Supabase password-reset email (redirect must be allowlisted in the dashboard). */
  sendPasswordResetEmail: (email: string) => Promise<AuthCredentialResult>
  /** Call while session was opened from recovery email / PASSWORD_RECOVERY. */
  completePasswordReset: (newPassword: string) => Promise<AuthCredentialResult>
  completeOnboarding: () => void
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void
  watchAd: () => Promise<number>
  canWatchAd: () => boolean
  shouldShowSignInPrompt: () => boolean
  markSignInPromptShown: () => void
  restorePurchases: () => Promise<boolean>
}

/** True until persisted auth + initial Supabase session check finish (splash screen). */
export type AuthContextValue = AuthState &
  AuthActions & {
    isLoading: boolean
    /** User must set a new password (recovery session). Not persisted across cold starts. */
    passwordRecoveryPending: boolean
  }

const STORAGE_KEY = 'lucky_slots_auth'
const MAX_DAILY_ADS = 3
const MIN_SIGN_IN_PROMPT_INTERVAL = 1000 * 60 * 30

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

function mapSupabaseUserToAppUser(u: SupabaseAuthUser): User {
  const isAnonymous = Boolean(u.is_anonymous)
  if (isAnonymous) {
    return {
      id: u.id,
      username: 'Player',
      provider: 'guest',
      createdAt: u.created_at ?? new Date().toISOString(),
      isGuest: true,
    }
  }

  const meta = (u.user_metadata ?? {}) as Record<string, unknown>
  const fromMeta =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.username === 'string' && meta.username) ||
    (typeof meta.name === 'string' && meta.name)

  const email = u.email ?? undefined
  const identity = u.identities?.[0]
  const providerRaw = identity?.provider ?? 'email'
  const provider: AuthProviderKind =
    providerRaw === 'apple' ? 'apple' : providerRaw === 'google' ? 'google' : 'email'

  const username =
    (typeof fromMeta === 'string' && fromMeta) ||
    email?.split('@')[0] ||
    'Player'

  return {
    id: u.id,
    username,
    email,
    provider,
    createdAt: u.created_at ?? new Date().toISOString(),
    isGuest: false,
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)
  const [isLoaded, setIsLoaded] = useState(false)
  const [initialSessionResolved, setInitialSessionResolved] = useState(false)
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false)
  /** Avoid duplicate pulls per signed-in Supabase user id (local `guest_*` skips remote). */
  const prefsPulledForUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY)
        if (saved && !cancelled) {
          const parsed = JSON.parse(saved) as AuthState
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
        console.error('Failed to load auth state:', e)
      }
      if (!cancelled) setIsLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    const supabase = getSupabase()
    if (!supabase) {
      setInitialSessionResolved(true)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled) return
        if (session?.user) {
          const user = mapSupabaseUserToAppUser(session.user)
          setState((prev) => ({
            ...prev,
            user,
            isAuthenticated: true,
            isGuest: user.isGuest,
          }))
        }
      } finally {
        if (!cancelled) setInitialSessionResolved(true)
      }
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryPending(true)
        queueMicrotask(() => router.replace(routes.resetPassword))
      }
      if (session?.user) {
        const user = mapSupabaseUserToAppUser(session.user)
        void syncRevenueCatUser(session.user.id)
        setState((prev) => ({
          ...prev,
          user,
          isAuthenticated: true,
          isGuest: user.isGuest,
        }))
        return
      }
      setState((prev) => {
        if (!prev.user) return prev
        // Legacy local-only guest id when Supabase env was missing; keep persisted offline user.
        if (prev.user.id.startsWith('guest_')) return prev
        void syncRevenueCatUser(null)
        return {
          ...prev,
          user: null,
          isAuthenticated: false,
          isGuest: true,
        }
      })
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [isLoaded])

  /** Open app from Supabase reset email: parse tokens, establish session, go to reset screen. */
  useEffect(() => {
    if (!isLoaded || !initialSessionResolved) return
    const supabase = getSupabase()
    if (!supabase) return

    const handleRecoveryUrl = async (url: string | null | undefined) => {
      if (!url) return
      const tokens = parseRecoveryTokensFromUrl(url)
      if (!tokens) return

      setPasswordRecoveryPending(true)
      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      })
      if (error) {
        setPasswordRecoveryPending(false)
        if (__DEV__) console.warn('[auth] Recovery link failed:', error.message)
        return
      }
      queueMicrotask(() => router.replace(routes.resetPassword))
    }

    void Linking.getInitialURL().then((url) => void handleRecoveryUrl(url))
    const sub = Linking.addEventListener('url', ({ url }) => void handleRecoveryUrl(url))
    return () => sub.remove()
  }, [isLoaded, initialSessionResolved])

  useEffect(() => {
    const uid = state.user?.id
    if (!uid || uid.startsWith('guest_')) {
      prefsPulledForUserIdRef.current = null
      return
    }
    if (!getSupabase()) return
    if (prefsPulledForUserIdRef.current === uid) return

    let cancelled = false
    void pullNotificationPreferences(uid).then((remote) => {
      if (cancelled) return
      prefsPulledForUserIdRef.current = uid
      if (remote) setState((prev) => ({ ...prev, notificationPrefs: remote }))
    })

    return () => {
      cancelled = true
    }
  }, [state.user?.id])

  const isLoading = !isLoaded || !initialSessionResolved

  useEffect(() => {
    if (!isLoaded) return
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.error('Failed to save auth state:', e)
    )
  }, [state, isLoaded])

  const signInAsGuest = useCallback(async (): Promise<boolean> => {
    await GoogleSignin.signOut().catch(() => {})
    const supabase = getSupabase()
    if (!supabase) {
      if (__DEV__) {
        console.warn(
          '[auth] Missing Supabase — using local guest id (no cloud wallet). Set EXPO_PUBLIC_SUPABASE_URL + KEY.',
        )
      }
      const guestUser: User = {
        id: generateGuestId(),
        username: 'Player',
        provider: 'guest',
        createdAt: new Date().toISOString(),
        isGuest: true,
      }
      setState((prev) => ({
        ...prev,
        user: guestUser,
        isAuthenticated: true,
        isGuest: true,
      }))
      queueMicrotask(() => track(AnalyticsEvents.GUEST_CREATED))
      return true
    }

    await supabase.auth.signOut().catch(() => {})

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) {
      if (__DEV__) console.warn('[auth] Anonymous sign-in:', error.message)
      return false
    }
    if (!data.user) return false

    const user = mapSupabaseUserToAppUser(data.user)
    setState((prev) => ({
      ...prev,
      user,
      isAuthenticated: true,
      isGuest: user.isGuest,
    }))
    queueMicrotask(() => track(AnalyticsEvents.GUEST_CREATED))
    return true
  }, [])

  const signInWithApple = useCallback(async (): Promise<boolean> => {
    const supabase = getSupabase()
    if (!supabase) {
      if (__DEV__) console.warn('[auth] Missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY')
      return false
    }
    const result = await signInWithAppleNative(supabase)
    if (result.ok) {
      queueMicrotask(() => track(AnalyticsEvents.ACCOUNT_CREATED, { provider: 'apple' }))
      return true
    }
    if (result.code !== 'cancelled' && __DEV__) {
      console.warn('[auth] Apple sign-in:', result.message ?? result.code)
    }
    return false
  }, [])

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    const supabase = getSupabase()
    if (!supabase) {
      if (__DEV__) console.warn('[auth] Missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY')
      return false
    }
    const result = await signInWithGoogleNative(supabase)
    if (result.ok) {
      queueMicrotask(() => track(AnalyticsEvents.ACCOUNT_CREATED, { provider: 'google' }))
      return true
    }
    if (result.code !== 'cancelled' && __DEV__) {
      console.warn('[auth] Google sign-in:', result.message ?? result.code)
    }
    return false
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthCredentialResult> => {
    const supabase = getSupabase()
    if (!supabase) {
      return { ok: false, error: 'Missing Supabase configuration.' }
    }
    const trimmed = email.trim()
    if (!trimmed || !password) {
      return { ok: false, error: 'Enter email and password.' }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    })
    if (error) {
      return {
        ok: false,
        error: friendlyAuthMessage(error.message, error.code, 'sign_in'),
      }
    }
    if (data.user) {
      const user = mapSupabaseUserToAppUser(data.user)
      setState((prev) => ({
        ...prev,
        user,
        isAuthenticated: true,
        isGuest: user.isGuest,
      }))
      queueMicrotask(() => track(AnalyticsEvents.LOGIN_COMPLETED, { provider: 'email' }))
      return { ok: true }
    }
    return { ok: false, error: 'Sign in failed.' }
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, username: string): Promise<AuthCredentialResult> => {
      const supabase = getSupabase()
      if (!supabase) {
        return { ok: false, error: 'Missing Supabase configuration.' }
      }
      const trimmedEmail = email.trim()
      const trimmedUser = username.trim()
      if (!trimmedEmail || !password || !trimmedUser) {
        return { ok: false, error: 'Username, email, and password are required.' }
      }
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            username: trimmedUser,
            full_name: trimmedUser,
          },
        },
      })
      if (error) {
        return {
          ok: false,
          error: friendlyAuthMessage(error.message, error.code, 'sign_up'),
        }
      }
      const sessionUser = data.session?.user
      if (sessionUser) {
        const user = mapSupabaseUserToAppUser(sessionUser)
        setState((prev) => ({
          ...prev,
          user,
          isAuthenticated: true,
          isGuest: user.isGuest,
        }))
        queueMicrotask(() => track(AnalyticsEvents.ACCOUNT_CREATED, { provider: 'email' }))
        return { ok: true }
      }
      if (data.user) {
        return {
          ok: false,
          error:
            'Account created. Confirm your email from the link we sent, then sign in.',
        }
      }
      return { ok: false, error: 'Sign up failed.' }
    },
    [],
  )

  const sendPasswordResetEmail = useCallback(async (email: string): Promise<AuthCredentialResult> => {
    const supabase = getSupabase()
    if (!supabase) {
      return { ok: false, error: 'Missing Supabase configuration.' }
    }
    const trimmed = email.trim()
    if (!trimmed) {
      return { ok: false, error: 'Enter your email address.' }
    }
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: getPasswordResetRedirectUrl(),
    })
    if (error) {
      return {
        ok: false,
        error: friendlyAuthMessage(error.message, error.code, 'reset'),
      }
    }
    return { ok: true }
  }, [])

  const completePasswordReset = useCallback(async (password: string): Promise<AuthCredentialResult> => {
    const supabase = getSupabase()
    if (!supabase) {
      return { ok: false, error: 'Missing Supabase configuration.' }
    }
    if (password.length < 8) {
      return { ok: false, error: 'Use at least 8 characters.' }
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      return {
        ok: false,
        error: friendlyAuthMessage(error.message, error.code, 'sign_up'),
      }
    }
    setPasswordRecoveryPending(false)
    return { ok: true }
  }, [])

  const signOut = useCallback(async () => {
    setPasswordRecoveryPending(false)

    // Each remote call is isolated so a network error or provider failure cannot
    // leave the device stuck in a signed-in state.
    try {
      await getSupabase()?.auth.signOut()
    } catch {
      // Network offline or server error — local sign-out must still proceed.
    }

    try {
      await GoogleSignin.signOut()
    } catch {
      // Provider not configured or token already expired — safe to ignore.
    }

    // Defensive RevenueCat logout: if supabase.auth.signOut() threw before the SIGNED_OUT event
    // was emitted, the onAuthStateChange listener that normally calls syncRevenueCatUser(null)
    // may not have run. This call is idempotent — logging out an already-anonymous RC session
    // is a safe no-op. All error handling is internal to syncRevenueCatUser.
    void syncRevenueCatUser(null)

    // Reset to initialState defaults so no user-specific data (notification prefs, ad counters,
    // sign-in prompt counters) bleeds into the next session. Only hasCompletedOnboarding is
    // preserved — returning users must not be forced through onboarding again on the same device.
    setState((prev) => ({
      ...initialState,
      hasCompletedOnboarding: prev.hasCompletedOnboarding,
    }))
  }, [])

  const linkAccount = useCallback(async (provider: AuthProviderKind): Promise<boolean> => {
    const supabase = getSupabase()
    if (!supabase) return false

    if (provider === 'apple') {
      const result = await signInWithAppleNative(supabase)
      if (result.ok) {
        queueMicrotask(() =>
          track(AnalyticsEvents.ACCOUNT_CREATED, { provider: 'apple', flow: 'link_guest' }),
        )
      }
      return result.ok
    }

    if (provider === 'google') {
      const result = await signInWithGoogleNative(supabase)
      if (result.ok) {
        queueMicrotask(() =>
          track(AnalyticsEvents.ACCOUNT_CREATED, { provider: 'google', flow: 'link_guest' }),
        )
      }
      return result.ok
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
    let linked = false
    setState((prev) => {
      if (!prev.user || !prev.isGuest) return prev
      linked = true
      return {
        ...prev,
        user: {
          ...prev.user,
          provider,
          isGuest: false,
          email: prev.user.email,
        },
        isGuest: false,
      }
    })
    if (linked) {
      queueMicrotask(() =>
        track(AnalyticsEvents.ACCOUNT_CREATED, { provider, flow: 'link_guest' }),
      )
    }
    return true
  }, [])

  const completeOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, hasCompletedOnboarding: true }))
  }, [])

  const setNotificationPref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    setState((prev) => {
      const next = { ...prev.notificationPrefs, [key]: value }
      const uid = prev.user?.id
      if (uid && !uid.startsWith('guest_')) {
        void pushNotificationPreferences(uid, next)
      }
      return {
        ...prev,
        notificationPrefs: next,
      }
    })
  }, [])

  const canWatchAd = useCallback((): boolean => {
    return state.adsWatchedToday < state.maxDailyAds
  }, [state.adsWatchedToday, state.maxDailyAds])

  const watchAd = useCallback(async (): Promise<number> => {
    if (!canWatchAd()) return 0
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const reward = Math.floor(Math.random() * 200) + 100
    setState((prev) => ({
      ...prev,
      adsWatchedToday: prev.adsWatchedToday + 1,
      lastAdWatchedAt: new Date().toISOString(),
    }))
    return reward
  }, [canWatchAd])

  const shouldShowSignInPrompt = useCallback((): boolean => {
    if (!state.isGuest) return false
    if (state.signInPromptsShown >= 3) return false
    if (state.lastSignInPromptAt) {
      const timeSince = Date.now() - new Date(state.lastSignInPromptAt).getTime()
      if (timeSince < MIN_SIGN_IN_PROMPT_INTERVAL) return false
    }
    return true
  }, [state.isGuest, state.signInPromptsShown, state.lastSignInPromptAt])

  const markSignInPromptShown = useCallback(() => {
    setState((prev) => ({
      ...prev,
      signInPromptsShown: prev.signInPromptsShown + 1,
      lastSignInPromptAt: new Date().toISOString(),
    }))
  }, [])

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      await ensureRevenueCatConfigured()
      if (isRevenueCatConfigured()) {
        await Purchases.restorePurchases()
      }
      const supabase = getSupabase()
      if (!supabase) return true
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) return true
      return await requestIapRestoreFromServer()
    } catch {
      return false
    }
  }, [])

  const value: AuthContextValue = {
    ...state,
    isLoading,
    passwordRecoveryPending,
    signInAsGuest,
    signInWithApple,
    signInWithGoogle,
    signInWithEmail,
    signUp,
    signOut,
    linkAccount,
    sendPasswordResetEmail,
    completePasswordReset,
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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
