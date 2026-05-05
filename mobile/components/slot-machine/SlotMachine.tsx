import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import Animated2, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useKeepAwake } from 'expo-keep-awake'
import Toast from 'react-native-toast-message'
import { useGame } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
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
  const {
    lastWin,
    lastWinType,
    isJackpotMode,
    isSpinning,
    winningLines,
    freeSpins,
    spinSequence,
    lastSpinFreeSpinsWon,
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
  const prevFreeSpinsRef = useRef(freeSpins)

  // Keep screen on while game is active
  useKeepAwake()

  // Free-spin banner slide-in
  const fsBannerY = useSharedValue(-20)
  const fsBannerOpacity = useSharedValue(0)
  const fsBannerScale = useSharedValue(1)

  useEffect(() => {
    if (freeSpins > 0 && prevFreeSpinsRef.current === 0) {
      // Slide in
      fsBannerY.value = -20
      fsBannerOpacity.value = 0
      fsBannerY.value = withSpring(0, { damping: 14, stiffness: 180 })
      fsBannerOpacity.value = withTiming(1, { duration: 250 })
    }
    if (freeSpins < prevFreeSpinsRef.current && freeSpins > 0) {
      // Pulse on decrement
      fsBannerScale.value = withSequence(
        withTiming(1.18, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(1.0, { duration: 200 }),
      )
    }
    if (freeSpins === 0 && prevFreeSpinsRef.current > 0) {
      fsBannerOpacity.value = withTiming(0, { duration: 300 })
    }
    prevFreeSpinsRef.current = freeSpins
  }, [freeSpins, fsBannerY, fsBannerOpacity, fsBannerScale])

  const fsBannerStyle = useAnimatedStyle(() => ({
    opacity: fsBannerOpacity.value,
    transform: [{ translateY: fsBannerY.value }, { scale: fsBannerScale.value }],
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
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerPulse, {
          toValue: 0.95,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(cornerPulse, {
          toValue: 0.28,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [cornerPulse])

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
      <View style={[styles.cabinet, { borderColor: t.cabinetBorder, backgroundColor: t.cabinetBg }]}>
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
            { opacity: cornerPulse, backgroundColor: t.win },
          ]}
        />
        <Animated.View
          style={[
            styles.cornerLight,
            styles.cornerBL,
            { opacity: cornerPulse, backgroundColor: t.win },
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
          <ReelGrid />
        </View>
        <View style={styles.legend}>
          <Text style={[styles.legendMeta, { color: t.textMuted }]}>9 active paylines</Text>
          <View style={styles.legendBadges}>
            <View style={[styles.symBadge, { borderColor: hexWithAlpha(t.primary, '88'), backgroundColor: hexWithAlpha(t.overlay, '33') }]}>
              <Text style={[styles.symGlyph, { color: t.win }]}>W</Text>
              <Text style={[styles.symLbl, { color: t.textMuted }]}>Wild</Text>
            </View>
            <View style={[styles.symBadge, { borderColor: hexWithAlpha(t.jackpot, '66'), backgroundColor: hexWithAlpha(t.overlay, '33') }]}>
              <Text style={[styles.symGlyph, { color: t.jackpot }]}>S</Text>
              <Text style={[styles.symLbl, { color: t.textMuted }]}>Scatter</Text>
            </View>
          </View>
        </View>
        {freeSpins > 0 ? (
          <Animated2.View style={[styles.fsBanner, fsBannerStyle]}>
            <Text style={[styles.fsText, { color: t.freeSpin, textShadowColor: t.shadow }]}>{freeSpins} FREE SPINS!</Text>
          </Animated2.View>
        ) : null}
        {isJackpotMode ? (
          <View style={[styles.jackpotBadge, { backgroundColor: hexWithAlpha(t.overlay, 'AA') }]}>
            <Text style={[styles.jackpotText, { color: t.jackpot }]}>JACKPOT MODE</Text>
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
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  legend: {
    alignItems: 'center',
    paddingBottom: 10,
    gap: 8,
  },
  legendMeta: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  legendBadges: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  symBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  symGlyph: { fontWeight: '900', fontSize: 13 },
  symLbl: { fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  fsBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '42%',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  fsText: {
    fontWeight: '900',
    fontSize: 18,
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
  jackpotBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  jackpotText: { fontWeight: '900', fontSize: 11 },
})
