import { type ReactNode, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import type { ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useReducedMotion } from '@/lib/use-reduced-motion'

interface Props {
  /** Whether the shimmer sweep is active. Animation starts on true. */
  active: boolean
  /** Width of the sweeping highlight band in px. Default 88. */
  shimmerWidth?: number
  /** Distance the band travels (px). Should be >= parent width. Default 380. */
  travelWidth?: number
  /** Number of sweep passes. Default 3. */
  passes?: number
  /** Delay before the first sweep begins (ms). Default 400. */
  startDelay?: number
  /** Duration of each individual pass (ms). Default 880. */
  passDuration?: number
  /** Semi-transparent highlight color. Default white 40%. */
  shimmerColor?: string
  style?: ViewStyle
  children?: ReactNode
}

/**
 * Renders children with an animated shine-sweep overlay for bigWin+ tiers.
 * Wraps children in overflow:hidden to clip the animated band.
 * No-ops when reduced motion is enabled.
 */
export function ShimmerSweep({
  active,
  shimmerWidth = 88,
  travelWidth = 380,
  passes = 3,
  startDelay = 400,
  passDuration = 880,
  shimmerColor = 'rgba(255,255,255,0.42)',
  style,
  children,
}: Props) {
  const reduceMotion = useReducedMotion()
  const tx = useSharedValue(-shimmerWidth)

  useEffect(() => {
    cancelAnimation(tx)
    tx.value = -shimmerWidth

    if (!active || reduceMotion) return

    tx.value = withDelay(
      startDelay,
      withRepeat(
        withSequence(
          withTiming(travelWidth, { duration: passDuration, easing: Easing.inOut(Easing.quad) }),
          withTiming(-shimmerWidth, { duration: 0 }),
        ),
        passes,
        false,
      ),
    )

    return () => cancelAnimation(tx)
    // shimmerWidth, travelWidth, passes, startDelay, passDuration are props —
    // treated as stable config values; animation restarts when active/reduceMotion toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion])

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }))

  return (
    <View style={[styles.wrap, style]}>
      {children}
      {!reduceMotion && active ? (
        <Animated.View
          style={[styles.band, { width: shimmerWidth }, shimmerStyle]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['transparent', shimmerColor, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
})
