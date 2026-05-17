import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useGame, JACKPOT_SEED_AMOUNT, JACKPOT_RECOVERY_MS } from '@/lib/game-context'
import { jackpotPayoutForBet } from '@shared/slot/evaluate-spin'
import { useAppearance } from '@/lib/appearance-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useAudio } from '@/lib/use-audio'
import { useHaptics } from '@/lib/use-haptics'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { hexWithAlpha } from '@/theme/tokens'
import {
  JACKPOT_MODE_MARQUEE_TITLE,
  MARQUEE_DEFAULT_STATIC,
  MARQUEE_JACKPOT_HIT_SEGMENT_FRESH,
  MARQUEE_JACKPOT_HIT_STATIC,
  MARQUEE_JACKPOT_MODE_ACTIVE,
  MARQUEE_MATCH_SEVENS_LINE,
  MARQUEE_SCATTER_SO_CLOSE,
  MARQUEE_SPIN_PHASE_FREE,
  MARQUEE_SPIN_PHASE_PAID,
} from '@/lib/vault-copy'

// ─── Decorative dot ───────────────────────────────────────────────────────────

function DotLight({
  delay,
  color,
  reduceMotion,
}: {
  delay: number
  color: string
  reduceMotion: boolean
}) {
  const opacity = useSharedValue(0.3)

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.45
      return
    }
    const timer = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.72, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.28, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      )
    }, delay)
    return () => {
      clearTimeout(timer)
      cancelAnimation(opacity)
    }
  }, [delay, opacity, reduceMotion])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, style]}
    />
  )
}

// ─── Ticker content ───────────────────────────────────────────────────────────
//
// Module-level constants so they never cause re-renders.
// Each segment is a discrete Text node → numberOfLines={1} on each keeps the
// whole row strictly one line with no wrapping.
// The trailing SPACER_W-pixel gap prevents the content from touching the left
// edge the instant it re-enters from the right on each loop.

const SPACER_W = 48 // px gap between end of copy and start of next loop pass

type SegType = 'msg' | 'sep'

const BASE_TICKER_SEGMENTS: { text: string; type: SegType }[] = [
  { text: MARQUEE_MATCH_SEVENS_LINE, type: 'msg' },
  { text: '  *  ', type: 'sep' },
  { text: '3 SCATTERS = 10 FREE SPINS', type: 'msg' },
  { text: '  *  ', type: 'sep' },
  { text: 'WILD substitutes any symbol', type: 'msg' },
  { text: '  *  ', type: 'sep' },
]

/**
 * Calculates the current jackpot display amount during seed recovery.
 * Grows linearly from JACKPOT_SEED_AMOUNT back to `targetAmount` over JACKPOT_RECOVERY_MS.
 * Returns `targetAmount` if no recent win or recovery is complete.
 */
function useSeedRecovery(
  jackpotLastWonAt: string | null,
  targetAmount: number,
): {
  displayAmount: number
  isRecovering: boolean
} {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!jackpotLastWonAt) return
    const wonAt = new Date(jackpotLastWonAt).getTime()
    const elapsed = Date.now() - wonAt
    if (elapsed >= JACKPOT_RECOVERY_MS) return

    // Tick every 10 seconds to update the display amount smoothly
    const id = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(id)
  }, [jackpotLastWonAt])

  if (!jackpotLastWonAt) return { displayAmount: targetAmount, isRecovering: false }

  const wonAt = new Date(jackpotLastWonAt).getTime()
  const elapsed = now - wonAt

  if (elapsed >= JACKPOT_RECOVERY_MS) {
    return { displayAmount: targetAmount, isRecovering: false }
  }

  const progress = elapsed / JACKPOT_RECOVERY_MS
  const amount = Math.round(JACKPOT_SEED_AMOUNT + (targetAmount - JACKPOT_SEED_AMOUNT) * progress)
  return { displayAmount: amount, isRecovering: true }
}

