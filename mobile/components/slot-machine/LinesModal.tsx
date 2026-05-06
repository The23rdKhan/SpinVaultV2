import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Polyline, Rect } from 'react-native-svg'
import { BlurView } from 'expo-blur'
import { hexWithAlpha } from '@/theme/tokens'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppButton } from '@/components/ui/AppButton'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { paylineAccentColors } from './payline-accent-colors'

interface Props {
  open: boolean
  onClose: () => void
}

/** Row index per column for each of the 9 paylines — matches shared/slot/evaluate-spin.ts */
const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1], // 1 — middle row
  [0, 0, 0, 0, 0], // 2 — top row
  [2, 2, 2, 2, 2], // 3 — bottom row
  [0, 1, 2, 1, 0], // 4 — V shape
  [2, 1, 0, 1, 2], // 5 — inverted V
  [0, 0, 1, 2, 2], // 6 — diagonal down
  [2, 2, 1, 0, 0], // 7 — diagonal up
  [1, 0, 0, 0, 1], // 8 — top bump
  [1, 2, 2, 2, 1], // 9 — bottom bump
]

const LINE_LABELS = [
  'Middle row',
  'Top row',
  'Bottom row',
  'V shape',
  'Inverted V',
  'Diagonal down',
  'Diagonal up',
  'Top bump',
  'Bottom bump',
]

// Large grid constants for the paginated hero view
const CELL = 28
const GAP = 6
const PAD = 10
const COLS = 5
const ROWS = 3

function gridW() {
  return PAD * 2 + COLS * CELL + (COLS - 1) * GAP
}
function gridH() {
  return PAD * 2 + ROWS * CELL + (ROWS - 1) * GAP
}
function cx(col: number) {
  return PAD + col * (CELL + GAP) + CELL / 2
}
function cy(row: number) {
  return PAD + row * (CELL + GAP) + CELL / 2
}
function paylinePoints(payline: number[]) {
  return payline.map((row, col) => `${cx(col)},${cy(row)}`).join(' ')
}

interface LargeGridProps {
  payline: number[]
  color: string
  inactiveFill: string
  inactiveStroke: string
}

function LargeGrid({ payline, color, inactiveFill, inactiveStroke }: LargeGridProps) {
  const W = gridW()
  const H = gridH()

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {Array.from({ length: COLS }, (_, col) =>
        Array.from({ length: ROWS }, (_, row) => {
          const isActive = payline[col] === row
          return (
            <Rect
              key={`${col}-${row}`}
              x={PAD + col * (CELL + GAP)}
              y={PAD + row * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={5}
              fill={isActive ? hexWithAlpha(color, '2E') : inactiveFill}
              stroke={isActive ? color : inactiveStroke}
              strokeWidth={isActive ? 2 : 0.8}
            />
          )
        }),
      )}
      <Polyline
        points={paylinePoints(payline)}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.9}
      />
      {payline.map((row, col) => (
        <Circle key={col} cx={cx(col)} cy={cy(row)} r={5} fill={color} />
      ))}
    </Svg>
  )
}

export function LinesModal({ open, onClose }: Props) {
  const t = useCasinoTheme()
  const [current, setCurrent] = useState(0)
  const lineColors = paylineAccentColors(t)

  const inactiveFill = hexWithAlpha(t.textMuted, '18')
  const inactiveStroke = hexWithAlpha(t.border, 'BB')

  const color = lineColors[current] ?? t.primary
  const label = LINE_LABELS[current] ?? ''

  const goPrev = () => setCurrent((c) => (c === 0 ? PAYLINES.length - 1 : c - 1))
  const goNext = () => setCurrent((c) => (c === PAYLINES.length - 1 ? 0 : c + 1))

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}>
        <BlurView
          intensity={45}
          tint="dark"
          blurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      </View>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: t.surfaceElevated, borderColor: t.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <Text style={[styles.title, { color: t.textPrimary }]}>Paylines</Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>
            Match 3 or more symbols left-to-right on an active payline to win.{'\n'}Wild substitutes for any regular symbol.
          </Text>

          {/* Paginated viewer */}
          <View style={styles.viewer}>
            {/* Prev button */}
            <Pressable
              onPress={goPrev}
              style={({ pressed }) => [
                styles.navBtn,
                { borderColor: t.border, backgroundColor: pressed ? hexWithAlpha(t.primary, '18') : t.card },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Previous payline"
            >
              <FontAwesome name="chevron-left" size={14} color={t.textSecondary} />
            </Pressable>

            {/* Center: line name + grid */}
            <View style={styles.gridArea}>
              <View style={styles.lineNameRow}>
                <View style={[styles.lineBadge, { backgroundColor: hexWithAlpha(color, '22'), borderColor: color }]}>
                  <Text style={[styles.lineBadgeNum, { color }]}>{current + 1}</Text>
                </View>
                <View>
                  <Text style={[styles.lineName, { color }]}>Line {current + 1}</Text>
                  <Text style={[styles.lineDesc, { color: t.textMuted }]}>{label}</Text>
                </View>
              </View>

              <View style={[styles.gridCard, { backgroundColor: hexWithAlpha(t.card, 'EE'), borderColor: t.border }]}>
                <LargeGrid
                  payline={PAYLINES[current] ?? [1, 1, 1, 1, 1]}
                  color={color}
                  inactiveFill={inactiveFill}
                  inactiveStroke={inactiveStroke}
                />
              </View>
            </View>

            {/* Next button */}
            <Pressable
              onPress={goNext}
              style={({ pressed }) => [
                styles.navBtn,
                { borderColor: t.border, backgroundColor: pressed ? hexWithAlpha(t.primary, '18') : t.card },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next payline"
            >
              <FontAwesome name="chevron-right" size={14} color={t.textSecondary} />
            </Pressable>
          </View>

          {/* Dot pagination */}
          <View style={styles.dots}>
            {PAYLINES.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => setCurrent(i)}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === current ? lineColors[i] ?? t.primary : hexWithAlpha(t.textMuted, '40'),
                    transform: [{ scale: i === current ? 1.3 : 1 }],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Go to payline ${i + 1}`}
              />
            ))}
          </View>

          <AppButton label="Close" onPress={onClose} style={{ marginTop: 16 }} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { marginTop: 6, marginBottom: 20, lineHeight: 20, fontSize: 13 },

  // Paginated viewer
  viewer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridArea: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  lineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lineBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBadgeNum: { fontSize: 14, fontWeight: '900' },
  lineName: { fontSize: 18, fontWeight: '900' },
  lineDesc: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  gridCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Dot nav
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
