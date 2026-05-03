import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Polyline, Rect } from 'react-native-svg'
import { BlurView } from 'expo-blur'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppButton } from '@/components/ui/AppButton'

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

const LINE_COLORS = [
  '#facc15',
  '#34d399',
  '#60a5fa',
  '#f472b6',
  '#fb923c',
  '#a78bfa',
  '#f87171',
  '#38bdf8',
  '#4ade80',
]

const COLS = 5
const ROWS = 3
const CELL = 14
const GAP = 3
const PAD = 6

function gridWidth() {
  return PAD * 2 + COLS * CELL + (COLS - 1) * GAP
}
function gridHeight() {
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

interface MiniGridProps {
  payline: number[]
  color: string
  index: number
}

function MiniGrid({ payline, color, index }: MiniGridProps) {
  const W = gridWidth()
  const H = gridHeight()

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Background cells */}
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
              rx={3}
              fill={isActive ? `${color}33` : 'rgba(255,255,255,0.07)'}
              stroke={isActive ? color : 'rgba(255,255,255,0.12)'}
              strokeWidth={isActive ? 1.5 : 0.5}
            />
          )
        }),
      )}
      {/* Payline path */}
      <Polyline
        points={paylinePoints(payline)}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Dots on active cells */}
      {payline.map((row, col) => (
        <Circle
          key={col}
          cx={cx(col)}
          cy={cy(row)}
          r={3}
          fill={color}
        />
      ))}
    </Svg>
  )
}

export function LinesModal({ open, onClose }: Props) {
  const t = useCasinoTheme()

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView
        intensity={45}
        tint="dark"
        blurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: t.foreground }]}>9 Paylines</Text>
          <Text style={[styles.sub, { color: t.mutedForeground }]}>
            Wins count left-to-right on active lines. Wild substitutes for any regular symbol.
          </Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {PAYLINES.map((payline, i) => (
              <View
                key={i}
                style={[styles.row, { borderColor: t.border }]}
              >
                <View style={[styles.badge, { backgroundColor: `${LINE_COLORS[i]}22`, borderColor: LINE_COLORS[i] }]}>
                  <Text style={[styles.badgeNum, { color: LINE_COLORS[i] }]}>{i + 1}</Text>
                </View>
                <MiniGrid payline={payline} color={LINE_COLORS[i]} index={i} />
                <Text style={[styles.label, { color: t.foreground }]}>{LINE_LABELS[i]}</Text>
              </View>
            ))}
          </ScrollView>
          <AppButton label="Close" onPress={onClose} style={{ marginTop: 12 }} />
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
    padding: 20,
    borderWidth: 1,
    maxHeight: '82%',
  },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { marginTop: 6, marginBottom: 16, lineHeight: 20, fontSize: 13 },
  scroll: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNum: { fontSize: 12, fontWeight: '900' },
  label: { flex: 1, fontWeight: '600', fontSize: 13 },
})
