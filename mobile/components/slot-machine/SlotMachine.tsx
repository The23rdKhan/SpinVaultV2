import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated2, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useKeepAwake } from 'expo-keep-awake'
import Toast from 'react-native-toast-message'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useGame } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { hexWithAlpha } from '@/theme/tokens'
import { ControlDeck } from './ControlDeck'
import { SpinSyncBanner } from './SpinSyncBanner'
import { InfoModal } from './InfoModal'
import { LinesModal } from './LinesModal'
import { Marquee } from './Marquee'
import { ReelGrid } from './ReelGrid'
import { WinDisplay } from './WinDisplay'

export function SlotMachine() {
  const t = useCasinoTheme()
  const reduceMotion = useReducedMotion()
  const {
    lastWin,
    lastWinType,
    isJackpotMode,
    isSpinning,
    winningLines,
    freeSpins,
    spinSequence,
    lastSpinFreeSpinsWon,
    lastSpinXpGained,
    lastBonusMeterPayout,
    clearLastSpinFreeSpinsBonus,
  } = useGame()
  const [showWin, setShowWin] = useState(false)
  const [winAmount, setWinAmount] = useState(0)
  const [winType, setWinType] = useState<typeof lastWinType>('none')
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showLinesModal, setShowLinesModal] = useState(false)
  const dismissedSpinSeqRef = useRef(0)
  const bonusMeterToastSeqRef = useRef(-1)
  const cornerPulse = useRef(new Animated.Value(0.35)).current
  const fsBurstSeqRef = useRef(-1)
  const [fsBurstLabel, setFsBurstLabel] = useState('')
  const fsBurstOpacity = useSharedValue(0)
  const fsBurstScale = useSharedValue(0.94)

  // Keep screen on while game is active
  useKeepAwake()

  /** Brief Free Spins award toast over reels when scatters grant spins (not persistent). */
  useEffect(() => {
    if (isSpinning) return
    if (lastSpinFreeSpinsWon <= 0) return
    if (fsBurstSeqRef.current === spinSequence) return
    fsBurstSeqRef.current = spinSequence
    setFsBurstLabel(
      lastSpinFreeSpinsWon === 1 ? '1 Free Spin' : `${lastSpinFreeSpinsWon} Free Spins`,
    )
    const visibleMs = reduceMotion ? 650 : 1000
    fsBurstOpacity.value = 0
    fsBurstScale.value = 0.92
    fsBurstOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
    fsBurstScale.value = withSpring(1, { damping: 15, stiffness: 220 })
    const hide = setTimeout(() => {
      fsBurstOpacity.value = withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) })
    }, visibleMs)
    const clear = setTimeout(() => {
      setFsBurstLabel('')
    }, visibleMs + 360)
    return () => {
      clearTimeout(hide)
      clearTimeout(clear)
    }
  }, [spinSequence, isSpinning, lastSpinFreeSpinsWon, reduceMotion, fsBurstOpacity, fsBurstScale])

  const fsBurstStyle = useAnimatedStyle(() => ({
    opacity: fsBurstOpacity.value,
    transform: [{ scale: fsBurstScale.value }],
  }))

  useEffect(() => {
    if (isSpinning) return
    if (lastBonusMeterPayout <= 0) return
    if (bonusMeterToastSeqRef.current === spinSequence) return
    bonusMeterToastSeqRef.current = spinSequence
    Toast.show({
      type: 'success',
      text1: 'Bonus meter full!',
      text2: `+${lastBonusMeterPayout.toLocaleString()} virtual coins`,
    })
  }, [spinSequence, isSpinning, lastBonusMeterPayout])

  useEffect(() => {
    if (reduceMotion) {
      cornerPulse.setValue(0.42)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerPulse, {
          toValue: 0.52,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(cornerPulse, {
          toValue: 0.18,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [cornerPulse, reduceMotion])

  useEffect(() => {
    if (spinSequence <= dismissedSpinSeqRef.current) return
    if (isSpinning) return

    const lineWin = lastWin > 0 && winningLines.length > 0 && lastWinType !== 'none'
    const fsOnly = lastSpinFreeSpinsWon > 0 && !lineWin
    if (lineWin) {
      setWinAmount(lastWin)
      setWinType(lastWinType)
      setShowWin(true)
      return
    }
    if (fsOnly) {
      setWinAmount(0)
      setWinType('normal')
      setShowWin(true)
      return
    }
    dismissedSpinSeqRef.current = spinSequence
  }, [spinSequence, isSpinning, lastWin, lastWinType, winningLines, lastSpinFreeSpinsWon])

  const handleWinClose = useCallback(() => {
    dismissedSpinSeqRef.current = spinSequence
    setShowWin(false)
    setWinType('none')
    clearLastSpinFreeSpinsBonus()
  }, [clearLastSpinFreeSpinsBonus, spinSequence])

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.cabinet,
          {
            borderColor: hexWithAlpha(t.gold, '66'),
            backgroundColor: t.cabinetBg,
            shadowColor: t.gold,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.28,
            shadowRadius: 18,
            elevation: 10,
          },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[
            hexWithAlpha(t.gold, '12'),
            'transparent',
            hexWithAlpha(t.primary, '08'),
          ]}
          locations={[0, 0.42, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
        />
        <Animated.View
          style={[
            styles.cornerLight,
            styles.cornerTL,
            { opacity: cornerPulse, backgroundColor: t.machineAccent },
          ]}
        />
        <Animated.View
          style={[
            styles.cornerLight,
            styles.cornerTR,
            { opacity: cornerPulse, backgroundColor: t.machineAccent },
          ]}
        />
        <Animated.View
          style={[
            styles.cornerLight,
            styles.cornerBL,
            { opacity: cornerPulse, backgroundColor: t.machineAccent },
          ]}
        />
        <Animated.View
          style={[
            styles.cornerLight,
            styles.cornerBR,
            { opacity: cornerPulse, backgroundColor: t.machineAccent },
          ]}
        />
        <Marquee />
        <View style={styles.reelSection}>
          <ReelGrid linesModalOpen={showLinesModal} />
        </View>
        {fsBurstLabel ? (
          <Animated2.View style={[styles.fsBurst, fsBurstStyle]} pointerEvents="none">
            <View
              style={[
                styles.fsBurstInner,
                {
                  borderColor: hexWithAlpha(t.freeSpin, '88'),
                  backgroundColor: hexWithAlpha(t.freeSpin, '22'),
                },
              ]}
            >
              <Text style={[styles.fsBurstTitle, { color: t.freeSpin }]}>Free Spins</Text>
              <Text style={[styles.fsBurstSub, { color: t.textPrimary }]}>{fsBurstLabel}</Text>
            </View>
          </Animated2.View>
        ) : null}
        <View style={[styles.legend, { borderTopColor: hexWithAlpha(t.gold, '22') }]}>
          <Text style={[styles.legendMeta, { color: hexWithAlpha(t.gold, 'CC') }]}>9 paylines</Text>
          <View style={styles.legendBadges}>
            <View
              style={[
                styles.symBadge,
                {
                  borderColor: hexWithAlpha(t.gold, '35'),
                  backgroundColor: hexWithAlpha(t.gold, '12'),
                },
              ]}
            >
              <FontAwesome name="star" size={11} color={hexWithAlpha(t.gold, 'EE')} />
              <Text style={[styles.symLbl, { color: t.textMuted }]}>Wild</Text>
            </View>
            <View
              style={[
                styles.symBadge,
                {
                  borderColor: hexWithAlpha(t.freeSpin, '30'),
                  backgroundColor: hexWithAlpha(t.freeSpin, '10'),
                },
              ]}
            >
              <FontAwesome name="bullseye" size={11} color={hexWithAlpha(t.freeSpin, 'AA')} />
              <Text style={[styles.symLbl, { color: t.textMuted }]}>Scatter</Text>
            </View>
          </View>
        </View>
        {isJackpotMode ? (
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel="Jackpot Mode"
            accessibilityHint="Sevens on the center row. Details in Paytable."
            style={[
              styles.jackpotBadge,
              {
                backgroundColor: hexWithAlpha(t.jackpot, '38'),
                borderColor: hexWithAlpha(t.gold, '44'),
              },
            ]}
          >
            <Text style={[styles.jackpotText, { color: t.textPrimary }]}>Jackpot Mode</Text>
          </View>
        ) : null}
      </View>

      <SpinSyncBanner />

      <ControlDeck onOpenInfo={() => setShowInfoModal(true)} onOpenLines={() => setShowLinesModal(true)} />

      <WinDisplay
        show={showWin}
        amount={winAmount}
        winType={winType}
        freeSpins={lastSpinFreeSpinsWon}
        xpGained={lastSpinXpGained}
        onClose={handleWinClose}
      />

      <InfoModal open={showInfoModal} onClose={() => setShowInfoModal(false)} />
      <LinesModal open={showLinesModal} onClose={() => setShowLinesModal(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingBottom: 24,
    gap: 16,
  },
  cabinet: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  cornerLight: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
    zIndex: 4,
    pointerEvents: 'none',
  },
  cornerTL: { top: 6, left: 6 },
  cornerTR: { top: 6, right: 6 },
  cornerBL: { bottom: 6, left: 6 },
  cornerBR: { bottom: 6, right: 6 },
  reelSection: {
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 6,
  },
  fsBurst: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '38%',
    alignItems: 'center',
    zIndex: 3,
  },
  fsBurstInner: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  fsBurstTitle: { fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  fsBurstSub: { fontWeight: '800', fontSize: 17 },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  legendMeta: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  legendBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  symBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  symLbl: { fontWeight: '600', fontSize: 10 },
  jackpotBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    zIndex: 3,
  },
  jackpotText: { fontWeight: '700', fontSize: 11 },
})
