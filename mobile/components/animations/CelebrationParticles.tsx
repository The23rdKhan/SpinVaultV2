import { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useReducedMotion } from '@/lib/use-reduced-motion'

interface ParticleDef {
  id: number
  /** Radians from center — 0 = right, clockwise. */
  angle: number
  /** How far from center in logical pixels. */
  distance: number
  /** Dot diameter. */
  size: number
  color: string
  /** Start delay in ms for staggered burst. */
  delay: number
}

interface Props {
  count: number
  colors: string[]
  /** Total display duration in ms — used for onComplete timing. */
  duration: number
  onComplete?: () => void
}

/** Deterministic seeded pseudo-random generator (no external deps). */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function buildParticles(count: number, colors: string[]): ParticleDef[] {
  const rng = seeded(42 + count)
  const arc = (Math.PI * 2) / count
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: arc * i + (rng() - 0.5) * arc * 0.7,
    distance: 72 + rng() * 88,
    size: 5 + rng() * 7,
    color: colors[i % colors.length] ?? '#ffffff',
    delay: rng() * 200,
  }))
}

function Particle({ def }: { def: ParticleDef }) {
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const tx = Math.cos(def.angle) * def.distance
    const ty = Math.sin(def.angle) * def.distance
    const { delay } = def

    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 480, easing: Easing.in(Easing.quad) }),
      ),
    )
    x.value = withDelay(delay, withTiming(tx, { duration: 600, easing: Easing.out(Easing.cubic) }))
    y.value = withDelay(delay, withTiming(ty, { duration: 600, easing: Easing.out(Easing.cubic) }))

    return () => {
      cancelAnimation(x)
      cancelAnimation(y)
      cancelAnimation(opacity)
    }
  }, [def, x, y, opacity])

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }))

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: def.size,
          height: def.size,
          borderRadius: def.size / 2,
          backgroundColor: def.color,
        },
        style,
      ]}
    />
  )
}

export function CelebrationParticles({ count, colors, duration, onComplete }: Props) {
  const reduceMotion = useReducedMotion()
  const particles = useMemo(() => buildParticles(count, colors), [count, colors])

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), duration)
    return () => clearTimeout(timer)
  }, [duration, onComplete])

  if (reduceMotion || count === 0) return null

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p) => (
        <Particle key={p.id} def={p} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
})
