import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useFocusEffect } from 'expo-router'
import {
  ensureRevenueCatConfigured,
  fetchLocalizedPricesForSkus,
  isRevenueCatConfigured,
} from '@/lib/revenuecat'
import { SHOP_COIN_PACKS, STARTER_BUNDLE_SKU } from '@/lib/shop-iap-catalog'

const APP_STATE_REFRESH_DEBOUNCE_MS = 400

/**
 * Loads localized `priceString` map for shop IAP product ids (focus + app foreground).
 */
export function useShopLocalizedPrices() {
  const productIds = useMemo(
    () => [...SHOP_COIN_PACKS.map((p) => p.id), STARTER_BUNDLE_SKU],
    [],
  )
  const [localizedPrices, setLocalizedPrices] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadPrices = useCallback(async () => {
    try {
      await ensureRevenueCatConfigured()
      if (!isRevenueCatConfigured()) return
      const map = await fetchLocalizedPricesForSkus(productIds)
      setLocalizedPrices(map)
    } catch {
      setLocalizedPrices({})
    }
  }, [productIds])

  const debouncedLoadPrices = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      void loadPrices()
    }, APP_STATE_REFRESH_DEBOUNCE_MS)
  }, [loadPrices])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      void (async () => {
        try {
          await ensureRevenueCatConfigured()
          if (cancelled || !isRevenueCatConfigured()) return
          const map = await fetchLocalizedPricesForSkus(productIds)
          if (!cancelled) setLocalizedPrices(map)
        } catch {
          if (!cancelled) setLocalizedPrices({})
        }
      })()
      return () => {
        cancelled = true
      }
    }, [productIds]),
  )

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') debouncedLoadPrices()
    })
    return () => {
      sub.remove()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [debouncedLoadPrices])

  const priceLabelForSku = useCallback(
    (sku: string, fallback: string) => localizedPrices[sku] ?? fallback,
    [localizedPrices],
  )

  return { localizedPrices, priceLabelForSku, refreshPrices: loadPrices }
}
