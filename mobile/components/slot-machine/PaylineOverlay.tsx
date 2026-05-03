import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Polyline } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import type { WinningLine } from '@/lib/game-context'

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

const LINE_COLORS = [
  '#facc15', // yellow
  '#34d399', // green
  '#60a5fa', // blue
  '#f472b6', // pink
  '#fb923c', // orange
  '#a78bfa', // purple
  '#f87171', // red
  '#38bdf8', // sky
  '#4ade80', // lime
]

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
            color={LINE_COLORS[i % LINE_COLORS.length]}
          />
        ))}
      </Svg>
    </View>
  )
}

function AnimatedWinLine({
  line,
  index,
  color,
}: {
  line: WinningLine
  index: number
  color: string
}) {
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withDelay(
      index * 180,
      withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }),
    )
    return () => {
      opacity.value = 0
    }
  }, [line, index, opacity])

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
