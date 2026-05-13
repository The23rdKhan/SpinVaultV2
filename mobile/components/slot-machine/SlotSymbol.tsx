import { memo, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import type { SlotSymbol as SlotSymbolType } from '@/lib/game-context'
import type { WinType } from '@shared/slot/evaluate-spin'
import { hexWithAlpha } from '@/theme/tokens'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useReducedMotion } from '@/lib/use-reduced-motion'

// ---------------------------------------------------------------------------
// Per-tier pulse configuration
//
// Every property escalates from Win → Big Win → Jackpot → Mega Jackpot (engine keys unchanged).
// that players feel the win intensity through the symbols themselves, not
// just through the overlay modal.
//
//  glowHigh / glowLow   — ring opacity range; wider contrast = more drama
//  scalePeak            — max scale on each pulse beat
//  pulseDurationMs      — half-cycle duration; shorter = faster/more frantic
//  cycles               — how many full beats before the symbol settles
//  ringSize             — outer glow ring diameter in logical pixels
//  ringBorderWidth      — ring stroke width
//  ringShadowRadius     — ring shadow spread
// ---------------------------------------------------------------------------
interface TierPulse {
  glowHigh: number
  glowLow: number
  scalePeak: number
  pulseDurationMs: number
  cycles: number
  ringSize: number
  ringBorderWidth: number
  ringShadowRadius: number
}

const TIER_PULSE: Record<Exclude<WinType, 'none'>, TierPulse> = {
  normal: {
    glowHigh: 0.85, glowLow: 0.35,
    scalePeak: 1.22, pulseDurationMs: 200, cycles: 5,
    ringSize: 52, ringBorderWidth: 2,   ringShadowRadius: 10,
  },
  bigWin: {
    glowHigh: 0.92, glowLow: 0.22,
    scalePeak: 1.30, pulseDurationMs: 175, cycles: 5,
    ringSize: 56, ringBorderWidth: 2.5, ringShadowRadius: 15,
  },
  megaWin: {
    glowHigh: 0.97, glowLow: 0.12,
    scalePeak: 1.38, pulseDurationMs: 145, cycles: 6,
    ringSize: 63, ringBorderWidth: 3,   ringShadowRadius: 22,
  },
  jackpot: {
    glowHigh: 1.0,  glowLow: 0.05,
    scalePeak: 1.46, pulseDurationMs: 115, cycles: 7,
    ringSize: 70, ringBorderWidth: 3.5, ringShadowRadius: 30,
  },
}

interface Props {
  symbol: SlotSymbolType
  isWinning?: boolean
  isSpinning?: boolean
  /**
   * Stagger delay in ms before the winning pulse starts.
   * Pass `colIndex * 80` from ReelGrid to stagger by column.
   */
  columnDelay?: number
  /** Win tier from the resolved spin — drives pulse intensity. */
  winTier?: Exclude<WinType, 'none'>
  /**
   * Subtle motion variety for winning cells (normal wins feel less repetitive).
   */
  winMotion?: 'pulse' | 'bounce' | 'glow' | 'sparkle'
}

