import { memo, useEffect } from 'react'
import { Image, Platform, StyleSheet, View, type ImageSourcePropType } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated'
import type { SlotSymbol as SlotSymbolType } from '@/lib/game-context'
import type { WinType } from '@shared/slot/evaluate-spin'
import { hexWithAlpha } from '@/theme/tokens'
import { useAppearance } from '@/lib/appearance-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import {
  getSymbolWinPreset,
  runSymbolWinPreset,
  settleWinMotion,
} from './slot-symbol-win-presets'
import { getSymbolWinGlow, type SymbolWinGlow } from './symbol-win-glow-colors'

const SYMBOL_ASSETS: NonNullable<Record<NonNullable<SlotSymbolType['asset']>, ImageSourcePropType>> = {
  redSeven: require('@/assets/reel-symbols/red-seven.png'),
  wildLogo: require('@/assets/reel-symbols/wild-logo.png'),
  scatterChest: require('@/assets/reel-symbols/scatter-chest.png'),
  vaultCoinSymbol: require('@/assets/reel-symbols/vault-coin-symbol.png'),
  blueDiamondSymbol: require('@/assets/reel-symbols/blue-diamond-symbol.png'),
  purpleGemSymbol: require('@/assets/reel-symbols/purple-gem-symbol.png'),
  vaultWheelSymbol: require('@/assets/reel-symbols/vault-wheel-symbol.png'),
  goldKeySymbol: require('@/assets/reel-symbols/gold-key-symbol.png'),
  crownSymbol: require('@/assets/reel-symbols/crown-symbol.png'),
}

const GOLD_WIN = '#FFD76A'
const SCATTER_PURPLE = '#A855F7'

export function SlotSymbolAsset({
  symbol,
  size = 34,
}: {
  symbol: SlotSymbolType
  size?: number
}) {
  const source = symbol.asset ? SYMBOL_ASSETS[symbol.asset] : null
  if (!source) return null
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={{ width: size, height: size }}
      accessibilityLabel={symbol.name}
      accessibilityRole="image"
    />
  )
}

/** Win-tier cycle counts — visual only; does not affect payouts. */
const TIER_CYCLES: Record<Exclude<WinType, 'none'>, number> = {
  normal: 3,
  bigWin: 4,
  megaWin: 5,
  jackpot: 6,
}

interface TierRing {
  ringSize: number
  ringBorderWidth: number
  ringShadowRadius: number
}

const TIER_RING: Record<Exclude<WinType, 'none'>, TierRing> = {
  normal:  { ringSize: 46, ringBorderWidth: 2,   ringShadowRadius: 8  },
  bigWin:  { ringSize: 50, ringBorderWidth: 2.5, ringShadowRadius: 11 },
  megaWin: { ringSize: 56, ringBorderWidth: 3,   ringShadowRadius: 16 },
  jackpot: { ringSize: 62, ringBorderWidth: 3,   ringShadowRadius: 20 },
}

/** Subtle idle breathe — much softer than the SPIN button pulse. */
const IDLE_PULSE = {
  scalePeak: 1.018,
  scaleDip: 0.996,
  glowHigh: 0.2,
  glowLow: 0.05,
  durationMs: 1700,
  spinDurationMs: 520,
  ringSize: 44,
} as const

function idleGlowRingStyle(glow: SymbolWinGlow) {
  return {
    width: IDLE_PULSE.ringSize,
    height: IDLE_PULSE.ringSize,
    borderRadius: IDLE_PULSE.ringSize / 2,
    borderWidth: 1,
    borderColor: glow.ring,
    backgroundColor: hexWithAlpha(glow.shadow, '14'),
    shadowColor: glow.shadow,
    shadowRadius: 6,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 0 },
    ...(Platform.OS === 'android' ? { elevation: 2 } : null),
  }
}

interface Props {
  symbol: SlotSymbolType
  isWinning?: boolean
  isSpinning?: boolean
  columnDelay?: number
  winTier?: Exclude<WinType, 'none'>
  winMotion?: 'pulse' | 'bounce' | 'glow' | 'sparkle'
  justStoppedSignal?: number
  isSpecialTriggered?: boolean
  /** Stagger idle pulse phase per cell (ms). */
  pulseStaggerMs?: number
}

