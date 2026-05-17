import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import type { SlotSymbol } from '@/lib/game-context'
import { hexWithAlpha } from '@/theme/tokens'
import { getSymbolWinGlow } from './symbol-win-glow-colors'
import { SlotSymbolAsset } from './SlotSymbol'

const EASE_OUT = Easing.out(Easing.quad)

interface Props {
  symbol: SlotSymbol | undefined
  token: string
  isHit: boolean
  /** Row tier accent for borders when not using symbol glow. */
  fallbackAccent: string
  reduceMotion: boolean
  /** Stagger within the symbol strip (ms). */
  columnDelay?: number
}

export function SpinHistorySymbolCell({
  symbol,
  token,
  isHit,
  fallbackAccent,
  reduceMotion,
  columnDelay = 0,
}: Props) {
  const scale = useSharedValue(1)
  const glowOpacity = useSharedValue(0)
  const hasAsset = Boolean(symbol?.asset)
  const glow = symbol ? getSymbolWinGlow(symbol) : null
  const ringColor = glow?.ring ?? fallbackAccent
  const shadowColor = glow?.shadow ?? fallbackAccent

  useEffect(() => {
    cancelAnimation(scale)
    cancelAnimation(glowOpacity)

    if (!isHit) {
      scale.value = 1
      glowOpacity.value = 0
      return
    }

    if (reduceMotion) {
      scale.value = 1.05
      scale.value = withTiming(1, { duration: 180, easing: EASE_OUT })
      glowOpacity.value = 0.55
      return
    }

    const delay = columnDelay
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.08, { duration: 200, easing: EASE_OUT }),
        withTiming(1, { duration: 220, easing: EASE_OUT }),
      ),
    )
    glowOpacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.75, { duration: 360, easing: EASE_OUT }),
          withTiming(0.35, { duration: 360, easing: EASE_OUT }),
        ),
        2,
        false,
      ),
    )

    return () => {
      cancelAnimation(scale)
      cancelAnimation(glowOpacity)
    }
  }, [isHit, reduceMotion, columnDelay, symbol?.id, scale, glowOpacity])

  const symbolAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const haloAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))

  return (
    <View
      style={[
        styles.cell,
        isHit
          ? {
              backgroundColor: hexWithAlpha(ringColor, '20'),
              borderColor: hexWithAlpha(ringColor, '65'),
              borderWidth: 1.5,
            }
          : {
              backgroundColor: hexWithAlpha(fallbackAccent, '06'),
              borderColor: hexWithAlpha(fallbackAccent, '15'),
              borderWidth: StyleSheet.hairlineWidth,
            },
      ]}
    >
      {isHit ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              borderColor: ringColor,
              shadowColor: shadowColor,
            },
            haloAnimStyle,
          ]}
        />
      ) : null}
      <Animated.View style={symbolAnimStyle}>
        {hasAsset && symbol ? (
          <SlotSymbolAsset symbol={symbol} size={isHit ? 24 : 22} />
        ) : (
          <Text style={[styles.fallback, isHit && styles.fallbackHit]}>
            {symbol?.emoji ?? token}
          </Text>
        )}
      </Animated.View>
      {isHit ? <View style={[styles.winDot, { backgroundColor: ringColor }]} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderWidth: 1.5,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  fallback: {
    fontSize: 15,
    fontWeight: '600',
  },
  fallbackHit: {
    fontSize: 16,
  },
  winDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
})
