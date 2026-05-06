import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Polyline } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import type { WinningLine } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { paylineAccentColors } from './payline-accent-colors'

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline)

interface Props {
  winningLines: WinningLine[]
}

const COLS = 5
const PAD = 8
const GAP = 6

/** Fixed logical viewport width; SVG scales via viewBox to fill its container. */
const SVG_WIDTH = 300
const SVG_HEIGHT = 300

const CELL_SIZE = (SVG_WIDTH - PAD * 2 - GAP * (COLS - 1)) / COLS

function cx(col: number): number {
  return PAD + col * (CELL_SIZE + GAP) + CELL_SIZE / 2
}

function cy(row: number): number {
  return PAD + row * (CELL_SIZE + GAP) + CELL_SIZE / 2
}

function toPoints(positions: [number, number][]): string {
  return positions.map(([col, row]) => `${cx(col)},${cy(row)}`).join(' ')
}

export function PaylineOverlay({ winningLines }: Props) {
  const t = useCasinoTheme()
  const strokeColors = paylineAccentColors(t)

  if (winningLines.length === 0) return null

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        style={StyleSheet.absoluteFill}
      >
        {winningLines.map((line, i) => (
          <AnimatedWinLine
            key={i}
            line={line}
            index={i}
            color={strokeColors[i % strokeColors.length]}
          />
        ))}
      </Svg>
    </View>
  )
}

/** Number of slow pulse cycles after the initial reveal. */
const PULSE_CYCLES = 3

function AnimatedWinLine({
  line,
  index,
  color,
}: {
  line: WinningLine
  index: number
  color: string
}) {
  const reduceMotion = useReducedMotion()
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (reduceMotion) {
      // Instant reveal at full opacity — no animation, no pulse
      opacity.value = 1
      return () => {
        opacity.value = 0
      }
    }

    // Phase 1: staggered fade-in
    // Phase 2: slow pulse PULSE_CYCLES × to highlight active paylines
    const revealDuration = 280
    const pulseDuration = 480
    const revealDelay = index * 180

    opacity.value = withDelay(
      revealDelay,
      withSequence(
        withTiming(1, { duration: revealDuration, easing: Easing.out(Easing.quad) }),
        withRepeat(
          withSequence(
            withTiming(0.5, { duration: pulseDuration, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: pulseDuration, easing: Easing.inOut(Easing.sin) }),
          ),
          PULSE_CYCLES,
          false,
        ),
        withTiming(0.8, { duration: 300 }),
      ),
    )

    return () => {
      opacity.value = 0
    }
  }, [line, index, opacity, reduceMotion])

  const animProps = useAnimatedProps(() => ({ opacity: opacity.value }))

  return (
    <AnimatedPolyline
      animatedProps={animProps}
      points={toPoints(line.positions)}
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray="6 3"
    />
  )
}