function SlotSymbolInner({
  symbol,
  isWinning,
  isSpinning,
  columnDelay = 0,
  winTier = 'normal',
  justStoppedSignal = 0,
  isSpecialTriggered = false,
  pulseStaggerMs = 0,
}: Props) {
  const t = useCasinoTheme()
  const { resolvedMode } = useAppearance()
  const reduceMotion = useReducedMotion()
  const scale = useSharedValue(1)
  const stopScale = useSharedValue(1)
  const stopTranslateY = useSharedValue(0)
  const winTranslateY = useSharedValue(0)
  const rotateZ = useSharedValue(0)
  const rotateY = useSharedValue(0)
  const opacity = useSharedValue(1)
  const glowOpacity = useSharedValue(0)
  const idlePulseScale = useSharedValue(1)
  const idleGlowOpacity = useSharedValue(0)

  const tierRing = TIER_RING[winTier]
  const cycles = TIER_CYCLES[winTier]
  const presetValues = { scale, rotateZ, rotateY, opacity, glowOpacity, winTranslateY }
  const isSpecialSymbol = symbol.isWild === true || symbol.isScatter === true
  const winGlow = getSymbolWinGlow(symbol, resolvedMode)

  useEffect(() => {
    if (reduceMotion || isWinning) {
      cancelAnimation(idlePulseScale)
      cancelAnimation(idleGlowOpacity)
      idlePulseScale.value = 1
      idleGlowOpacity.value = 0
      return
    }

    const delay = pulseStaggerMs
    const duration = isSpinning ? IDLE_PULSE.spinDurationMs : IDLE_PULSE.durationMs
    const scalePeak = isSpinning ? 1.012 : IDLE_PULSE.scalePeak
    const scaleDip = isSpinning ? 0.992 : IDLE_PULSE.scaleDip
    const glowHigh = isSpinning ? 0.1 : IDLE_PULSE.glowHigh
    const glowLow = isSpinning ? 0.02 : IDLE_PULSE.glowLow

    idlePulseScale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(scalePeak, { duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(scaleDip, { duration, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    )

    idleGlowOpacity.value = withDelay(
      delay + 120,
      withRepeat(
        withSequence(
          withTiming(glowHigh, { duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(glowLow, { duration, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    )

    return () => {
      cancelAnimation(idlePulseScale)
      cancelAnimation(idleGlowOpacity)
    }
  }, [isWinning, isSpinning, reduceMotion, pulseStaggerMs, idlePulseScale, idleGlowOpacity])

  useEffect(() => {
    if (isWinning) {
      cancelAnimation(stopScale)
      cancelAnimation(stopTranslateY)
      stopScale.value = 1
      stopTranslateY.value = 0

      const preset = getSymbolWinPreset(symbol)

      if (isSpecialSymbol && !isSpecialTriggered) {
        if (reduceMotion) {
          scale.value = withSequence(
            withTiming(1.06, { duration: 160, easing: Easing.out(Easing.quad) }),
            withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
          )
        } else {
          scale.value = withSequence(
            withTiming(1.06, { duration: 180, easing: Easing.out(Easing.quad) }),
            withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
          )
        }
        return
      }

      runSymbolWinPreset({
        preset,
        values: presetValues,
        columnDelay,
        cycles,
        winTier,
        reduceMotion,
      })
    } else {
      settleWinMotion(presetValues)
    }

    return () => {
      cancelAnimation(scale)
      cancelAnimation(rotateZ)
      cancelAnimation(rotateY)
      cancelAnimation(opacity)
      cancelAnimation(glowOpacity)
      cancelAnimation(winTranslateY)
      cancelAnimation(stopScale)
      cancelAnimation(stopTranslateY)
      cancelAnimation(idlePulseScale)
      cancelAnimation(idleGlowOpacity)
    }
  }, [
    isWinning,
    isSpecialTriggered,
    isSpecialSymbol,
    reduceMotion,
    columnDelay,
    winTier,
    cycles,
    symbol.id,
    symbol.isWild,
    symbol.isScatter,
    resolvedMode,
    stopScale,
    stopTranslateY,
  ])

  useEffect(() => {
    if (justStoppedSignal === 0 || isSpecialSymbol) return
    cancelAnimation(stopScale)
    cancelAnimation(stopTranslateY)
    if (reduceMotion) {
      stopScale.value = 1
      stopTranslateY.value = 0
      return
    }
    stopScale.value = 0.96
    stopScale.value = withSequence(
      withTiming(1.06, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
    )
    stopTranslateY.value = 6
    stopTranslateY.value = withSequence(
      withTiming(-3, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 130, easing: Easing.out(Easing.quad) }),
    )
  }, [justStoppedSignal, reduceMotion, isSpecialSymbol, stopScale, stopTranslateY])

  useEffect(() => {
    if (isWinning && isSpecialSymbol && isSpecialTriggered) return
    opacity.value = isSpinning ? 0.75 : 1
  }, [isSpinning, isWinning, isSpecialSymbol, isSpecialTriggered, opacity])

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { translateY: stopTranslateY.value + winTranslateY.value },
      { scale: scale.value * stopScale.value * idlePulseScale.value },
      { rotateZ: `${rotateZ.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
    opacity: opacity.value,
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))

  const idleGlowStyle = useAnimatedStyle(() => ({
    opacity: idleGlowOpacity.value,
  }))

  const idleRing = idleGlowRingStyle(winGlow)

  const glowRingStyle = isWinning
    ? {
        width: tierRing.ringSize,
        height: tierRing.ringSize,
        borderRadius: tierRing.ringSize / 2,
        borderWidth: tierRing.ringBorderWidth,
        borderColor: winGlow.ring,
        backgroundColor: hexWithAlpha(winGlow.shadow, symbol.isScatter && isSpecialTriggered ? '40' : '32'),
        shadowColor: winGlow.shadow,
        shadowRadius: tierRing.ringShadowRadius,
        shadowOpacity: symbol.isScatter && isSpecialTriggered ? 0.95 : 0.85,
        shadowOffset: { width: 0, height: 0 },
        ...(Platform.OS === 'android'
          ? { elevation: winTier === 'jackpot' ? 10 : winTier === 'megaWin' ? 8 : 6 }
          : null),
        ...(winGlow.accent ? { borderColor: winGlow.accent } : null),
      }
    : null

  const flipSurface = styles.flipSurface

  const idleGlowRing = !isWinning ? (
    <Animated.View
      style={[styles.glowRing, idleRing, idleGlowStyle]}
      pointerEvents="none"
    />
  ) : null

  if (symbol.isWild) {
    return (
      <View style={styles.symbolWrap}>
        {idleGlowRing}
        {isWinning && isSpecialTriggered && glowRingStyle ? (
          <Animated.View
            style={[styles.glowRing, glowRingStyle, glowStyle]}
            pointerEvents="none"
          />
        ) : null}
        <Animated.View
          style={[
            styles.chip,
            styles.symbolOnGlow,
            flipSurface,
            { borderColor: GOLD_WIN, backgroundColor: hexWithAlpha(GOLD_WIN, '35') },
            isWinning &&
              isSpecialTriggered && {
                borderColor: GOLD_WIN,
                backgroundColor: hexWithAlpha(GOLD_WIN, '48'),
              },
            animStyle,
          ]}
        >
          <SlotSymbolAsset symbol={symbol} size={30} />
        </Animated.View>
      </View>
    )
  }

  if (symbol.isScatter) {
    return (
      <View style={styles.symbolWrap}>
        {idleGlowRing}
        {isWinning && isSpecialTriggered && glowRingStyle ? (
          <Animated.View
            style={[styles.glowRing, glowRingStyle, glowStyle]}
            pointerEvents="none"
          />
        ) : null}
        <Animated.View
          style={[
            styles.chip,
            styles.scatterChip,
            styles.symbolOnGlow,
            flipSurface,
            {
              borderColor: SCATTER_PURPLE,
              backgroundColor: hexWithAlpha(SCATTER_PURPLE, '28'),
            },
            isWinning &&
              isSpecialTriggered && {
                borderColor: SCATTER_PURPLE,
                backgroundColor: hexWithAlpha(GOLD_WIN, '22'),
              },
            animStyle,
          ]}
        >
          <SlotSymbolAsset symbol={symbol} size={31} />
        </Animated.View>
      </View>
    )
  }

  const isSeven = symbol.id === 'seven'
  const hasAsset = Boolean(symbol.asset)
  const assetSize = symbol.id === 'orange' ? 46 : 42

  return (
    <View style={styles.symbolWrap}>
      {idleGlowRing}
      {isWinning && glowRingStyle ? (
        <Animated.View
          style={[styles.glowRing, glowRingStyle, glowStyle]}
          pointerEvents="none"
        />
      ) : null}
      <Animated.View style={[styles.regularSymbol, styles.symbolOnGlow, animStyle]}>
        {hasAsset ? (
          <SlotSymbolAsset symbol={symbol} size={assetSize} />
        ) : (
          <Animated.Text
            style={[
              styles.emoji,
              { color: isSeven ? t.destructive : t.textPrimary },
              isSeven && { fontWeight: '900' },
              isWinning && { color: GOLD_WIN, fontWeight: '900' },
            ]}
          >
            {symbol.emoji}
          </Animated.Text>
        )}
      </Animated.View>
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
  regularSymbol: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
  flipSurface: {
    backfaceVisibility: 'hidden',
  },
  glowRing: {
    position: 'absolute',
    zIndex: 0,
  },
  symbolOnGlow: {
    zIndex: 1,
  },
})
