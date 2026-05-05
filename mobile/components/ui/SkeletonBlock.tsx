import { useEffect } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { radius } from '@/theme/design-tokens'

type SkeletonBlockProps = {
  width?: number | `${number}%`
  height: number
  style?: ViewStyle
  radiusKey?: keyof typeof radius
}

export function SkeletonBlock({
  width = '100%',
  height,
  style,
  radiusKey = 'md',
}: SkeletonBlockProps) {
  const t = useCasinoTheme()
  const o = useSharedValue(0.35)

  useEffect(() => {
    o.value = withRepeat(
      withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    )
  }, [o])

  const anim = useAnimatedStyle(() => ({
    opacity: o.value,
  }))

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radius[radiusKey],
          backgroundColor: t.muted,
        },
        anim,
        style,
      ]}
    />
  )
}

const styles = StyleSheet.create({
  block: { overflow: 'hidden' },
})
