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
// (uses HapticFeedbackConstants instead of the legacy Vibrator API, and
// does NOT require the VIBRATE permission).
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

  const reelSpinStart = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    impact(Haptics.ImpactFeedbackStyle.Light)
  }, [hapticsEnabled])

  /** Auto-spin countdown crossed a milestone (40 / 30 / 20 / 10 remaining). */
  const autoSpinMilestone = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    selection()
  }, [hapticsEnabled])

  const reelStop = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    impact(Haptics.ImpactFeedbackStyle.Light)
  }, [hapticsEnabled])

  /** Last reel landing — slightly stronger than intermediate stops. */
  const reelStopFinal = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    impact(Haptics.ImpactFeedbackStyle.Medium)
  }, [hapticsEnabled])

  const spinPress = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    impact(Haptics.ImpactFeedbackStyle.Medium)
  }, [hapticsEnabled])

  const betChange = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    selection()
  }, [hapticsEnabled])

  /** Spin history pager (Newer / Older / page dots) — light tap, distinct from spin. */
  const pagerTap = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    impact(Haptics.ImpactFeedbackStyle.Light)
  }, [hapticsEnabled])

  const maxBet = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    impact(Haptics.ImpactFeedbackStyle.Medium)
  }, [hapticsEnabled])

  const insufficientCoins = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    notification(Haptics.NotificationFeedbackType.Warning)
  }, [hapticsEnabled])

  const bonusMeterFull = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    notification(Haptics.NotificationFeedbackType.Success)
  }, [hapticsEnabled])

  /** General reward claim tap (daily reward, mission, wheel result). */
  const claimTap = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    notification(Haptics.NotificationFeedbackType.Success)
  }, [hapticsEnabled])

  /** Light press feedback for initiating a spin (wheel, ad watch). */
  const wheelSpin = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    impact(Haptics.ImpactFeedbackStyle.Medium)
  }, [hapticsEnabled])

  /** Free Spins awarded overlay / scatter grant — success only (no tier win haptics). */
  const freeSpinsAwarded = useCallback(() => {
    if (!hapticsEnabled || !isNative()) return
    notification(Haptics.NotificationFeedbackType.Success)
  }, [hapticsEnabled])

  /**
   * Free spin streak multiplier advanced (1× → 2×, 2× → 3×, …).
   * Two medium impacts in rapid succession — distinct from a win notification
   * so the player feels the streak climbing without confusing it with a win tier.
   * At MAX (5×) a third impact is added for extra punch.
   *
   * The delayed impacts use fire-and-forget setTimeout calls (no cleanup).
   * This is intentional: haptic timeouts are ≤200 ms, and a stale vibration
   * after unmount is harmless. Storing refs to cancel them would add complexity
   * for no user-observable benefit.
   */
  const freeSpinStreakAdvance = useCallback(
    (newMultiplier: number) => {
      if (!hapticsEnabled || !isNative()) return
      impact(Haptics.ImpactFeedbackStyle.Medium)
      setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Medium), 90)
      if (newMultiplier >= 5) {
        setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 200)
      }
    },
    [hapticsEnabled],
  )

  /**
   * Line-win tier feedback. Maps server `WinType` to UI tier names:
   * - normal  → Win (0–5× vs bet, exclusive of 5); under 1× uses a light tap when `options.winMultiplier` is passed
   * - bigWin  → Big Win       (5x–9.9x)
   * - megaWin → Jackpot       (10x–24.9x)
   * - jackpot → Mega Jackpot  (25x+)
   *
   * When `winType === 'normal'`, pass `options?.winMultiplier`: values in (0, 1) use a light tap; omit `options` for other tiers.
   *
   * Each tier is deliberately distinct so players feel the escalation.
   * Delayed impacts (up to 580 ms) are fire-and-forget — see freeSpinStreakAdvance
   * for rationale on why cleanup refs are not stored.
   */
  const winFeedback = useCallback(
    (
      winType: WinType,
      options?: {
        winMultiplier?: number
        /** Softer haptics when celebration preset is calmer (e.g. reduced-motion pool). */
        celebrationIntensity?: 'subtle' | 'medium' | 'high' | 'legendary'
      },
    ) => {
      if (!hapticsEnabled || !isNative()) return

      const mult = options?.winMultiplier
      const ci = options?.celebrationIntensity

      if (winType === 'normal' && mult != null && mult > 0 && mult < 1) {
        impact(Haptics.ImpactFeedbackStyle.Light)
        return
      }

      // Mega Jackpot — maximum escalation: 4 heavy impacts after success notification
      if (winType === 'jackpot') {
        notification(Haptics.NotificationFeedbackType.Success)
        if (ci === 'subtle') {
          setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 120)
          setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 280)
          return
        }
        if (ci === 'medium') {
          setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 110)
          setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 260)
          setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 420)
          return
        }
        setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 110)
        setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 260)
        setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 420)
        setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 580)
        return
      }

      // Jackpot (10×–24.9× tier, engine `megaWin`) — 3 heavy impacts
      if (winType === 'megaWin') {
        notification(Haptics.NotificationFeedbackType.Success)
        if (ci === 'subtle') {
          setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 130)
          return
        }
        if (ci === 'medium') {
          setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 115)
          setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 300)
          return
        }
        setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 115)
        setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 275)
        setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 440)
        return
      }

      // Big Win — heavy impact + success, distinct from jackpot tiers
      if (winType === 'bigWin') {
        if (ci === 'subtle') {
          impact(Haptics.ImpactFeedbackStyle.Medium)
          return
        }
        if (ci === 'medium') {
          impact(Haptics.ImpactFeedbackStyle.Heavy)
          return
        }
        impact(Haptics.ImpactFeedbackStyle.Heavy)
        setTimeout(() => notification(Haptics.NotificationFeedbackType.Success), 80)
        return
      }

      // Normal Win — single success notification
      if (winType === 'normal') {
        notification(Haptics.NotificationFeedbackType.Success)
        return
      }
    },
    [hapticsEnabled],
  )

  return {
    reelSpinStart,
    reelStop,
    reelStopFinal,
    spinPress,
    betChange,
    pagerTap,
    maxBet,
    insufficientCoins,
    bonusMeterFull,
    claimTap,
    wheelSpin,
    freeSpinsAwarded,
    freeSpinStreakAdvance,
    autoSpinMilestone,
    winFeedback,
  }
}
