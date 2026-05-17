import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated2, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
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
import { CelebrationParticles } from '@/components/animations/CelebrationParticles'
import {
  JACKPOT_MODE_BURST_SUB,
  JACKPOT_MODE_BURST_TITLE,
  JACKPOT_MODE_LABEL,
} from '@/lib/vault-copy'
import { ControlDeck } from './ControlDeck'
import { SpinSyncBanner } from './SpinSyncBanner'
import { InfoModal } from './InfoModal'
import { LinesModal } from './LinesModal'
import { Marquee } from './Marquee'
import { ReelGrid } from './ReelGrid'
import { WinDisplay } from './WinDisplay'
import type { PaylineStrokeStyle } from './PaylineOverlay'
import {
  getAnimationWinType,
  pickWinAnimationVariant,
  pickSymbolWinMotion,
  type WinAnimationVariant,
  type SymbolWinMotion,
} from '@/lib/win-animation-variants'

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
    currentTheme,
    lastScatterCount,
  } = useGame()
  const [showWin, setShowWin] = useState(false)
  const [winAmount, setWinAmount] = useState(0)
  const [winType, setWinType] = useState<typeof lastWinType>('none')
  const [winAnimationVariant, setWinAnimationVariant] = useState<WinAnimationVariant | null>(null)
  const [symbolWinMotion, setSymbolWinMotion] = useState<SymbolWinMotion>('pulse')
  const previousWinAnimationVariantIdRef = useRef<string | null>(null)
  const suppressFsBurstForSeqRef = useRef<{ seq: number; suppress: boolean } | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showLinesModal, setShowLinesModal] = useState(false)
  const dismissedSpinSeqRef = useRef(0)
  const bonusMeterToastSeqRef = useRef(-1)
  const cornerPulse = useRef(new Animated.Value(0.35)).current
  const fsBurstSeqRef = useRef(-1)
  const [fsBurstLabel, setFsBurstLabel] = useState('')
  const fsBurstOpacity = useSharedValue(0)
  const fsBurstScale = useSharedValue(0.94)

  const jackpotFxSeqRef = useRef(-1)
  const [jackpotBurstRunId, setJackpotBurstRunId] = useState<number | null>(null)
  const jpBurstOpacity = useSharedValue(0)
  const jpBurstScale = useSharedValue(0.9)
  const reelJackpotGlow = useSharedValue(0)

  // Keep screen on while game is active
  useKeepAwake()

  useEffect(() => {
    if (spinSequence <= dismissedSpinSeqRef.current) return
    if (isSpinning) return

    const lineWin = lastWin > 0 && winningLines.length > 0 && lastWinType !== 'none'
    const fsOnly = lastSpinFreeSpinsWon > 0 && !lineWin

    const animationWinType = getAnimationWinType({
      lastWinType,
      lastSpinFreeSpinsWon,
      lastScatterCount,
    })

    const variant = pickWinAnimationVariant({
      winType: animationWinType,
      themeId: currentTheme,
      previousVariantId: previousWinAnimationVariantIdRef.current,
      reducedMotion: reduceMotion,
    })

    if (lastSpinFreeSpinsWon > 0) {
      // Suppress reel toast whenever WinDisplay will carry free-spin copy (modal path or unknown variant).
      const suppressFsBurst =
        fsOnly ||
        (lineWin &&
          lastSpinFreeSpinsWon > 0 &&
          (variant == null || variant.overlayMode !== 'none'))
      suppressFsBurstForSeqRef.current = { seq: spinSequence, suppress: suppressFsBurst }
    } else {
      suppressFsBurstForSeqRef.current = null
    }

    setWinAnimationVariant(variant)
    if (variant) {
      previousWinAnimationVariantIdRef.current = variant.id
    }

    if (lineWin) {
      setWinAmount(lastWin)
      setWinType(lastWinType)
      setSymbolWinMotion(pickSymbolWinMotion())
      if (variant?.overlayMode === 'none') {
        setShowWin(false)
        dismissedSpinSeqRef.current = spinSequence
        clearLastSpinFreeSpinsBonus()
        return
      }
      setShowWin(true)
      return
    }
    if (fsOnly) {
      setWinAmount(0)
      setWinType('normal')
      setSymbolWinMotion('pulse')
      if (variant?.overlayMode === 'none') {
        setShowWin(false)
        dismissedSpinSeqRef.current = spinSequence
        clearLastSpinFreeSpinsBonus()
        return
      }
      setShowWin(true)
      return
    }
    dismissedSpinSeqRef.current = spinSequence
  }, [
    spinSequence,
    isSpinning,
    lastWin,
    lastWinType,
    winningLines,
    lastSpinFreeSpinsWon,
    lastScatterCount,
    currentTheme,
    reduceMotion,
    clearLastSpinFreeSpinsBonus,
  ])

  /**
   * Maintenance: this effect must remain **after** the spin-resolve `useEffect` above.
   *
   * The spin-resolve effect runs first for a finished spin and writes `suppressFsBurstForSeqRef`
   * for the current `spinSequence` (whether to suppress the reel burst/toast). This effect reads
   * that ref so we do not duplicate free-spin messaging when `WinDisplay` already owns the
   * bonus / free-spin moment (modal path, unknown variant, etc.).
   */
  /** Brief Free Spins award toast over reels when scatters grant spins (not persistent). */
  useEffect(() => {
    if (isSpinning) return
    if (lastSpinFreeSpinsWon <= 0) return
    if (fsBurstSeqRef.current === spinSequence) return

    const plan = suppressFsBurstForSeqRef.current
    if (plan?.seq === spinSequence && plan.suppress) {
      fsBurstSeqRef.current = spinSequence
      return
    }

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

  /** One-shot burst + particles when a center-row jackpot resolves (`isJackpotMode` flips on). */
  useEffect(() => {
    if (isSpinning) {
      setJackpotBurstRunId(null)
      jpBurstOpacity.value = withTiming(0, { duration: 140 })
      return
    }
    if (!isJackpotMode) return
    if (jackpotFxSeqRef.current === spinSequence) return
    jackpotFxSeqRef.current = spinSequence
    setJackpotBurstRunId(spinSequence)
    jpBurstOpacity.value = 0
    jpBurstScale.value = 0.88
    jpBurstOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
    jpBurstScale.value = withSpring(1, { damping: 14, stiffness: 210 })
    const visibleMs = reduceMotion ? 800 : 1450
    const hide = setTimeout(() => {
      jpBurstOpacity.value = withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) })
    }, visibleMs)
    const clear = setTimeout(() => {
      setJackpotBurstRunId(null)
    }, visibleMs + 420)
    return () => {
      clearTimeout(hide)
      clearTimeout(clear)
    }
  }, [spinSequence, isSpinning, isJackpotMode, reduceMotion, jpBurstOpacity, jpBurstScale])

  const jpBurstStyle = useAnimatedStyle(() => ({
    opacity: jpBurstOpacity.value,
    transform: [{ scale: jpBurstScale.value }],
  }))

  useEffect(() => {
    if (!isJackpotMode || reduceMotion) {
      cancelAnimation(reelJackpotGlow)
      reelJackpotGlow.value = 0
      return
    }
    reelJackpotGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    )
    return () => cancelAnimation(reelJackpotGlow)
  }, [isJackpotMode, reduceMotion, reelJackpotGlow])

  const reelJackpotAuraStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.1 + reelJackpotGlow.value * 0.34,
    shadowRadius: 10 + reelJackpotGlow.value * 20,
  }))

  useEffect(() => {
    if (isSpinning) return
    if (lastBonusMeterPayout <= 0) return
    if (bonusMeterToastSeqRef.current === spinSequence) return
    bonusMeterToastSeqRef.current = spinSequence
    Toast.show({
      type: 'success',
      text1: 'Bonus meter full!',
      text2: `+${lastBonusMeterPayout.toLocaleString()} Vault Coins`,
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

  const paylineStrokeStyle: PaylineStrokeStyle =
    currentTheme === 'cyber' ? 'neon' : currentTheme === 'treasure' ? 'treasure' : 'gold'

  const handleWinClose = useCallback(() => {
    dismissedSpinSeqRef.current = spinSequence
    setShowWin(false)
    setWinType('none')
    setWinAnimationVariant(null)
    clearLastSpinFreeSpinsBonus()
  }, [clearLastSpinFreeSpinsBonus, spinSequence])

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.cabinet,
          {
            borderColor: isJackpotMode
              ? hexWithAlpha(t.jackpot, 'AA')
              : hexWithAlpha(t.gold, '66'),
            backgroundColor: t.cabinetBg,
            shadowColor: isJackpotMode ? t.jackpot : t.gold,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isJackpotMode ? 0.4 : 0.28,
            shadowRadius: isJackpotMode ? 22 : 18,
            elevation: isJackpotMode ? 12 : 10,
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
        <Animated2.View
          style={[
            styles.reelSection,
            isJackpotMode && {
              shadowColor: t.jackpot,
              shadowOffset: { width: 0, height: 0 },
              elevation: 10,
            },
            isJackpotMode && reduceMotion
              ? { shadowOpacity: 0.3, shadowRadius: 18 }
              : null,
            isJackpotMode && !reduceMotion ? reelJackpotAuraStyle : null,
          ]}
        >
          <View style={styles.reelPadInner}>
            <ReelGrid
              linesModalOpen={showLinesModal}
              paylineStrokeStyle={paylineStrokeStyle}
              symbolWinMotion={symbolWinMotion}
            />
            {jackpotBurstRunId != null ? (
              <>
                <CelebrationParticles
                  key={`jpfx-${jackpotBurstRunId}`}
                  count={reduceMotion ? 0 : 40}
                  colors={[
                    t.jackpot,
                    t.gold,
                    hexWithAlpha(t.gold, 'EE'),
                    hexWithAlpha(t.jackpot, 'CC'),
                    t.accent,
                  ]}
                  duration={1500}
                />
                <Animated2.View style={[styles.jpBurst, jpBurstStyle]} pointerEvents="none">
                  <View
                    style={[
                      styles.jpBurstInner,
                      {
                        borderColor: hexWithAlpha(t.jackpot, '88'),
                        backgroundColor: hexWithAlpha(t.jackpot, '24'),
                      },
                    ]}
                  >
                    <Text style={[styles.jpBurstTitle, { color: t.gold }]}>{JACKPOT_MODE_BURST_TITLE}</Text>
                    <Text style={[styles.jpBurstSub, { color: t.textPrimary }]}>{JACKPOT_MODE_BURST_SUB}</Text>
                  </View>
                </Animated2.View>
              </>
            ) : null}
          </View>
        </Animated2.View>
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
          <View style={styles.legendInner}>
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
        </View>
        {isJackpotMode ? (
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={JACKPOT_MODE_LABEL}
            accessibilityHint="Sevens on the center row. Details in the Reward Table."
            style={[
              styles.jackpotBadge,
              {
                backgroundColor: hexWithAlpha(t.jackpot, '38'),
                borderColor: hexWithAlpha(t.gold, '44'),
              },
            ]}
          >
            <Text style={[styles.jackpotText, { color: t.textPrimary }]}>{JACKPOT_MODE_LABEL}</Text>
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
        animationVariant={showWin ? winAnimationVariant : null}
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
  reelPadInner: {
    position: 'relative',
    width: '100%',
  },
  jpBurst: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: '32%',
    alignItems: 'center',
    zIndex: 5,
  },
  jpBurstInner: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 3,
  },
  jpBurstTitle: { fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  jpBurstSub: { fontWeight: '800', fontSize: 12, letterSpacing: 0.2 },
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    maxWidth: '100%',
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
