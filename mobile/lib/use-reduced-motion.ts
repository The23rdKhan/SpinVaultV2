import { useEffect, useState } from 'react'
import { AccessibilityInfo, Platform } from 'react-native'

/**
 * Subscribes to the system "reduce motion" / "remove animations" preference.
 * Use to tone down decorative slot animations (pulses, shimmers, long count-ups).
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    if (Platform.OS === 'web') {
      setReduceMotion(false)
      return
    }

    let sub: { remove: () => void } | undefined
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    // RN 0.71+: reduce-motion subscription
    if ('addEventListener' in AccessibilityInfo && typeof AccessibilityInfo.addEventListener === 'function') {
      sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    }

    return () => {
      sub?.remove()
    }
  }, [])

  return reduceMotion
}
