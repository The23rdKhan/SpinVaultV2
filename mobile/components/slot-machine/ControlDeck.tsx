import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
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
import { isBetUnlocked, coinGateForBet } from '@shared/slot/evaluate-spin'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/lib/app-routes'
import { track } from '@/lib/analytics/track'
import { AnalyticsEvents } from '@shared/analytics/event-names'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'
import { AppButton } from '@/components/ui/AppButton'
import { useHaptics } from '@/lib/use-haptics'
import { useAudio } from '@/lib/use-audio'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { BrokeRecoverySheet } from './BrokeRecoverySheet'

/** Free-spin CTA: high-energy red that reads on dark cabinets across themes. */
const FREE_SPIN_CTA_RED = '#FF2B2B' as const
const FREE_SPIN_CTA_RED_DEEP = '#E01010' as const
const FREE_SPIN_CTA_RED_HOT = '#FF5E5E' as const

/** Main spin disc — smaller than early builds so side columns (bet / max) stay readable on phones. */
const SPIN_BUTTON_PX = 82 as const
const SPIN_BUTTON_RADIUS = SPIN_BUTTON_PX / 2

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
    addCoins,
    spin,
    isSpinning,
    activeSpinIsFree,
    freeSpins,
    freeSpinMultiplier,
    lastWin,
    totalSpins,
    biggestWin,
  } = useGame()
  const { watchAd, canWatchAd } = useAuth()

  const { betChange, maxBet: maxBetHaptic } = useHaptics()
  const { betChange: betChangeSfx } = useAudio()
  const reduceMotion = useReducedMotion()

  const [displayedWin, setDisplayedWin] = useState(0)
  const [fastMode, setFastMode] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [watchVideoBusy, setWatchVideoBusy] = useState(false)
  const countUpRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto spin — 50-spin session, toggled on/off with no picker
  const AUTO_SPIN_DEFAULT = 50
  const [autoSpinRemaining, setAutoSpinRemaining] = useState<number | null>(null)
  const autoSpinRef = useRef(false)

  useEffect(() => {
    if (lastWin > 0 && !isSpinning) {
      if (reduceMotion) {
        setDisplayedWin(lastWin)
        return
      }
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
  }, [lastWin, isSpinning, fastMode, reduceMotion])

  const canSpin = (coins >= currentBet || freeSpins > 0) && !isSpinning

  const showBroke = coins < currentBet && freeSpins === 0

  // Auto spin loop: fires when a spin finishes while auto is active
  useEffect(() => {
    if (!autoSpinRef.current) return
    if (isSpinning) return
    if (autoSpinRemaining === null || autoSpinRemaining <= 0) {
      autoSpinRef.current = false
      setAutoSpinRemaining(null)
      return
    }
    // Stop conditions
    if (showBroke) {
      autoSpinRef.current = false
      setAutoSpinRemaining(null)
      Toast.show({ type: 'info', text1: 'Auto spin stopped', text2: 'Not enough coins.' })
      return
    }
    // Small delay between auto spins so reels have time to settle visually
    const t = setTimeout(() => {
      if (!autoSpinRef.current) return
      setAutoSpinRemaining((n) => (n != null && n > 1 ? n - 1 : null))
      if (autoSpinRemaining <= 1) autoSpinRef.current = false
      void spin()
    }, 600)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning])

  // Only bets the player has enough coins to unlock are navigable
  const unlockedBets = useMemo(
    () => BET_OPTIONS.filter((b) => isBetUnlocked(b, coins)),
    [coins],
  )

  // Next locked tier above the current unlocked range (for the hint label)
  const nextLockedBet = useMemo(() => {
    const maxUnlocked = unlockedBets[unlockedBets.length - 1] ?? BET_OPTIONS[0]
    const idx = BET_OPTIONS.indexOf(maxUnlocked)
    return idx >= 0 && idx < BET_OPTIONS.length - 1 ? BET_OPTIONS[idx + 1] : null
  }, [unlockedBets])

  const tryBetTarget = useMemo(() => {
    if (!showBroke) return null
    let best: number | null = null
    for (const opt of unlockedBets) {
      if (opt <= coins) best = opt
    }
    return best
  }, [showBroke, coins, unlockedBets])

  const startAutoSpin = useCallback((count: number) => {
    if (!canSpin) return
    setAutoSpinRemaining(count)
    autoSpinRef.current = true
    void spin()
  }, [canSpin, spin])

  const stopAutoSpin = useCallback(() => {
    autoSpinRef.current = false
    setAutoSpinRemaining(null)
  }, [])

  const handleTryBet = useCallback(() => {
    if (tryBetTarget == null) return
    setBet(tryBetTarget)
    betChange()
    betChangeSfx()
  }, [tryBetTarget, setBet, betChange, betChangeSfx])

  const goShop = useCallback(() => {
    router.push(routes.shop)
  }, [router])

  const goRewards = useCallback(() => {
    router.push(routes.rewards)
  }, [router])

  const runWatchVideo = useCallback(async () => {
    if (!canWatchAd()) {
      setRecoveryOpen(false)
      goRewards()
      return
    }
    setWatchVideoBusy(true)
    try {
      track(AnalyticsEvents.REWARDED_AD_STARTED)
      const earned = await watchAd()
      if (earned > 0) {
        addCoins(earned, { reason: 'rewarded_ad', label: 'Rewarded ad' })
        track(AnalyticsEvents.REWARDED_AD_COMPLETED, { reward_coins: earned })
        Toast.show({ type: 'success', text1: `+${earned} virtual coins` })
      }
      setRecoveryOpen(false)
    } finally {
      setWatchVideoBusy(false)
    }
  }, [addCoins, canWatchAd, goRewards, watchAd])

  const decreaseBet = () => {
    betChange()
    betChangeSfx()
    const i = unlockedBets.indexOf(currentBet)
    if (i > 0) setBet(unlockedBets[i - 1])
  }

  const increaseBet = () => {
    betChange()
    betChangeSfx()
    const i = unlockedBets.indexOf(currentBet)
    if (i >= 0 && i < unlockedBets.length - 1) setBet(unlockedBets[i + 1])
  }

  const setMaxBet = () => {
    maxBetHaptic()
    betChangeSfx()
    setBet(unlockedBets[unlockedBets.length - 1])
  }

  /** Jump to the nearest unlocked bet ≥ (currentBet × factor), clamped to max unlocked. */
  const jumpBetByFactor = useCallback((factor: number) => {
    betChange()
    betChangeSfx()
    const target = currentBet * factor
    const next = unlockedBets.find((b) => b >= target) ?? unlockedBets[unlockedBets.length - 1]
    setBet(next)
  }, [currentBet, unlockedBets, betChange, betChangeSfx, setBet])

  const topUnlockedBet = unlockedBets[unlockedBets.length - 1] ?? BET_OPTIONS[0]
  const atMaxUnlockedBet = currentBet === topUnlockedBet

  return (
    <View style={styles.wrap}>
      <View style={styles.quickRow}>
        <AppButton variant="ghost" size="sm" onPress={onOpenInfo} style={[styles.quickBtn, styles.quickBtnMuted]}>
          <FontAwesome name="info-circle" size={13} color={t.textMuted} />
          <Text style={{ color: t.textMuted, fontWeight: '600', fontSize: 11 }}>Info</Text>
        </AppButton>
        <AppButton variant="ghost" size="sm" onPress={onOpenLines} style={[styles.quickBtn, styles.quickBtnMuted]}>
          <FontAwesome name="th" size={13} color={t.textMuted} />
          <Text style={{ color: t.textMuted, fontWeight: '600', fontSize: 11 }}>Lines</Text>
        </AppButton>
        <AppButton
          variant="ghost"
          size="sm"
          accessibilityLabel="Fast"
          accessibilityHint="Speeds up the Last Win count-up only. Does not change reel speed."
          onPress={() => setFastMode((f) => !f)}
          style={[styles.quickBtn, styles.quickBtnMuted]}
        >
          <FontAwesome name="forward" size={13} color={fastMode ? t.primary : t.textMuted} />
          <Text style={{ color: fastMode ? t.primary : t.textMuted, fontWeight: '600', fontSize: 11 }}>
            Fast
          </Text>
        </AppButton>
        {/* Auto spin toggle */}
        {autoSpinRemaining != null ? (
          <AppButton
            variant="ghost"
            size="sm"
            accessibilityLabel="Stop auto spin"
            onPress={stopAutoSpin}
            style={styles.quickBtn}
          >
            <FontAwesome name="stop-circle" size={14} color={t.destructive} />
            <Text style={{ color: t.destructive, fontWeight: '700', fontSize: 12 }}>
              Stop ({autoSpinRemaining})
            </Text>
          </AppButton>
        ) : (
          <AppButton
            variant="ghost"
            size="sm"
            accessibilityLabel={`Auto spin ${AUTO_SPIN_DEFAULT} times with current bet`}
            accessibilityHint="Spins automatically until stopped or balance runs out."
            onPress={() => startAutoSpin(AUTO_SPIN_DEFAULT)}
            style={[styles.quickBtn, styles.quickBtnSecondary]}
            disabled={!canSpin}
          >
            <FontAwesome name="repeat" size={13} color={t.primary} />
            <Text style={{ color: t.primary, fontWeight: '700', fontSize: 11 }}>
              Auto
            </Text>
          </AppButton>
        )}
      </View>


      <View style={[styles.stats, { backgroundColor: hexWithAlpha(t.card, 'AA'), borderColor: hexWithAlpha(t.gold, '18') }]}>
        <FontAwesome name="history" size={10} color={t.textMuted} style={styles.statIcon} />
        <Text style={[styles.statCompact, { color: t.textMuted }]}>Last</Text>
        <Text style={[styles.statCompactVal, { color: lastWin > 0 ? t.win : t.textSecondary }]}>
          {`$${displayedWin.toLocaleString()}`}
        </Text>
        <Text style={[styles.statSep, { color: t.border }]}>|</Text>
        <FontAwesome name="refresh" size={11} color={t.textMuted} style={styles.statIcon} />
        <Text style={[styles.statCompact, { color: t.textMuted }]}>Spins</Text>
        <Text style={[styles.statCompactVal, { color: t.textPrimary }]}>{totalSpins}</Text>
        <Text style={[styles.statSep, { color: t.border }]}>|</Text>
        <FontAwesome name="trophy" size={11} color={hexWithAlpha(t.gold, 'AA')} style={styles.statIcon} />
        <Text style={[styles.statCompact, { color: t.textMuted }]}>Best</Text>
        <Text style={[styles.statCompactVal, { color: t.gold }]}>{`$${biggestWin.toLocaleString()}`}</Text>
      </View>

      <View style={[styles.panel, { borderColor: hexWithAlpha(t.gold, '40'), backgroundColor: t.cabinetBg }]}>
        <View style={styles.panelRow}>
          <View style={styles.panelSide}>
            <View style={styles.leftBetColumn}>
              <View
                style={[
                  styles.betCapsule,
                  {
                    borderColor: hexWithAlpha(t.gold, '44'),
                    backgroundColor: hexWithAlpha(t.surface, 'CC'),
                  },
                ]}
              >
                <View style={styles.betCluster}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Decrease bet"
                    disabled={isSpinning || autoSpinRemaining != null || currentBet === unlockedBets[0]}
                    onPress={decreaseBet}
                    style={({ pressed }) => [
                      styles.betStepBtn,
                      {
                        borderColor: hexWithAlpha(t.border, 'CC'),
                        backgroundColor: pressed
                          ? hexWithAlpha(t.primary, '14')
                          : hexWithAlpha(t.surface, '90'),
                      },
                      (isSpinning || autoSpinRemaining != null || currentBet === unlockedBets[0]) &&
                        styles.betStepBtnDisabled,
                    ]}
                  >
                    <FontAwesome name="minus" size={14} color={t.textPrimary} />
                  </Pressable>
                  <View style={styles.betMid}>
                    <Text style={[styles.betLabel, { color: t.textMuted }]}>Bet</Text>
                    <Text
                      style={[styles.betAmt, { color: t.textPrimary }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                      maxFontSizeMultiplier={1.2}
                    >
                      {formatBet(currentBet)}
                    </Text>
                    {nextLockedBet != null && currentBet === unlockedBets[unlockedBets.length - 1] ? (
                      <Text style={[styles.betUnlockHint, { color: t.gold }]} numberOfLines={1}>
                        {`🔒 ${formatBet(nextLockedBet)} · Need ${formatBet(coinGateForBet(nextLockedBet))}`}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Increase bet"
                    disabled={isSpinning || autoSpinRemaining != null || currentBet === unlockedBets[unlockedBets.length - 1]}
                    onPress={increaseBet}
                    style={({ pressed }) => [
                      styles.betStepBtn,
                      {
                        borderColor: hexWithAlpha(t.border, 'CC'),
                        backgroundColor: pressed
                          ? hexWithAlpha(t.primary, '14')
                          : hexWithAlpha(t.surface, '90'),
                      },
                      (isSpinning || autoSpinRemaining != null || currentBet === unlockedBets[unlockedBets.length - 1]) &&
                        styles.betStepBtnDisabled,
                    ]}
                  >
                    <FontAwesome name="plus" size={14} color={t.textPrimary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.multRowUnderBet}>
                {([2, 5, 10] as const).map((factor) => {
                  const target = unlockedBets.find((b) => b >= currentBet * factor)
                    ?? unlockedBets[unlockedBets.length - 1]
                  const alreadyAtMax = target === currentBet
                  return (
                    <Pressable
                      key={factor}
                      onPress={() => jumpBetByFactor(factor)}
                      disabled={isSpinning || autoSpinRemaining != null || alreadyAtMax}
                      style={({ pressed }) => [
                        styles.multChip,
                        {
                          borderColor: alreadyAtMax ? t.border : hexWithAlpha(t.gold, '40'),
                          backgroundColor: pressed && !alreadyAtMax
                            ? hexWithAlpha(t.gold, '14')
                            : hexWithAlpha(t.gold, '06'),
                          opacity: alreadyAtMax ? 0.35 : 1,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Multiply bet by ${factor}`}
                      accessibilityHint={`Jumps bet to ${formatBet(target)}`}
                    >
                      <Text style={[styles.multChipTxt, { color: alreadyAtMax ? t.textMuted : t.gold }]}>
                        ×{factor}
                      </Text>
                    </Pressable>
                  )
                })}
                <Pressable
                  onPress={setMaxBet}
                  disabled={isSpinning || autoSpinRemaining != null || atMaxUnlockedBet}
                  style={({ pressed }) => [
                    styles.multChip,
                    styles.maxChip,
                    {
                      borderColor: atMaxUnlockedBet ? t.border : hexWithAlpha(t.primary, '50'),
                      backgroundColor: pressed && !atMaxUnlockedBet
                        ? hexWithAlpha(t.primary, '18')
                        : hexWithAlpha(t.primary, '0C'),
                      opacity: atMaxUnlockedBet ? 0.35 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Max bet"
                  accessibilityHint={`Sets bet to ${formatBet(topUnlockedBet)}`}
                >
                  <Text style={[styles.multChipTxt, { color: atMaxUnlockedBet ? t.textMuted : t.primary, fontSize: 11 }]}>
                    Max
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.spinColumnRight}>
            <PressableSpin
              canSpin={canSpin}
              isSpinning={isSpinning}
              activeSpinIsFree={activeSpinIsFree}
              freeSpins={freeSpins}
              freeSpinMultiplier={freeSpinMultiplier}
              reduceMotion={reduceMotion}
              autoRemaining={autoSpinRemaining}
              onSpin={() => spin()}
              onBrokeTap={showBroke ? () => setRecoveryOpen(true) : undefined}
              onStopAuto={stopAutoSpin}
            />
          </View>
        </View>

        {showBroke ? (
          <View style={styles.warnBlock}>
            <Text style={[styles.warn, { color: t.textPrimary }]}>
              Not enough coins for this bet. Lower your bet, visit Shop, or claim rewards.
            </Text>
            <Text style={[styles.warnHint, { color: t.textMuted }]}>
              Rewards may include video bonuses and daily rewards.
            </Text>
            {tryBetTarget != null ? (
              <Pressable
                style={({ pressed }) => [
                  styles.tryBetChip,
                  {
                    borderColor: hexWithAlpha(t.primary, '55'),
                    backgroundColor: pressed ? hexWithAlpha(t.primary, '18') : hexWithAlpha(t.primary, '10'),
                  },
                ]}
                onPress={handleTryBet}
                accessibilityRole="button"
                accessibilityLabel={`Try bet ${formatBet(tryBetTarget!)}`}
              >
                <Text style={[styles.tryBetLbl, { color: t.primary }]}>Try Bet {formatBet(tryBetTarget!)}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.getCoinsBtn,
                {
                  borderColor: hexWithAlpha(t.gold, '66'),
                  backgroundColor: pressed ? hexWithAlpha(t.gold, '22') : hexWithAlpha(t.gold, '14'),
                },
              ]}
              onPress={() => setRecoveryOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Get coins"
            >
              <Text style={[styles.getCoinsLbl, { color: t.textPrimary }]}>Get Coins</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <BrokeRecoverySheet
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        onPressShop={goShop}
        onPressRewards={goRewards}
        showWatchVideo={canWatchAd()}
        onWatchVideo={runWatchVideo}
        watchVideoBusy={watchVideoBusy}
      />
    </View>
  )
}

function PressableSpin({
  canSpin,
  isSpinning,
  activeSpinIsFree,
  freeSpins,
  freeSpinMultiplier,
  reduceMotion,
  autoRemaining,
  onSpin,
  onBrokeTap,
  onStopAuto,
}: {
  canSpin: boolean
  isSpinning: boolean
  /** True while reels resolve for a spin that used a free spin at tap time. */
  activeSpinIsFree: boolean
  freeSpins: number
  /** Current free-spin streak multiplier (1–5). Badge is hidden when ≤ 1. */
  freeSpinMultiplier: number
  reduceMotion: boolean
  autoRemaining: number | null
  onSpin: () => void
  onBrokeTap?: () => void
  onStopAuto: () => void
}) {
  const t = useCasinoTheme()
  const { spinPress, insufficientCoins, freeSpinStreakAdvance } = useHaptics()
  const pressScale = useSharedValue(1)
  const spinPulse = useSharedValue(1)
  const readyGlow = useSharedValue(0.42)

  // ── Free-spin streak badge ───────────────────────────────────────────────
  const streakOpacity = useSharedValue(0)
  const streakScale = useSharedValue(1)

  const streakBadgeStyle = useAnimatedStyle(() => ({
    opacity: streakOpacity.value,
    transform: [{ scale: streakScale.value }],
  }))

  useEffect(() => {
    const active = freeSpins > 0 && freeSpinMultiplier > 1
    if (active) {
      streakOpacity.value = withTiming(1, { duration: 150 })
      if (!reduceMotion) {
        // Bump scale to signal the streak climbing
        streakScale.value = withSequence(
          withTiming(1.22, { duration: 110, easing: Easing.out(Easing.quad) }),
          withTiming(1.0, { duration: 200, easing: Easing.out(Easing.back(1.5)) }),
        )
      }
      // Haptic punch so the player feels the streak advancing (skipped at 1× — that's reset/start)
      freeSpinStreakAdvance(freeSpinMultiplier)
    } else {
      streakOpacity.value = withTiming(0, { duration: 200 })
      streakScale.value = withTiming(1, { duration: 150 })
    }
  }, [freeSpinMultiplier, freeSpins, reduceMotion, streakOpacity, streakScale, freeSpinStreakAdvance])
  // ────────────────────────────────────────────────────────────────────────

  const freeSpinHeartbeat =
    freeSpins > 0 && !isSpinning && !autoRemaining && canSpin

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(spinPulse)
      spinPulse.value = 1
      return
    }
    if (isSpinning) {
      spinPulse.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 650, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.98, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      )
      return
    }
    if (freeSpinHeartbeat) {
      // Lub–dub heartbeat + rest (reads as “alive” on the home CTA)
      spinPulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(1.0, { duration: 120, easing: Easing.in(Easing.quad) }),
          withTiming(1.06, { duration: 130, easing: Easing.out(Easing.quad) }),
          withTiming(1.0, { duration: 140, easing: Easing.in(Easing.quad) }),
          withTiming(1.0, { duration: 520 }),
        ),
        -1,
        false,
      )
      return
    }
    cancelAnimation(spinPulse)
    spinPulse.value = withTiming(1, { duration: 200 })
  }, [isSpinning, reduceMotion, spinPulse, freeSpinHeartbeat])

  useEffect(() => {
    if (reduceMotion) {
      readyGlow.value = freeSpinHeartbeat ? 0.62 : 0.45
      return
    }
    if (autoRemaining != null) {
      cancelAnimation(readyGlow)
      readyGlow.value = withTiming(0.42, { duration: 200 })
      return
    }
    if (freeSpinHeartbeat) {
      // Bright red halo pulse (synced roughly with heartbeat)
      readyGlow.value = withRepeat(
        withSequence(
          withTiming(0.92, { duration: 260, easing: Easing.out(Easing.quad) }),
          withTiming(0.48, { duration: 280, easing: Easing.in(Easing.quad) }),
          withTiming(0.88, { duration: 240, easing: Easing.out(Easing.quad) }),
          withTiming(0.44, { duration: 260, easing: Easing.in(Easing.quad) }),
          withTiming(0.44, { duration: 520 }),
        ),
        -1,
        false,
      )
      return
    }
    if (canSpin && !isSpinning) {
      readyGlow.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.38, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      )
    } else {
      cancelAnimation(readyGlow)
      readyGlow.value = withTiming(0.4, { duration: 200 })
    }
  }, [canSpin, isSpinning, reduceMotion, readyGlow, freeSpinHeartbeat, autoRemaining])

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * spinPulse.value }],
    opacity: canSpin || isSpinning ? 1 : 0.5,
  }))

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: readyGlow.value,
  }))

  const isAutoRunning = autoRemaining != null

  const handlePress = () => {
    // Tapping during auto spin stops it
    if (isAutoRunning) {
      onStopAuto()
      return
    }
    if (!canSpin) {
      if (!isSpinning) {
        insufficientCoins()
        onBrokeTap?.()
      }
      return
    }
    spinPress()
    pressScale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withTiming(1.0, { duration: 160, easing: Easing.out(Easing.back(2)) }),
    )
    onSpin()
  }

  const spinShadowColor = isAutoRunning
    ? t.destructive
    : freeSpinHeartbeat || (activeSpinIsFree && isSpinning)
      ? FREE_SPIN_CTA_RED
      : t.primary

  const showFreeSpinHero = freeSpins > 0 && !isSpinning && !isAutoRunning

  const labelColor = isAutoRunning
    ? '#fff'
    : freeSpins > 0
      ? '#FFFFFF'
      : t.spinButtonLabel

  const spinGradientColors: [string, string] | [string, string, string] = isAutoRunning
    ? [t.destructive, hexWithAlpha(t.destructive, 'CC')]
    : freeSpins > 0 && !isAutoRunning
      ? [FREE_SPIN_CTA_RED_HOT, FREE_SPIN_CTA_RED, FREE_SPIN_CTA_RED_DEEP]
      : activeSpinIsFree && isSpinning
        ? [hexWithAlpha(FREE_SPIN_CTA_RED, 'DD'), FREE_SPIN_CTA_RED_DEEP]
        : [t.spinButtonStart, t.spinButtonEnd]

  const spinGradientLocations: [number, number, number] | undefined =
    spinGradientColors.length === 3 ? [0, 0.45, 1] : undefined

  return (
    <View style={styles.spinWrapper}>
      {/* Free-spin streak multiplier badge — shown above button during active streak */}
      <Animated.View
        style={[
          styles.streakBadge,
          streakBadgeStyle,
          {
            backgroundColor: hexWithAlpha(t.freeSpin, '20'),
            borderColor: hexWithAlpha(t.freeSpin, '60'),
          },
        ]}
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        accessibilityLabel={
          freeSpins > 0 && freeSpinMultiplier > 1
            ? `Free spin streak: ${freeSpinMultiplier}x multiplier active`
            : undefined
        }
      >
        <Text style={styles.streakIcon}>🔥</Text>
        <Text style={[styles.streakTxt, { color: t.freeSpin }]}>
          {freeSpinMultiplier}×{freeSpinMultiplier >= 5 ? ' MAX' : ''}
        </Text>
      </Animated.View>

      <Pressable
        disabled={isSpinning && !isAutoRunning}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={
          isAutoRunning
            ? `Stop auto spin, ${autoRemaining} remaining`
            : isSpinning && activeSpinIsFree
              ? 'Reels spinning, free spin in progress'
              : isSpinning
                ? 'Reels spinning'
                : undefined
        }
      >
        <Animated.View
          style={[
            spinStyle,
            glowStyle,
            {
              width: SPIN_BUTTON_PX,
              height: SPIN_BUTTON_PX,
              borderRadius: SPIN_BUTTON_RADIUS,
              shadowColor: spinShadowColor,
              shadowOffset: { width: 0, height: freeSpinHeartbeat ? 8 : 6 },
              shadowRadius: freeSpinHeartbeat ? 18 : 14,
              elevation: freeSpinHeartbeat ? 12 : 10,
            },
          ]}
        >
          <LinearGradient
            colors={spinGradientColors}
            locations={spinGradientLocations}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.spinGradient, { borderRadius: SPIN_BUTTON_RADIUS }]}
          >
            {isAutoRunning ? (
              <View style={styles.spinAutoInner}>
                <FontAwesome name="repeat" size={13} color={labelColor} />
                <Text style={[styles.spinTextAuto, { color: labelColor }]}>
                  {autoRemaining}
                </Text>
              </View>
            ) : isSpinning ? (
              activeSpinIsFree ? (
                <View style={styles.spinLabelStack}>
                  <Text style={[styles.spinMain, { color: labelColor, fontSize: 15, letterSpacing: 0.5 }]}>
                    FREE SPIN
                  </Text>
                  <Text style={[styles.spinSub, { color: hexWithAlpha(labelColor, 'CC') }]}>
                    No coin cost
                  </Text>
                </View>
              ) : (
                <Text style={[styles.spinMain, { color: labelColor }]}>…</Text>
              )
            ) : (
              <View style={styles.spinLabelStack}>
                <Text style={[styles.spinMain, { color: labelColor }]}>SPIN</Text>
                {showFreeSpinHero ? (
                  <Text style={[styles.spinSub, { color: hexWithAlpha(labelColor, 'CC') }]}>
                    Free spin ready
                  </Text>
                ) : null}
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  )
}

/** Compact bet amount display: $1K, $1M, $100M, etc. */
function formatBet(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(0)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 10 },
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  quickBtn: { flexDirection: 'row', gap: 6 },
  quickBtnMuted: { opacity: 0.92 },
  quickBtnSecondary: { opacity: 1 },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  statIcon: { marginRight: 2 },
  statCompact: { fontSize: 10, fontWeight: '600', marginRight: 2 },
  statCompactVal: { fontSize: 12, fontWeight: '800', marginRight: 4 },
  statSep: { fontSize: 10, fontWeight: '400', marginHorizontal: 2 },
  panel: {
    borderWidth: 2,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 14,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  panelSide: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  /** Capped width: keeps the bet capsule compact on wide phones (no giant − / + span). */
  leftBetColumn: {
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 248,
    gap: 8,
  },
  betCapsule: {
    alignSelf: 'stretch',
    maxWidth: 248,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  betCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  betStepBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  betStepBtnDisabled: {
    opacity: 0.38,
  },
  betMid: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 62, paddingHorizontal: 2 },
  betLabel: { fontSize: 10, fontWeight: '600' },
  betAmt: { fontSize: 19, fontWeight: '900', textAlign: 'center', width: '100%' },
  betUnlockHint: { fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.2 },
  multRowUnderBet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: 248,
    gap: 6,
  },
  multChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  maxChip: { paddingHorizontal: 10 },
  multChipTxt: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  spinColumnRight: {
    width: SPIN_BUTTON_PX + 20,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  spinWrapper: {
    alignItems: 'center',
    gap: 4,
    maxWidth: SPIN_BUTTON_PX + 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  streakIcon: { fontSize: 11 },
  streakTxt: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  spinGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinLabelStack: { alignItems: 'center', justifyContent: 'center', gap: 1 },
  spinMain: {
    fontWeight: '900',
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 1,
  },
  spinSub: {
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 9,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  spinAutoInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  spinTextAuto: {
    fontWeight: '900',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 20,
  },
  warnBlock: { marginTop: 10, gap: 10, alignItems: 'stretch', width: '100%' },
  warn: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  warnHint: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 4,
  },
  tryBetChip: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  tryBetLbl: { fontWeight: '900', fontSize: 14 },
  getCoinsBtn: {
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getCoinsLbl: { fontWeight: '900', fontSize: 15 },
})