function SlotSymbolInner({
  symbol,
  isWinning,
  isSpinning,
  columnDelay = 0,
  winTier = 'normal',
  winMotion = 'pulse',
}: Props) {
  const t = useCasinoTheme()
  const reduceMotion = useReducedMotion()
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)
  const glowOpacity = useSharedValue(0)

  // Derive tier config once per render — avoids the double lookup that existed
  // when the effect body AND JSX both independently called TIER_PULSE[winTier].
  const tier = TIER_PULSE[winTier]

  useEffect(() => {
    if (isWinning) {
      if (reduceMotion) {
        // Single non-repeating bump — cancel any in-progress animation first
        // so there's no glitch if this fires mid-cycle.
        cancelAnimation(scale)
        cancelAnimation(glowOpacity)
        glowOpacity.value = tier.glowHigh
        scale.value = withSequence(
          withTiming(tier.scalePeak * 0.72, { duration: 160, easing: Easing.out(Easing.quad) }),
          withTiming(1.0,                   { duration: 200, easing: Easing.out(Easing.quad) }),
        )
      } else {
        const motion = winMotion
        let pulseMs = tier.pulseDurationMs
        let scalePk = tier.scalePeak
        let glowHi = tier.glowHigh
        let glowLo = tier.glowLow
        let cycles = tier.cycles
        if (motion === 'bounce') {
          scalePk = Math.min(1.55, tier.scalePeak * 1.08)
          pulseMs = Math.max(90, tier.pulseDurationMs * 0.88)
        } else if (motion === 'glow') {
          scalePk = 1.0 + (tier.scalePeak - 1) * 0.38
          cycles = Math.max(3, tier.cycles - 1)
        } else if (motion === 'sparkle') {
          pulseMs = Math.max(85, tier.pulseDurationMs * 0.8)
          glowHi = Math.min(1, tier.glowHigh + 0.06)
        }
        glowOpacity.value = withDelay(
          columnDelay,
          withRepeat(
            withSequence(
              withTiming(glowHi, { duration: pulseMs, easing: Easing.out(Easing.quad) }),
              withTiming(glowLo, { duration: pulseMs, easing: Easing.in(Easing.quad) }),
            ),
            cycles,
            false,
          ),
        )
        scale.value = withDelay(
          columnDelay,
          withRepeat(
            withSequence(
              withTiming(scalePk, { duration: pulseMs, easing: Easing.out(Easing.quad) }),
              withTiming(1.0, { duration: pulseMs, easing: Easing.in(Easing.quad) }),
            ),
            cycles,
            false,
          ),
        )
      }
    } else {
      cancelAnimation(scale)
      cancelAnimation(glowOpacity)
      glowOpacity.value = withTiming(0, { duration: 200 })
      scale.value = withSpring(1, { damping: 14, stiffness: 180 })
    }

    // Cancel in-flight animations if the component unmounts or deps change
    // mid-cycle. Without this, Reanimated can write to a disposed shared value.
    return () => {
      cancelAnimation(scale)
      cancelAnimation(glowOpacity)
    }
  }, [isWinning, reduceMotion, columnDelay, winTier, tier, scale, glowOpacity, winMotion])

  useEffect(() => {
    opacity.value = isSpinning ? 0.75 : 1
  }, [isSpinning, opacity])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))

  // Ring color — Wild and Scatter use dedicated theme tokens; regular symbols
  // use gold for Lucky Seven, win-green for everything else.
  // Note: `isWinning` guard is not needed here because glowRingStyle is only
  // rendered when isWinning is true (see JSX below).
  const ringColor = symbol.isWild
    ? t.win
    : symbol.isScatter
      ? t.freeSpin
      : symbol.id === 'seven'
        ? t.gold
        : t.win

  // Ring dimensions are tier-driven and only allocated when the symbol is
  // actually winning, so this object is null (no allocation) during idle play.
  const glowRingStyle = isWinning
    ? {
        width:         tier.ringSize,
        height:        tier.ringSize,
        borderRadius:  tier.ringSize / 2,
        borderWidth:   tier.ringBorderWidth,
        borderColor:   ringColor,
        shadowColor:   ringColor,
        shadowRadius:  tier.ringShadowRadius,
        shadowOpacity: 0.85,
        shadowOffset:  { width: 0, height: 0 },
      }
    : null

  if (symbol.isWild) {
    return (
      <View style={styles.symbolWrap}>
        {isWinning && glowRingStyle ? (
          <Animated.View
            style={[styles.glowRing, glowRingStyle, glowStyle]}
            pointerEvents="none"
          />
        ) : null}
        <Animated.View
          style={[
            styles.chip,
            { borderColor: t.gold, backgroundColor: hexWithAlpha(t.gold, '35') },
            isWinning && { borderColor: t.win, backgroundColor: hexWithAlpha(t.win, '35') },
            animStyle,
          ]}
        >
          <FontAwesome name="star" size={18} color={t.textPrimary} />
        </Animated.View>
      </View>
    )
  }

  if (symbol.isScatter) {
    return (
      <View style={styles.symbolWrap}>
        {isWinning && glowRingStyle ? (
          <Animated.View
            style={[styles.glowRing, glowRingStyle, glowStyle]}
            pointerEvents="none"
          />
        ) : null}
        <Animated.View
          style={[
            styles.chip,
            styles.scatterChip,
            { borderColor: t.freeSpin, backgroundColor: hexWithAlpha(t.freeSpin, '30') },
            animStyle,
          ]}
        >
          <FontAwesome name="bullseye" size={17} color={t.textPrimary} />
        </Animated.View>
      </View>
    )
  }

  const isSeven = symbol.id === 'seven'

  return (
    <View style={styles.symbolWrap}>
      {isWinning && glowRingStyle ? (
        <Animated.View
          style={[styles.glowRing, glowRingStyle, glowStyle]}
          pointerEvents="none"
        />
      ) : null}
      <Animated.Text
        style={[
          styles.emoji,
          { color: isSeven ? t.destructive : t.textPrimary },
          isSeven && { fontWeight: '900' },
          isWinning && { color: isSeven ? t.gold : t.win, fontWeight: '900' },
          animStyle,
        ]}
      >
        {symbol.emoji}
      </Animated.Text>
    </View>
  )
}

export const SlotSymbolView = memo(SlotSymbolInner)

const styles = StyleSheet.create({
  symbolWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
    textAlign: 'center',
  },
  chip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scatterChip: {
    borderWidth: 2,
  },
  // Base positioning only — tier-specific size, border, and shadow are applied
  // as inline overrides so the static StyleSheet isn't thrashed per-tier.
  glowRing: {
    position: 'absolute',
  },
})
