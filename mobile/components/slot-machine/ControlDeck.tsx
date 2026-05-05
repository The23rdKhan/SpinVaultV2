import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useGame, BET_OPTIONS } from '@/lib/game-context'
import { routes } from '@/lib/app-routes'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppButton } from '@/components/ui/AppButton'
import { useHaptics } from '@/lib/use-haptics'
import { useAudio } from '@/lib/use-audio'

interface ControlDeckProps {
  onOpenInfo: () => void
  onOpenLines: () => void
}

export function ControlDeck({ onOpenInfo, onOpenLines }: ControlDeckProps) {
  const router = useRouter()
  const t = useCasinoTheme()
  const {
    coins,
    currentBet,
    setBet,
    spin,
    isSpinning,
    freeSpins,
    lastWin,
    totalSpins,
    biggestWin,
  } = useGame()

  const { betChange } = useHaptics()
  const { betChange: betChangeSfx } = useAudio()

  // Capture theme colors for use inside Reanimated worklets (worklets can't
  // close over objects that change reference, and returning undefined for a
  // color prop crashes on the UI thread).
  const foregroundColor = t.foreground
  const winFlashColor = t.win
  const lossFlashColor = t.destructive

  const [displayedWin, setDisplayedWin] = useState(0)
  const [fastMode, setFastMode] = useState(false)
  const countUpRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Balance flash
  const balScale = useSharedValue(1)
  const balColorIdx = useSharedValue(0) // 1 = win, -1 = loss, 0 = neutral
  const prevCoinsRef = useRef(coins)

  useEffect(() => {
    if (isSpinning) return
    if (coins > prevCoinsRef.current) {
      balScale.value = withSequence(
        withTiming(1.15, { duration: 100 }),
        withTiming(1.0, { duration: 300, easing: Easing.out(Easing.quad) }),
      )
      balColorIdx.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 600 }),
      )
    } else if (coins < prevCoinsRef.current) {
      balColorIdx.value = withSequence(
        withTiming(-1, { duration: 80 }),
        withTiming(0, { duration: 400 }),
      )
    }
    prevCoinsRef.current = coins
  }, [coins, isSpinning, balScale, balColorIdx])

  useEffect(() => {
    if (lastWin > 0 && !isSpinning) {
      setDisplayedWin(0)
      let current = 0
      const step = Math.ceil(lastWin / 30)
      countUpRef.current = setInterval(() => {
        current += step
        if (current >= lastWin) {
          setDisplayedWin(lastWin)
          if (countUpRef.current) clearInterval(countUpRef.current)
        } else {
          setDisplayedWin(current)
        }
      }, fastMode ? 25 : 50)
    } else if (lastWin === 0) {
      setDisplayedWin(0)
    }
    return () => {
      if (countUpRef.current) clearInterval(countUpRef.current)
    }
  }, [lastWin, isSpinning, fastMode])

  const canSpin = (coins >= currentBet || freeSpins > 0) && !isSpinning

  const balAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: balScale.value }],
    color:
      balColorIdx.value > 0.5
        ? winFlashColor
        : balColorIdx.value < -0.5
          ? lossFlashColor
          : foregroundColor,
  }))

  const decreaseBet = () => {
    betChange()
    betChangeSfx()
    const i = BET_OPTIONS.indexOf(currentBet)
    if (i > 0) setBet(BET_OPTIONS[i - 1])
  }

  const increaseBet = () => {
    betChange()
    betChangeSfx()
    const i = BET_OPTIONS.indexOf(currentBet)
    if (i >= 0 && i < BET_OPTIONS.length - 1) setBet(BET_OPTIONS[i + 1])
  }

  const setMaxBet = () => { betChange(); betChangeSfx(); setBet(BET_OPTIONS[BET_OPTIONS.length - 1]) }

  return (
    <View style={styles.wrap}>
      <View style={styles.quickRow}>
        <AppButton variant="ghost" size="sm" onPress={onOpenInfo} style={styles.quickBtn}>
          <FontAwesome name="info-circle" size={14} color={t.textPrimary} />
          <Text style={{ color: t.textPrimary, fontWeight: '700', fontSize: 12 }}>INFO</Text>
        </AppButton>
        <AppButton variant="ghost" size="sm" onPress={onOpenLines} style={styles.quickBtn}>
          <FontAwesome name="th" size={14} color={t.textPrimary} />
          <Text style={{ color: t.textPrimary, fontWeight: '700', fontSize: 12 }}>LINES</Text>
        </AppButton>
        <AppButton
          variant="ghost"
          size="sm"
          accessibilityLabel="Quick win tally"
          accessibilityHint="Speeds up the last win number animation only"
          onPress={() => setFastMode((f) => !f)}
          style={styles.quickBtn}
        >
          <FontAwesome name="forward" size={14} color={fastMode ? t.primary : t.textPrimary} />
          <Text style={{ color: fastMode ? t.primary : t.textPrimary, fontWeight: '700', fontSize: 12 }}>
            QUICK
          </Text>
        </AppButton>
      </View>

      <View style={[styles.stats, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>Last prize</Text>
          <Text style={[styles.statVal, { color: lastWin > 0 ? t.win : t.textPrimary }]}>
            {displayedWin.toLocaleString()}
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>Spins</Text>
          <Text style={[styles.statVal, { color: t.textPrimary }]}>{totalSpins}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>Best</Text>
          <Text style={[styles.statVal, { color: t.primary }]}>{biggestWin.toLocaleString()}</Text>
        </View>
      </View>

      <View style={[styles.panel, { borderColor: t.cabinetBorder, backgroundColor: t.cabinetBg }]}>
        <View style={styles.panelRow}>
          <View style={styles.betCluster}>
            <AppButton
              variant="outline"
              size="icon"
              disabled={isSpinning || currentBet === BET_OPTIONS[0]}
              onPress={decreaseBet}
            >
              <FontAwesome name="minus" size={18} color={t.textPrimary} />
            </AppButton>
            <View style={styles.betMid}>
              <Text style={[styles.betLabel, { color: t.textMuted }]}>Stake</Text>
              <Text style={[styles.betAmt, { color: t.primary }]}>{currentBet}</Text>
            </View>
            <AppButton
              variant="outline"
              size="icon"
              disabled={isSpinning || currentBet === BET_OPTIONS[BET_OPTIONS.length - 1]}
              onPress={increaseBet}
            >
              <FontAwesome name="plus" size={18} color={t.textPrimary} />
            </AppButton>
          </View>

          <PressableSpin canSpin={canSpin} isSpinning={isSpinning} freeSpins={freeSpins} onSpin={() => spin()} />

          <View style={styles.rightCol}>
            <AppButton variant="outline" size="sm" disabled={isSpinning} onPress={setMaxBet} label="MAX" />
            <Text style={[styles.balLabel, { color: t.textMuted }]}>Coins</Text>
            <Animated.Text style={[styles.balVal, { color: t.textPrimary }, balAnimStyle]}>
              {coins.toLocaleString()}
            </Animated.Text>
          </View>
        </View>

        {coins < currentBet && freeSpins === 0 ? (
          <View style={styles.warnBlock}>
            <Text style={[styles.warn, { color: t.destructive }]}>
              Not enough virtual coins for this stake. Lower your stake with − or grab coins in Shop / Rewards.
            </Text>
            <View style={styles.warnLinks}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open shop"
                onPress={() => router.push(routes.shop)}
              >
                <Text style={[styles.warnLink, { color: t.primary }]}>Shop</Text>
              </Pressable>
              <Text style={[styles.warnSep, { color: t.mutedForeground }]}>·</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open rewards"
                onPress={() => router.push(routes.rewards)}
              >
                <Text style={[styles.warnLink, { color: t.primary }]}>Rewards</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  )
}

function PressableSpin({
  canSpin,
  isSpinning,
  freeSpins,
  onSpin,
}: {
  canSpin: boolean
  isSpinning: boolean
  freeSpins: number
  onSpin: () => void
}) {
  const t = useCasinoTheme()
  const { spinPress } = useHaptics()
  const pressScale = useSharedValue(1)
  const rotateVal = useSharedValue(0)

  useEffect(() => {
    if (isSpinning) {
      rotateVal.value = withRepeat(
        withTiming(360, { duration: 1200, easing: Easing.linear }),
        -1,
        false,
      )
    } else {
      cancelAnimation(rotateVal)
      rotateVal.value = withTiming(0, { duration: 200 })
    }
  }, [isSpinning, rotateVal])

  const spinStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value },
      { rotate: `${rotateVal.value}deg` },
    ],
    opacity: canSpin ? 1 : 0.45,
  }))

  const handlePress = () => {
    spinPress()
    pressScale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withTiming(1.0, { duration: 160, easing: Easing.out(Easing.back(2)) }),
    )
    onSpin()
  }

  return (
    <Pressable disabled={!canSpin} onPress={handlePress} accessibilityRole="button">
      <Animated.View style={spinStyle}>
        <LinearGradient
          colors={[t.spinButtonStart, t.spinButtonEnd]}
          style={[styles.spinOuter, { shadowColor: t.shadow }]}
        >
          <Text style={[styles.spinText, { color: t.spinButtonLabel }]}>
            {isSpinning ? '…' : freeSpins > 0 ? 'FREE\nSPIN' : 'SPIN'}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 10 },
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  quickBtn: { flexDirection: 'row', gap: 6 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  statCol: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statVal: { fontSize: 15, fontWeight: '800' },
  panel: {
    borderWidth: 2,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 14,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  betCluster: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  betMid: { alignItems: 'center', minWidth: 56 },
  betLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  betAmt: { fontSize: 22, fontWeight: '900' },
  spinOuter: {
    width: 76,
    height: 76,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  spinText: {
    fontWeight: '900',
    textAlign: 'center',
    fontSize: 14,
  },
  rightCol: { alignItems: 'center', gap: 4, minWidth: 72 },
  balLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  balVal: { fontSize: 15, fontWeight: '800' },
  warnBlock: { marginTop: 10, gap: 8, alignItems: 'center' },
  warn: { textAlign: 'center', fontWeight: '600', fontSize: 12, paddingHorizontal: 4 },
  warnLinks: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warnSep: { fontWeight: '700', fontSize: 14 },
  warnLink: { fontWeight: '800', fontSize: 13, textDecorationLine: 'underline' },
})
