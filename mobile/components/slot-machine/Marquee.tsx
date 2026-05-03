import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useGame } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useAudio } from '@/lib/use-audio'

export function Marquee() {
  const t = useCasinoTheme()
  const { bonusProgress, freeSpins, isJackpotMode, spinSequence, lastBonusMeterPayout } = useGame()
  const { bonusDing } = useAudio()

  const fillWidth = useSharedValue(0)
  const floatY = useSharedValue(0)
  const floatOpacity = useSharedValue(0)
  const [floatLabel, setFloatLabel] = useState('+0')
  const prevProgressRef = useRef(bonusProgress)
  const prevSeqRef = useRef(spinSequence)

  // Animated meter fill
  useEffect(() => {
    fillWidth.value = withTiming(bonusProgress, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    })

    // Flash to win color if meter paid out this spin — just use opacity pulse on fill instead
    if (spinSequence !== prevSeqRef.current && lastBonusMeterPayout > 0) {
      fillWidth.value = withSequence(
        withTiming(100, { duration: 100 }),
        withTiming(bonusProgress, { duration: 400, easing: Easing.out(Easing.quad) }),
      )
      bonusDing()
    }

    // Float "+N" label
    const delta = bonusProgress - prevProgressRef.current
    if (spinSequence !== prevSeqRef.current && delta !== 0) {
      const sign = delta > 0 ? '+' : ''
      setFloatLabel(`${sign}${delta}`)
      floatOpacity.value = 0
      floatY.value = 0
      floatOpacity.value = withSequence(
        withTiming(1, { duration: 120 }),
        withDelay(300, withTiming(0, { duration: 300 })),
      )
      floatY.value = withTiming(-18, { duration: 720, easing: Easing.out(Easing.quad) })
    }

    prevProgressRef.current = bonusProgress
    prevSeqRef.current = spinSequence
  // Theme values (t.primary / t.win) are stable at runtime — intentionally omitted from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bonusProgress, spinSequence, lastBonusMeterPayout, bonusDing, fillWidth, floatY, floatOpacity])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%` as `${number}%`,
    backgroundColor: t.primary,
  }))

  const floatStyle = useAnimatedStyle(() => ({
    opacity: floatOpacity.value,
    transform: [{ translateY: floatY.value }],
  }))

  const jackpotPulse = useSharedValue(1)
  useEffect(() => {
    if (isJackpotMode) {
      jackpotPulse.value = withSequence(
        withTiming(1.12, { duration: 300 }),
        withTiming(1.0, { duration: 300 }),
        withTiming(1.08, { duration: 250 }),
        withTiming(1.0, { duration: 250 }),
      )
    }
  }, [isJackpotMode, jackpotPulse])

  const jackpotPillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: jackpotPulse.value }],
    opacity: isJackpotMode ? 1 : 0.95,
  }))

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[t.card, t.cabinetBg]}
        style={[styles.top, { borderColor: t.cabinetBorder }]}
      >
        <Animated.View
          style={[
            styles.jackpotPill,
            { backgroundColor: t.jackpot },
            jackpotPillStyle,
          ]}
        >
          <Text style={styles.jackpotText}>MEGA JACKPOT</Text>
        </Animated.View>

        <View style={[styles.ticker, { backgroundColor: t.cabinetBg }]}>
          {freeSpins > 0 ? (
            <Text style={[styles.tickerText, { color: t.win }]}>
              FREE SPINS: {freeSpins} REMAINING!
            </Text>
          ) : (
            <Text style={[styles.tickerText, { color: t.mutedForeground }]} numberOfLines={1}>
              Match 5 SEVENS • 3 SCATTERS = 10 FREE SPINS • WILD substitutes
            </Text>
          )}
        </View>

        <View style={styles.meterRow}>
          <Text style={[styles.meterLabel, { color: t.mutedForeground }]}>Bonus</Text>
          <View style={[styles.meterTrack, { backgroundColor: t.muted, borderColor: t.border }]}>
            <Animated.View style={[styles.meterFill, fillStyle]} />
          </View>
          <View style={styles.meterRight}>
            <Text style={[styles.meterPct, { color: t.primary }]}>{bonusProgress}%</Text>
            <Animated.Text style={[styles.floatText, { color: t.win }, floatStyle]}>
              {floatLabel}
            </Animated.Text>
          </View>
        </View>
        <Text style={[styles.meterHint, { color: t.mutedForeground }]}>
          Reach 100 for bonus coins (+10 each winning spin, +2 each loss). Payout scales with bet.
        </Text>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  top: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  jackpotPill: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  jackpotText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 14,
  },
  ticker: {
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  tickerText: { fontSize: 12, fontWeight: '600', paddingHorizontal: 12 },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  meterLabel: { fontSize: 10, fontWeight: '700', width: 44 },
  meterTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', borderRadius: 999 },
  meterRight: { width: 48, alignItems: 'flex-end', position: 'relative' },
  meterPct: { fontSize: 10, fontWeight: '800' },
  floatText: {
    position: 'absolute',
    bottom: 10,
    right: 0,
    fontSize: 10,
    fontWeight: '900',
  },
  meterHint: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingBottom: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
})
