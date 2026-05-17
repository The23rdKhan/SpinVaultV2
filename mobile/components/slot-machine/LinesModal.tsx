import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Polyline, Rect } from 'react-native-svg'
import { BlurView } from 'expo-blur'
import { PAYLINE_SHORT_LABELS, SLOT_PAYLINES } from '@shared/slot/paylines'
import { hexWithAlpha } from '@/theme/tokens'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppButton } from '@/components/ui/AppButton'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppearance } from '@/lib/appearance-context'
import { paylineAccentColors } from './payline-accent-colors'

interface Props {
  open: boolean
  onClose: () => void
}

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
  const { resolvedMode } = useAppearance()
  const insets = useSafeAreaInsets()
  const [current, setCurrent] = useState(0)
  const lineColors = paylineAccentColors(resolvedMode)

  const inactiveFill = hexWithAlpha(t.textMuted, '18')
  const inactiveStroke = hexWithAlpha(t.border, 'BB')

  const color = lineColors[current] ?? t.primary
  const label = PAYLINE_SHORT_LABELS[current] ?? ''

  const goPrev = () => setCurrent((c) => (c === 0 ? SLOT_PAYLINES.length - 1 : c - 1))
  const goNext = () => setCurrent((c) => (c === SLOT_PAYLINES.length - 1 ? 0 : c + 1))

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}>
          <BlurView
            intensity={45}
            tint="dark"
            blurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.modalStack} pointerEvents="box-none">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close paylines"
          />
          <View
            style={[
              styles.sheet,
              { backgroundColor: t.surfaceElevated, borderColor: t.border },
            ]}
          >
            <Text style={[styles.title, { color: t.textPrimary }]}>Paylines</Text>
            <Text style={[styles.sub, { color: t.textSecondary }]}>
              Match 3 or more symbols left-to-right on an active payline to win. Wild substitutes for paying symbols on
              a line (not scatter). Scatter pays from anywhere on the grid — see Game Info · Bonus.
            </Text>

            <View style={styles.viewer}>
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
                    payline={[...(SLOT_PAYLINES[current] ?? [1, 1, 1, 1, 1])]}
                    color={color}
                    inactiveFill={inactiveFill}
                    inactiveStroke={inactiveStroke}
                  />
                </View>
              </View>

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

            <View style={styles.dots}>
              {SLOT_PAYLINES.map((_, i) => (
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

            <View style={[styles.sheetFooter, { paddingBottom: Math.max(12, insets.bottom + 8), borderTopColor: t.border }]}>
              <AppButton label="Close" onPress={onClose} style={styles.closeBtn} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalFill: {
    flex: 1,
  },
  modalStack: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    borderWidth: 1,
    maxHeight: '88%',
  },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { marginTop: 6, marginBottom: 20, lineHeight: 20, fontSize: 13 },

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

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  sheetFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginHorizontal: -22,
    paddingHorizontal: 22,
  },
  closeBtn: { marginVertical: 8 },
})
