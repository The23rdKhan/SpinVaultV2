import type { Href } from 'expo-router'

/** Typed-route unions lag new screens until Expo regenerates types; keep paths centralized. */
export const routes = {
  onboarding: '/onboarding' as Href,
  login: '/login' as Href,
  register: '/register' as Href,
  forgotPassword: '/forgot-password' as Href,
  resetPassword: '/reset-password' as Href,
  /** Play tab — use `/play` not `/index` (root `app/index.tsx` owns `/`; `/index` can mis-resolve to +not-found). */
  tabsIndex: '/play' as Href,
  shop: '/shop' as Href,
  rewards: '/rewards' as Href,
} as const
