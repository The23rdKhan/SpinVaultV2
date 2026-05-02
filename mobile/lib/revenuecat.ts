import { Platform } from 'react-native'
import Purchases from 'react-native-purchases'

let didConfigure = false

/**
 * One-time RevenueCat SDK setup. Safe to call multiple times; no-ops without API keys or on web.
 */
export function initRevenueCat(): void {
  if (didConfigure) return
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return

  const appleKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?.trim()
  const googleKey = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?.trim()
  const apiKey =
    Platform.OS === 'ios' ? appleKey : Platform.OS === 'android' ? googleKey : undefined

  if (!apiKey) return

  Purchases.configure({ apiKey })
  didConfigure = true
}
