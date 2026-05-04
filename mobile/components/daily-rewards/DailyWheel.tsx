import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Path, Text as SvgText } from 'react-native-svg'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Toast from 'react-native-toast-message'
import { AppButton } from '@/components/ui/AppButton'
import { useGame, WHEEL_REWARDS } from '@/lib/game-context'
import { useHaptics } from '@/lib/use-haptics'
import { useCasinoTheme } from '@/lib/use-casino-theme'

const W = 200
const CX = 100
const CY = 100
const R = 86
const SPIN_DURATION_MS = 4000

const SEGMENT_COLORS = [
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#ca8a04',
  '#9333ea',
  '#db2777',
  '#0891b2',
  '#ea580c',
]

function wedgePath(i: number, n: number): string {
  const seg = (2 * Math.PI) / n
  const start = -Math.PI / 2 + i * seg
  const end = start + seg
  const x1 = CX + R * Math.cos(start)
  const y1 = CY + R * Math.sin(start)
  const x2 = CX + R * Math.cos(end)
  const y2 = CY + R * Math.sin(end)
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`
}

function labelPos(i: number, n: number): { x: number; y: number; rot: number } {
  const seg = (2 * Math.PI) / n
  const mid = -Math.PI / 2 + i * seg + seg / 2
  const lr = 56
  return {
    x: CX + lr * Math.cos(mid),
    y: CY + lr * Math.sin(mid),
    rot: (mid * 180) / Math.PI + 90,
  }
}

export function DailyWheel() {
  const t = useCasinoTheme()
  const { dailyWheel, spinDailyWheel } = useGame()
  const { wheelSpin, claimTap } = useHaptics()
  const [isSpinning, setIsSpinning] = useState(false)
  const [displayReward, setDisplayReward] = useState<number | null>(null)
  const rotation = useSharedValue(0)
  const resultScale = useSharedValue(0)
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup any pending timer on unmount.
  useEffect(() => {
    return () => {
      if (spinTimerRef.current !== null) clearTimeout(spinTimerRef.current)
    }
  }, [])

  const segmentAngle = 360 / WHEEL_REWARDS.length

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  const resultStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
  }))

  const handleSpin = useCallback(async () => {
    if (dailyWheel.dailyWheelClaimed || isSpinning) return
    wheelSpin()
    setIsSpinning(true)
    setDisplayReward(null)
    resultScale.value = 0

    const reward = await spinDailyWheel()
    if (reward <= 0 || !WHEEL_REWARDS.includes(reward)) {
      setIsSpinning(false)
      Toast.show({
        type: 'error',
        text1: 'Wheel unavailable',
        text2: 'Try again or check your connection.',
      })
      return
    }

    const rewardIndex = WHEEL_REWARDS.indexOf(reward)
    const targetAngle = rewardIndex * segmentAngle
    // Normalise accumulated rotation to keep the value from growing unboundedly.
    const normalisedPrev = rotation.value % 360
    const next = normalisedPrev + 360 * 5 + (360 - targetAngle) + segmentAngle / 2
    rotation.value = withTiming(next, { duration: SPIN_DURATION_MS, easing: Easing.out(Easing.cubic) })

    spinTimerRef.current = setTimeout(() => {
      spinTimerRef.current = null
      setIsSpinning(false)
      setDisplayReward(reward)
      claimTap()
      // Pop the result into view.
      resultScale.value = withSequence(
        withSpring(1.15, { damping: 4, stiffness: 260 }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      )
    }, SPIN_DURATION_MS)
  }, [dailyWheel.dailyWheelClaimed, isSpinning, segmentAngle, spinDailyWheel, wheelSpin, claimTap, rotation, resultScale])

  const canSpin = !dailyWheel.dailyWheelClaimed && !isSpinning
  const n = WHEEL_REWARDS.length

  return (
    <View style={[styles.panel, { borderColor: t.border, backgroundColor: t.card }]}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: t.foreground }]}>Daily Wheel</Text>
        {dailyWheel.dailyWheelClaimed ? (
          <Text style={[styles.sub, { color: t.mutedForeground }]}>Spun today</Text>
        ) : null}
      </View>

      <View style={styles.wheelWrap}>
        <View style={styles.pointer}>
          <View style={[styles.pointerTri, { borderTopColor: t.primary }]} />
        </View>

        <Animated.View style={[styles.svgWrap, wheelStyle]}>
          <Svg width={W} height={W}>
            {WHEEL_REWARDS.map((_, i) => (
              <Path key={i} d={wedgePath(i, n)} fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} />
            ))}
            {WHEEL_REWARDS.map((reward, i) => {
              const { x, y, rot } = labelPos(i, n)
              return (
                <SvgText
                  key={`l-${i}`}
                  x={x}
                  y={y}
                  fill="#ffffff"
                  fontSize={11}
                  fontWeight="700"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  transform={`rotate(${rot}, ${x}, ${y})`}
                >
                  {reward}
                </SvgText>
              )
            })}
          </Svg>
        </Animated.View>

        <View
          style={[
            styles.centerIcon,
            { borderColor: t.primary, backgroundColor: t.card, left: (W - 52) / 2, top: (W - 52) / 2 },
          ]}
        >
          <FontAwesome name="bitcoin" size={20} color={t.primary} />
        </View>
      </View>

      <View style={styles.footer}>
        {displayReward !== null ? (
          <Animated.View style={[styles.result, resultStyle]}>
            <Text style={[styles.resultHint, { color: t.mutedForeground }]}>You won</Text>
            <View style={styles.resultRow}>
              <FontAwesome name="money" size={22} color={t.win} />
              <Text style={[styles.resultAmt, { color: t.win }]}>
                {displayReward.toLocaleString()} coins
              </Text>
            </View>
          </Animated.View>
        ) : dailyWheel.dailyWheelClaimed ? (
          <View style={styles.result}>
            <Text style={[styles.sub, { color: t.mutedForeground }]}>Come back tomorrow!</Text>
            {dailyWheel.wheelReward != null ? (
              <Text style={[styles.sub, { color: t.mutedForeground }]}>
                Today&apos;s reward: {dailyWheel.wheelReward.toLocaleString()} coins
              </Text>
            ) : null}
          </View>
        ) : (
          <AppButton
            label={isSpinning ? 'SPINNING…' : 'SPIN THE WHEEL!'}
            disabled={!canSpin}
            onPress={handleSpin}
            style={styles.spinBtn}
            accessibilityLabel="Spin the daily wheel"
            accessibilityHint="Awards a random coin prize once per day"
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 12 },
  wheelWrap: {
    width: W,
    height: W,
    alignSelf: 'center',
    marginTop: 8,
    position: 'relative',
  },
  svgWrap: {
    width: W,
    height: W,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  pointer: {
    position: 'absolute',
    top: -6,
    zIndex: 10,
    alignSelf: 'center',
  },
  pointerTri: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  centerIcon: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  footer: { marginTop: 16, alignItems: 'center', minHeight: 56 },
  spinBtn: { minWidth: 200 },
  result: { alignItems: 'center', gap: 6 },
  resultHint: { fontSize: 13 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultAmt: { fontSize: 28, fontWeight: '900' },
})
