import { useCallback } from 'react'
import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useGame } from '@/lib/game-context'
import type { WinType } from '@shared/slot/evaluate-spin'

function isNative() {
  return Platform.OS === 'ios' || Platform.OS === 'android'
}

// ---------------------------------------------------------------------------
// Platform-aware helpers
// On Android, performAndroidHapticsAsync gives better quality than impactAsync
// (uses HapticFeedbackConstants instead of the legacy Vibrator API, and does
// NOT require the VIBRATE permission).
// ---------------------------------------------------------------------------

const IMPACT_TO_ANDROID: Partial<Record<Haptics.ImpactFeedbackStyle, Haptics.AndroidHaptics>> = {
  [Haptics.ImpactFeedbackStyle.Light]: Haptics.AndroidHaptics.Virtual_Key,
  [Haptics.ImpactFeedbackStyle.Medium]: Haptics.AndroidHaptics.Context_Click,
  [Haptics.ImpactFeedbackStyle.Heavy]: Haptics.AndroidHaptics.Long_Press,
  [Haptics.ImpactFeedbackStyle.Rigid]: Haptics.AndroidHaptics.Long_Press,
  [Haptics.ImpactFeedbackStyle.Soft]: Haptics.AndroidHaptics.Keyboard_Press,
}

const NOTIFICATION_TO_ANDROID: Record<Haptics.NotificationFeedbackType, Haptics.AndroidHaptics> = {
  [Haptics.NotificationFeedbackType.Success]: Haptics.AndroidHaptics.Confirm,
  [Haptics.NotificationFeedbackType.Warning]: Haptics.AndroidHaptics.Toggle_On,
  [Haptics.NotificationFeedbackType.Error]: Haptics.AndroidHaptics.Reject,
}

function impact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(
      IMPACT_TO_ANDROID[style] ?? Haptics.AndroidHaptics.Context_Click,
    )
  } else {
    void Haptics.impactAsync(style)
  }
}

function notification(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(NOTIFICATION_TO_ANDROID[type])
  } else {
    void Haptics.notificationAsync(type)
  }
}

function selection() {
  if (Platform.OS === 'android') {
    void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
  } else {
    void Haptics.selectionAsync()
  }
}

/**
 * Casino haptics — all calls are no-ops when hapticsEnabled is false or on web.
 * Uses performAndroidHapticsAsync on Android (better quality, no VIBRATE permission needed).
 */
export function useHaptics() {
  const { hapticsEnabled } = useGame()

  const reelStop = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    impact(Haptics.ImpactFeedbackStyle.Light)
  }, [hapticsEnabled])

  const spinPress = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    impact(Haptics.ImpactFeedbackStyle.Medium)
  }, [hapticsEnabled])

  const betChange = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    selection()
  }, [hapticsEnabled])

  const bonusMeterPayout = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    impact(Haptics.ImpactFeedbackStyle.Medium)
  }, [hapticsEnabled])

  const winFeedback = useCallback(
    (winType: WinType) => {
      if (!hapticsEnabled || !isNative()) return
      if (winType === 'jackpot') {
        notification(Haptics.NotificationFeedbackType.Success)
        setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 120)
        setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 280)
        return
      }
      if (winType === 'megaWin') {
        impact(Haptics.ImpactFeedbackStyle.Heavy)
        setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 160)
        return
      }
      if (winType === 'bigWin') {
        impact(Haptics.ImpactFeedbackStyle.Heavy)
        return
      }
      if (winType === 'normal') {
        notification(Haptics.NotificationFeedbackType.Success)
        return
      }
    },
    [hapticsEnabled],
  )

  return { reelStop, spinPress, betChange, bonusMeterPayout, winFeedback }
}