// ─── Marquee ─────────────────────────────────────────────────────────────────

export function Marquee() {
  const t = useCasinoTheme()
  const { resolvedMode } = useAppearance()
  const mythic = t.rarity.mythic
  const reduceMotion = useReducedMotion()
  const {
    bonusProgress,
    freeSpins,
    isJackpotMode,
    isSpinning,
    activeSpinIsFree,
    lastBonusMeterPayout,
    lastScatterCount,
    lastSpinFreeSpinsWon,
    currentBet,
    jackpotLastWonAt,
    spinSequence,
  } = useGame()
  const { bonusDing } = useAudio()
  const { bonusMeterFull } = useHaptics()

  const jackpotTarget = jackpotPayoutForBet(currentBet)
  const { displayAmount: megaJackpotDisplay, isRecovering } = useSeedRecovery(jackpotLastWonAt, jackpotTarget)

  // Inject a "JACKPOT WON" segment into the ticker during the first 5 min of recovery
  const jackpotWonRecently = isRecovering && jackpotLastWonAt
    ? (Date.now() - new Date(jackpotLastWonAt).getTime()) < 5 * 60 * 1000
    : false
  const STATIC_TICKER = jackpotWonRecently ? MARQUEE_JACKPOT_HIT_STATIC : MARQUEE_DEFAULT_STATIC

  const TICKER_SEGMENTS: { text: string; type: SegType }[] = jackpotWonRecently
    ? [
        { text: MARQUEE_JACKPOT_HIT_SEGMENT_FRESH, type: 'msg' },
        { text: '  *  ', type: 'sep' },
        ...BASE_TICKER_SEGMENTS,
      ]
    : BASE_TICKER_SEGMENTS

  const freeTickerPrefix = useMemo((): { text: string; type: SegType }[] => {
    if (freeSpins <= 0) return []
    const tag = freeSpins === 1 ? 'LAST FREE SPIN · ' : `${freeSpins} FREE · `
    return [{ text: tag, type: 'sep' }]
  }, [freeSpins])

  const scrollTickerSegments = useMemo(
    () => [...freeTickerPrefix, ...TICKER_SEGMENTS],
    [freeTickerPrefix, TICKER_SEGMENTS],
  )

  const [nearMissActive, setNearMissActive] = useState(false)
  useEffect(() => {
    if (isSpinning) {
      setNearMissActive(false)
      return
    }
    if (lastScatterCount !== 2 || lastSpinFreeSpinsWon > 0) {
      setNearMissActive(false)
      return
    }
    setNearMissActive(true)
    const id = setTimeout(() => setNearMissActive(false), 2800)
    return () => clearTimeout(id)
  }, [spinSequence, isSpinning, lastScatterCount, lastSpinFreeSpinsWon])

  // ─── Bonus meter ─────────────────────────────────────────────────────────

  const fillWidth = useSharedValue(0)
  const floatY = useSharedValue(0)
  const floatOpacity = useSharedValue(0)
  const [floatLabel, setFloatLabel] = useState('+0')
  const prevProgressRef = useRef(bonusProgress)
  const prevSeqRef = useRef(spinSequence)

  useEffect(() => {
    const dur = reduceMotion ? 120 : 600
    fillWidth.value = withTiming(bonusProgress, { duration: dur, easing: Easing.out(Easing.quad) })

    if (spinSequence !== prevSeqRef.current && lastBonusMeterPayout > 0) {
      bonusDing()
      bonusMeterFull()
      if (!reduceMotion) {
        fillWidth.value = withSequence(
          withTiming(100, { duration: 100 }),
          withTiming(bonusProgress, { duration: 400, easing: Easing.out(Easing.quad) }),
        )
      }
    }

    const delta = bonusProgress - prevProgressRef.current
    if (spinSequence !== prevSeqRef.current && delta !== 0 && !reduceMotion) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bonusProgress, spinSequence, lastBonusMeterPayout,
    bonusDing, bonusMeterFull, reduceMotion,
    fillWidth, floatY, floatOpacity,
  ])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%` as `${number}%`,
  }))
  const floatStyle = useAnimatedStyle(() => ({
    opacity: floatOpacity.value,
    transform: [{ translateY: floatY.value }],
  }))

  // ─── Jackpot card ────────────────────────────────────────────────────────

  const jackpotScale = useSharedValue(1)
  const glowOpacity = useSharedValue(0.35)
  const shimmerX = useSharedValue(-120)

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(jackpotScale)
      cancelAnimation(glowOpacity)
      cancelAnimation(shimmerX)
      jackpotScale.value = 1
      glowOpacity.value = 0.5
      return
    }
    jackpotScale.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1, false,
    )
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.64, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.36, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1, false,
    )
    shimmerX.value = withRepeat(
      withTiming(280, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
      -1, false,
    )
    return () => {
      cancelAnimation(jackpotScale)
      cancelAnimation(glowOpacity)
      cancelAnimation(shimmerX)
    }
  }, [reduceMotion, jackpotScale, glowOpacity, shimmerX])

  const jackpotPulse = useSharedValue(1)
  useEffect(() => {
    if (reduceMotion) { jackpotPulse.value = 1; return }
    if (isJackpotMode) {
      jackpotPulse.value = withSequence(
        withTiming(1.06, { duration: 320 }),
        withTiming(1.0,  { duration: 320 }),
        withTiming(1.04, { duration: 260 }),
        withTiming(1.0,  { duration: 260 }),
      )
    }
  }, [isJackpotMode, jackpotPulse, reduceMotion])

  const jackpotCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: jackpotScale.value * jackpotPulse.value }],
  }))
  const glowRingStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }))
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }))

  // ─── Scrolling ticker ────────────────────────────────────────────────────
  //
  // WHY TWO MEASUREMENTS?
  // ─────────────────────
  // React Native's flex layout constrains every child's width to its parent's
  // width by default. An Animated.View inside the ticker strip would be capped
  // at strip width → text wraps → onLayout reports strip width, not text width.
  //
  // SOLUTION — two-step measure + animate:
  //
  // Step 1 — natural width (tickerNaturalW)
  //   Render the same ticker text inside a hidden horizontal ScrollView
  //   (scrollEnabled=false). A horizontal ScrollView does NOT constrain its
  //   children's width, so onLayout on the inner View reports the true
  //   unconstrained text width. The wrapper has height:0 + overflow:hidden
  //   so it is completely invisible and takes no space.
  //
  // Step 2 — container width (tickerContainerW)
  //   onLayout on the ticker strip itself gives us the actual rendered width
  //   of the visible area. This is the start-X of the animation (content
  //   enters from the right edge of the container).
  //
  // ANIMATION
  //   Start  :  tickerContainerW  (content is just off-screen to the right)
  //   End    : −tickerNaturalW    (content is just off-screen to the left)
  //   Reset  :  1 ms snap back to tickerContainerW (both ends are off-screen,
  //             so the snap is invisible)
  //   Loop   :  withRepeat(withSequence([scroll, snap]), -1, false)
  //
  // The trailing SPACER_W gap (a fixed-width View at the end of the row) is
  // included in the measurement and creates breathing room between loops.
  //
  // Reduced motion → static centred text; no Reanimated animation runs.
  // Animation only starts when BOTH widths are known (> 0).
  // Restarts whenever freeSpins, isJackpotMode, reduceMotion, either width, or theme changes.

  const tickerX = useSharedValue(0)            // 0 = hidden until widths known
  const [tickerNaturalW, setTickerNaturalW] = useState(0)   // natural text width
  const [tickerContainerW, setTickerContainerW] = useState(0) // visible strip width

  useEffect(() => {
    // Always cancel before deciding what to do next
    cancelAnimation(tickerX)

    // Static or no animation conditions
    if (reduceMotion || isJackpotMode || isSpinning || nearMissActive) {
      tickerX.value = 0  // rest at origin — static text is shown instead
      return
    }

    // Wait until both measurements are ready
    if (tickerNaturalW === 0 || tickerContainerW === 0) return

    // Speed: ~55 px/s, minimum 8 s, maximum 24 s
    const travelPx = tickerContainerW + tickerNaturalW
    const duration = Math.min(24_000, Math.max(8_000, Math.round(travelPx / 55 * 1000)))

    // Start the content just off the right edge
    tickerX.value = tickerContainerW

    tickerX.value = withRepeat(
      withSequence(
        // Phase 1 — scroll left through the visible strip
        withTiming(-tickerNaturalW, { duration, easing: Easing.linear }),
        // Phase 2 — instant snap back to right edge (1 ms; both positions are
        //            off-screen so the jump is completely invisible)
        withTiming(tickerContainerW, { duration: 1 }),
      ),
      -1,
      false,
    )

    return () => cancelAnimation(tickerX)
  }, [
    freeSpins,
    isJackpotMode,
    isSpinning,
    nearMissActive,
    reduceMotion,
    scrollTickerSegments,
    tickerNaturalW,
    tickerContainerW,
    tickerX,
  ])

  const tickerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tickerX.value }],
  }))

  // ─── Theme helpers ───────────────────────────────────────────────────────

  const meterAccent = freeSpins > 0 ? t.freeSpin : isJackpotMode ? t.jackpot : t.primary
  const jackpotCardGradient = [
    hexWithAlpha(t.gold,        '58'),
    hexWithAlpha(t.jackpot,     '46'),
    hexWithAlpha(t.destructive, '2E'),
    hexWithAlpha(mythic,        '24'),
  ] as const
  const amountShadowAlpha = resolvedMode === 'dark' ? '44' : '20'

  return (
    <View style={styles.wrap}>
      <View style={[styles.top, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}>

        {/* ── Jackpot card + decorative dots ── */}
        <View style={styles.jackpotSection}>
          <Animated.View
            style={[
              styles.jackpotGlow,
              { shadowColor: t.gold, backgroundColor: hexWithAlpha(t.gold, '14') },
              glowRingStyle,
            ]}
            pointerEvents="none"
          />
          <View style={styles.jackpotRow}>
            <View style={styles.dotCol}>
              {([0, 150, 300] as const).map((delay) => (
                <DotLight key={delay} delay={delay} color={t.primary} reduceMotion={reduceMotion} />
              ))}
            </View>

            <Animated.View
              style={[
                styles.jackpotCard,
                {
                  borderColor: hexWithAlpha(t.gold, 'CC'),
                  backgroundColor: hexWithAlpha(t.gold, '18'),
                },
                jackpotCardStyle,
              ]}
            >
              <LinearGradient
                colors={[...jackpotCardGradient]}
                locations={[0, 0.38, 0.72, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFillObject, styles.jackpotCardGradient]}
              />
              {!reduceMotion ? (
                <Animated.View style={[styles.shimmerWrap, shimmerStyle]} pointerEvents="none">
                  <LinearGradient
                    colors={[
                      'transparent',
                      hexWithAlpha(t.gold, '50'),
                      hexWithAlpha(mythic, '38'),
                      'transparent',
                    ]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.shimmerGrad}
                  />
                </Animated.View>
              ) : null}
              <Text
                style={[
                  styles.jackpotTitle,
                  {
                    color: t.textPrimary,
                    zIndex: 2,
                    textShadowColor: hexWithAlpha(t.gold, resolvedMode === 'dark' ? '55' : '33'),
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 6,
                  },
                ]}
              >
                {JACKPOT_MODE_MARQUEE_TITLE}
              </Text>
              <Text
                style={[
                  styles.jackpotValue,
                  {
                    color: t.jackpot,
                    zIndex: 2,
                    textShadowColor: hexWithAlpha(t.textPrimary, amountShadowAlpha),
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  },
                ]}
              >
                {`${megaJackpotDisplay.toLocaleString()} VC`}
              </Text>
              {isRecovering ? (
                <Text style={[styles.jackpotSeed, { color: hexWithAlpha(t.gold, 'AA') }]}>
                  Fresh jackpot growing…
                </Text>
              ) : null}
            </Animated.View>

            <View style={styles.dotCol}>
              {([75, 225, 375] as const).map((delay) => (
                <DotLight key={delay} delay={delay} color={t.primary} reduceMotion={reduceMotion} />
              ))}
            </View>
          </View>
        </View>

        {/* ── STEP 1 — Invisible natural-width measurement ── */}
        {/*
          height:0 + overflow:hidden makes this completely inert visually.
          The horizontal ScrollView does NOT constrain children to screen width,
          so onLayout on the inner View reports the TRUE unconstrained text width.
          Measured once per content/layout change; onLayout only fires on change.
        */}
        <View style={styles.measureWrap} pointerEvents="none">
          <ScrollView
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            style={styles.measureScroll}
          >
            <View
              style={styles.tickerRow}
              onLayout={(e) => setTickerNaturalW(e.nativeEvent.layout.width)}
            >
              {scrollTickerSegments.map((seg, i) => (
                <Text
                  key={i}
                  numberOfLines={1}
                  style={styles[seg.type === 'msg' ? 'tickerMsg' : 'tickerSep']}
                >
                  {seg.text}
                </Text>
              ))}
              {/* Spacer creates the gap between the end of copy and the next loop */}
              <View style={styles.tickerSpacer} />
            </View>
          </ScrollView>
        </View>

        {/* ── STEP 2 — Visible ticker strip ── */}
        {/*
          Priority: isSpinning → near-miss flash → jackpot mode → scrolling promo
          (free spins add a prefix segment on the crawl when idle).
        */}
        <View
          style={[styles.ticker, { backgroundColor: t.cardSoft, borderTopColor: t.border }]}
          onLayout={(e) => setTickerContainerW(e.nativeEvent.layout.width)}
        >
          {reduceMotion ? (
            isSpinning ? (
              <Text style={[styles.tickerSpinPhase, { color: t.primary }]} numberOfLines={2}>
                {activeSpinIsFree ? MARQUEE_SPIN_PHASE_FREE : MARQUEE_SPIN_PHASE_PAID}
              </Text>
            ) : nearMissActive ? (
              <Text style={[styles.tickerNearMiss, { color: t.freeSpin }]} numberOfLines={2}>
                {MARQUEE_SCATTER_SO_CLOSE}
              </Text>
            ) : isJackpotMode ? (
              <Text
                style={[styles.tickerJackpotMode, { color: t.jackpot }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {MARQUEE_JACKPOT_MODE_ACTIVE}
              </Text>
            ) : freeSpins > 0 ? (
              <Text
                style={[styles.tickerFreeSpin, { color: t.freeSpin }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {freeSpins === 1
                  ? 'LAST FREE SPIN — 1 game left!'
                  : `${freeSpins} FREE SPINS IN QUEUE`}
              </Text>
            ) : (
              <Text style={[styles.tickerStatic, { color: t.textSecondary }]} numberOfLines={1}>
                {STATIC_TICKER}
              </Text>
            )
          ) : isSpinning ? (
            <Text
              style={[styles.tickerSpinPhase, { color: t.primary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {activeSpinIsFree ? MARQUEE_SPIN_PHASE_FREE : MARQUEE_SPIN_PHASE_PAID}
            </Text>
          ) : nearMissActive ? (
            <Text
              style={[styles.tickerNearMiss, { color: t.freeSpin }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {MARQUEE_SCATTER_SO_CLOSE}
            </Text>
          ) : isJackpotMode ? (
            <Text
              style={[styles.tickerJackpotMode, { color: t.jackpot }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {MARQUEE_JACKPOT_MODE_ACTIVE}
            </Text>
          ) : (
            <Animated.View style={[styles.tickerAbs, tickerStyle]}>
              {scrollTickerSegments.map((seg, i) => (
                <Text
                  key={i}
                  numberOfLines={1}
                  style={
                    seg.type === 'msg'
                      ? [styles.tickerMsg, { color: t.textSecondary }]
                      : [styles.tickerSep, { color: t.primary }]
                  }
                >
                  {seg.text}
                </Text>
              ))}
              <View style={styles.tickerSpacer} />
            </Animated.View>
          )}
        </View>

        {/* ── Bonus meter ── */}
        <View style={styles.meterRow}>
          <Text style={[styles.meterLabel, { color: t.textMuted }]}>Bonus</Text>
          <View style={[styles.meterTrack, { backgroundColor: t.muted, borderColor: t.border }]}>
            <Animated.View style={[styles.meterFill, fillStyle, { backgroundColor: meterAccent }]} />
          </View>
          <View style={styles.meterRight}>
            <Text style={[styles.meterPct, { color: t.textSecondary }]}>{bonusProgress}%</Text>
            <Animated.Text style={[styles.floatText, { color: t.gold }, floatStyle]}>
              {floatLabel}
            </Animated.Text>
          </View>
        </View>
        <Text style={[styles.meterHint, { color: t.textMuted }]}>
          Reach 100% to unlock bonus Vault Coins.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  top: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },

  // ── Jackpot card
  jackpotSection: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    position: 'relative',
  },
  jackpotGlow: {
    position: 'absolute',
    alignSelf: 'center',
    width: '80%',
    height: 108,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.62,
    shadowRadius: 28,
    elevation: 10,
  },
  jackpotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    width: '100%',
  },
  dotCol: { flexDirection: 'column', gap: 5, alignItems: 'center' },
  jackpotCard: {
    flex: 1,
    zIndex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2.5,
    overflow: 'hidden',
    alignItems: 'center',
    gap: 6,
  },
  jackpotCardGradient: { borderRadius: 16 },
  shimmerWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center' },
  shimmerGrad: { width: 110, height: '160%', alignSelf: 'center', opacity: 0.85 },
  jackpotTitle: { fontWeight: '900', letterSpacing: 2.4, fontSize: 11 },
  jackpotValue: { fontWeight: '900', fontSize: 27, letterSpacing: 0.45 },
  jackpotSeed: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, marginTop: 1 },

  // ── Measurement layer (height:0, completely invisible)
  measureWrap: { height: 0, overflow: 'hidden' },
  measureScroll: { flexGrow: 0 },
  tickerRow: { flexDirection: 'row', alignItems: 'center' },

  // ── Visible ticker strip
  ticker: {
    height: 34,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  // position:'absolute' breaks out of flex-width constraint → one-line text
  tickerAbs: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickerMsg: { fontSize: 12, fontWeight: '600' },
  tickerSep: { fontSize: 13, fontWeight: '900' },
  // Fixed-width spacer: same in measurement row and animated row so the
  // measured width includes the gap before content repeats.
  tickerSpacer: { width: SPACER_W },
  // Static text for reduced-motion / accessibility
  tickerStatic: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  tickerFreeSpin: { textAlign: 'center', fontSize: 12, fontWeight: '800' },
  tickerJackpotMode: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.15,
    paddingHorizontal: 6,
  },
  tickerSpinPhase: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
    paddingHorizontal: 8,
  },
  tickerNearMiss: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.12,
    paddingHorizontal: 6,
  },

  // ── Bonus meter
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  meterLabel: { fontSize: 11, fontWeight: '600', width: 44 },
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
