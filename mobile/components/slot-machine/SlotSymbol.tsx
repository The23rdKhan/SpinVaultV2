import { memo, useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated'
import type { SlotSymbol as SlotSymbolType } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'

interface Props {
  symbol: SlotSymbolType
  isWinning?: boolean
  isSpinning?: boolean
}

function SlotSymbolInner({ symbol, isWinning, isSpinning }: Props) {
  const t = useCasinoTheme()
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)

  useEffect(() => {
    if (isWinning) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.22, { duration: 200, easing: Easing.out(Easing.quad) }),
          withTiming(1.0, { duration: 200, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      )
    } else {
      cancelAnimation(scale)
      scale.value = withSpring(1, { damping: 14, stiffness: 180 })
    }
  }, [isWinning, scale])

  useEffect(() => {
    opacity.value = isSpinning ? 0.75 : 1
  }, [isSpinning, opacity])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  if (symbol.isWild) {
    return (
      <Animated.View style={[styles.badge, { backgroundColor: '#059669' }, animStyle]}>
        <Text style={styles.badgeText}>W</Text>
      </Animated.View>
    )
  }
  if (symbol.isScatter) {
    return (
      <Animated.View style={[styles.scatter, { borderColor: t.primary }, animStyle]}>
        <Text style={styles.scatterText}>S</Text>
      </Animated.View>
    )
  }

  return (
    <Animated.Text
      style={[
        styles.emoji,
        { color: t.foreground },
        isWinning && { color: t.win, fontWeight: '900' },
        animStyle,
      ]}
    >
      {symbol.emoji}
    </Animated.Text>
  )
}

export const SlotSymbolView = memo(SlotSymbolInner)

const styles = StyleSheet.create({
  emoji: {
    fontSize: 28,
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  scatter: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234,179,8,0.25)',
  },
  scatterText: { fontWeight: '900', fontSize: 14, color: '#ca8a04' },
})
