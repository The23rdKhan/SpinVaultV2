import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import type { WinType } from '@/lib/game-context'
import { useGame } from '@/lib/game-context'
import { useAppearance } from '@/lib/appearance-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useHaptics } from '@/lib/use-haptics'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { hexWithAlpha } from '@/theme/tokens'
import { CelebrationParticles } from '@/components/animations/CelebrationParticles'
import { ShimmerSweep } from '@/components/animations/ShimmerSweep'
import { formatSubtleWinAccessibilityLabel, VAULT_COIN_MARK, getWinTypeDisplayTitle } from '@/lib/vault-copy'
import type { WinAnimationVariant } from '@/lib/win-animation-variants'

interface WinDisplayProps {
  show: boolean
  amount: number
  winType: WinType
  freeSpins: number
  /** XP from the completed spin (base + bonus meter bonus); 0 if none. */
  xpGained: number
  onClose?: () => void
  /** Optional celebration preset from `pickWinAnimationVariant` — visuals only. */
  animationVariant?: WinAnimationVariant | null
  onAnimationComplete?: () => void
  onAnimationSkip?: () => void
}

/** Jackpot skip button appears after this delay. */
const JACKPOT_SKIP_DELAY_MS = 2000
/** Minimum tap delay before dismiss registers for non-jackpot tiers. */
const MIN_TAP_DISMISS_MS = 400

/** Total return strictly under 1× line bet: compact result, no big “Win” celebration. */
const SUBTLE_WIN_MAX_MULTIPLIER = 1

/** Under-1× overlay: shorter, no particles, light blur. */
const SUBTLE_WIN_CONFIG = {
  duration: 820,
  blurIntensity: 10,
  particleCount: 0,
} as const

/** How soon the player may dismiss an under-1× result (ms). */
const SUBTLE_DISMISS_DELAY_MS = 120

const WIN_CONFIG: Record<
  Exclude<WinType, 'none'>,
  {
    title: string
    duration: number
    fullscreen: boolean
    particleCount: number
    blurIntensity: number
    cornerSparkles: boolean
  }
> = {
  normal: {
    title: getWinTypeDisplayTitle('normal'),
    duration: 1200,
    fullscreen: false,
    particleCount: 6,
    blurIntensity: 30,
    cornerSparkles: false,
  },
  bigWin: {
    title: getWinTypeDisplayTitle('bigWin'),
    duration: 3500,
    fullscreen: true,
    particleCount: 12,
    blurIntensity: 45,
    cornerSparkles: true,
  },
  megaWin: {
    title: getWinTypeDisplayTitle('megaWin'),
    duration: 4500,
    fullscreen: true,
    particleCount: 20,
    blurIntensity: 55,
    cornerSparkles: true,
  },
  jackpot: {
    title: getWinTypeDisplayTitle('jackpot'),
    duration: 8000,
    fullscreen: true,
    particleCount: 48,
    blurIntensity: 75,
    cornerSparkles: true,
  },
}

type WinTierConfig = (typeof WIN_CONFIG)[Exclude<WinType, 'none'>]

function isSubtleVaultWin(lineWin: boolean, winType: WinType, winMultiplier: number): boolean {
  return (
    lineWin &&
    winType === 'normal' &&
    winMultiplier > 0 &&
    winMultiplier < SUBTLE_WIN_MAX_MULTIPLIER
  )
}

function resolveWinDisplayCfg(winType: Exclude<WinType, 'none'>, subtle: boolean): WinTierConfig {
  if (subtle) return { ...WIN_CONFIG.normal, ...SUBTLE_WIN_CONFIG }
  return WIN_CONFIG[winType]
}

function resolveCelebrationDurationMs(
  cfg: WinTierConfig,
  animationVariant: WinAnimationVariant | null | undefined,
  reduceMotion: boolean,
  isSubtleWin: boolean,
): number {
  if (isSubtleWin) return cfg.duration
  if (!animationVariant) return cfg.duration
  return Math.max(520, Math.round(animationVariant.durationMs * (reduceMotion ? 0.6 : 1)))
}

function resolveParticleBudget(
  cfg: WinTierConfig,
  animationVariant: WinAnimationVariant | null | undefined,
  reduceMotion: boolean,
  isSubtleWin: boolean,
): number {
  if (isSubtleWin) return 0
  let n = cfg.particleCount
  if (animationVariant) {
    const fx = new Set(animationVariant.effects)
    if (fx.has('coinBurst')) n += 6
    if (fx.has('coinRain')) n += 14
    if (fx.has('confetti')) n += 10
    if (fx.has('jackpotBurst')) n += 12
    n = Math.min(52, n)
  }
  if (reduceMotion) n = Math.max(0, Math.floor(n * 0.45))
  return n
}

function resolveFullscreenLayout(
  cfg: WinTierConfig,
  animationVariant: WinAnimationVariant | null | undefined,
  isSubtleWin: boolean,
): boolean {
  if (isSubtleWin) return false
  if (!animationVariant) return cfg.fullscreen
  return animationVariant.overlayMode === 'fullScreen' || animationVariant.overlayMode === 'bonus'
}

function hasWinEffect(
  animationVariant: WinAnimationVariant | null | undefined,
  key: WinAnimationVariant['effects'][number],
): boolean {
  return Boolean(animationVariant?.effects.includes(key))
}

// ---------------------------------------------------------------------------
// Corner sparkle — pings scale/opacity 3×, staggered by position index.
// ---------------------------------------------------------------------------
function CornerSparkle({
  position,
  color,
  delay,
}: {
  position: { top?: number; bottom?: number; left?: number; right?: number }
  color: string
  delay: number
}) {
  const scale = useSharedValue(0.4)
  const opacity = useSharedValue(0)

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.4, { duration: 0 }),
          withTiming(2.8, { duration: 600, easing: Easing.out(Easing.quad) }),
        ),
        6,
        false,
      ),
    )
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 80 }),
          withTiming(0, { duration: 540, easing: Easing.out(Easing.quad) }),
        ),
        6,
        false,
      ),
    )
    return () => {
      cancelAnimation(scale)
      cancelAnimation(opacity)
    }
  }, [scale, opacity, delay])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <View style={[styles.cornerOuter, position]} pointerEvents="none">
      <Animated.View style={[styles.cornerDot, { backgroundColor: color }, style]} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Jackpot breakdown card — slides in showing bonus vs. line wins
// ---------------------------------------------------------------------------
function JackpotBreakdown({
  total,
  jackpotBonus,
  accentColor,
  borderColor,
}: {
  total: number
  jackpotBonus: number
  accentColor: string
  borderColor: string
}) {
  const t = useCasinoTheme()
  const lineWins = Math.max(0, total - jackpotBonus)
  return (
    <Animated.View
      entering={FadeInDown.delay(1200).duration(500)}
      style={[styles.breakdown, { borderColor }]}
    >
      <View style={styles.breakdownRow}>
        <Text style={[styles.breakdownLabel, { color: t.textSecondary }]}>🎰  Jackpot Bonus</Text>
        <Text style={[styles.breakdownVal, { color: accentColor }]}>
          ${jackpotBonus.toLocaleString()}
        </Text>
      </View>
      {lineWins > 0 ? (
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: t.textSecondary }]}>🎲  Line Wins</Text>
          <Text style={[styles.breakdownVal, { color: t.win }]}>
            ${lineWins.toLocaleString()}
          </Text>
        </View>
      ) : null}
      <View style={[styles.breakdownDivider, { backgroundColor: borderColor }]} />
      <View style={styles.breakdownRow}>
        <Text style={[styles.breakdownTotal, { color: t.textPrimary }]}>Total Win</Text>
        <Text style={[styles.breakdownTotalVal, { color: accentColor }]}>
          ${total.toLocaleString()}
        </Text>
      </View>
    </Animated.View>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function WinDisplay({
  show,
  amount,
  winType,
  freeSpins,
  xpGained,
  onClose,
  animationVariant = null,
  onAnimationComplete,
  onAnimationSkip,
}: WinDisplayProps) {
  const t = useCasinoTheme()
  const { resolvedMode } = useAppearance()
  const { winMultiplier, lastJackpotBonus, lastMysteryMultiplier, lastFreeSpinMultiplier } = useGame()
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const [displayAmount, setDisplayAmount] = useState(0)
  const [allowDismiss, setAllowDismiss] = useState(false)
  const [showSkip, setShowSkip] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onAnimationCompleteRef = useRef(onAnimationComplete)
  onAnimationCompleteRef.current = onAnimationComplete
  const onAnimationSkipRef = useRef(onAnimationSkip)
  onAnimationSkipRef.current = onAnimationSkip
  /** True after skip or auto-finish so timers do not double-fire parent cleanup (`onClose` / callbacks). */
  const celebrationSettledRef = useRef(false)
  const { winFeedback, freeSpinsAwarded } = useHaptics()

  const cardScale = useSharedValue(0.72)
  const cardOpacity = useSharedValue(0)
  const flashOpacity = useSharedValue(0)
  const shakeX = useSharedValue(0)
  const neonPulse = useSharedValue(0)
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }))

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }))

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }))

  const neonBorderStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.15 + neonPulse.value * 0.55,
    shadowRadius: 8 + neonPulse.value * 18,
  }))

  const spinsOnly = amount <= 0 && freeSpins > 0 && winType !== 'none'
  const lineWin = amount > 0 && winType !== 'none'
  const isJackpotTier = winType === 'jackpot'

  const requestClose = () => {
    if (!allowDismiss) return
    if (!celebrationSettledRef.current) {
      celebrationSettledRef.current = true
      onAnimationSkipRef.current?.()
    }
    setVisible(false)
    setShowSkip(false)
    onCloseRef.current?.()
  }

  useEffect(() => {
    const lineWin = amount > 0 && winType !== 'none'
    const spinsOnlyInner = amount <= 0 && freeSpins > 0 && winType !== 'none'
    const isJackpotTierInner = winType === 'jackpot'

    if (!show || winType === 'none' || (!lineWin && !spinsOnlyInner)) {
      setVisible(false)
      setDisplayAmount(0)
      setAllowDismiss(false)
      setShowSkip(false)
      return
    }

    const isSubtleWin = isSubtleVaultWin(lineWin, winType, winMultiplier)
    const cfg = resolveWinDisplayCfg(winType as Exclude<WinType, 'none'>, isSubtleWin)
    const celebrationDuration = resolveCelebrationDurationMs(
      cfg,
      animationVariant,
      reduceMotion,
      isSubtleWin,
    )

    setVisible(true)
    setAllowDismiss(false)
    setShowSkip(false)
    celebrationSettledRef.current = false

    let bounceTimeout: ReturnType<typeof setTimeout> | undefined

    if (reduceMotion) {
      cardScale.value = 1
      cardOpacity.value = 1
    } else if (isSubtleWin) {
      cardScale.value = 0.94
      cardOpacity.value = 0
      cardOpacity.value = withTiming(1, { duration: 200 })
      cardScale.value = withSpring(1, { damping: 18, stiffness: 220 })
    } else {
      cardScale.value = 0.72
      cardOpacity.value = 0
      cardScale.value = withSpring(1, { damping: 14, stiffness: 200 })
      cardOpacity.value = withTiming(1, { duration: 180 })
      if (winType !== 'normal') {
        bounceTimeout = setTimeout(() => {
          cardScale.value = withSequence(
            withTiming(1.07, { duration: 180, easing: Easing.out(Easing.quad) }),
            withSpring(1.0, { damping: 12 }),
          )
        }, 320)
      }
    }

    const fxFlash =
      !reduceMotion &&
      animationVariant &&
      hasWinEffect(animationVariant, 'screenFlash') &&
      (animationVariant.intensity === 'high' || animationVariant.intensity === 'legendary')
    if (fxFlash) {
      flashOpacity.value = 0
      flashOpacity.value = withSequence(
        withTiming(0.38, { duration: 70, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }),
      )
    } else {
      cancelAnimation(flashOpacity)
      flashOpacity.value = 0
    }

    const fxShake =
      !reduceMotion && animationVariant && hasWinEffect(animationVariant, 'screenShake')
    if (fxShake) {
      shakeX.value = withSequence(
        withTiming(5, { duration: 36 }),
        withTiming(-5, { duration: 36 }),
        withTiming(3, { duration: 36 }),
        withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) }),
      )
    } else {
      cancelAnimation(shakeX)
      shakeX.value = 0
    }

    if (!reduceMotion && animationVariant && hasWinEffect(animationVariant, 'neonPulse')) {
      neonPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) }),
        ),
        5,
        false,
      )
    } else {
      cancelAnimation(neonPulse)
      neonPulse.value = 0
    }

    if (spinsOnlyInner) {
      // TODO: alternate free-spin stinger per `animationVariant?.id` when additional `expo-assets` are added.
      freeSpinsAwarded()
    } else {
      // TODO: map `animationVariant?.id` + `winType` to tiered win SFX without stacking multiple win sounds.
      winFeedback(winType, {
        winMultiplier: winType === 'normal' ? winMultiplier : undefined,
        celebrationIntensity: animationVariant?.intensity,
      })
    }

    const tierSkippable =
      winType === 'bigWin' ||
      winType === 'megaWin' ||
      winType === 'jackpot' ||
      animationVariant?.winType === 'bonusTrigger'

    let dismissDelay = isJackpotTierInner ? JACKPOT_SKIP_DELAY_MS : isSubtleWin ? SUBTLE_DISMISS_DELAY_MS : MIN_TAP_DISMISS_MS
    if (animationVariant && tierSkippable) {
      dismissDelay = Math.max(MIN_TAP_DISMISS_MS, animationVariant.skippableAfterMs)
    }

    const showSkipButtonTier =
      isJackpotTierInner || winType === 'megaWin' || winType === 'bigWin' || animationVariant?.winType === 'bonusTrigger'

    const dismissGate = setTimeout(() => {
      setAllowDismiss(true)
      if (showSkipButtonTier) setShowSkip(true)
    }, dismissDelay)

    if (amount <= 0) {
      setDisplayAmount(0)
      const closeTimeout = setTimeout(() => {
        const alreadyHandled = celebrationSettledRef.current
        if (!alreadyHandled) {
          celebrationSettledRef.current = true
          onAnimationCompleteRef.current?.()
        }
        setVisible(false)
        setShowSkip(false)
        if (!alreadyHandled) {
          onCloseRef.current?.()
        }
      }, celebrationDuration)
      return () => {
        clearTimeout(dismissGate)
        clearTimeout(closeTimeout)
        if (bounceTimeout) clearTimeout(bounceTimeout)
        cancelAnimation(cardScale)
        cancelAnimation(cardOpacity)
        cancelAnimation(flashOpacity)
        cancelAnimation(shakeX)
        cancelAnimation(neonPulse)
      }
    }

    setDisplayAmount(0)
    let interval: ReturnType<typeof setInterval> | undefined
    if (reduceMotion) {
      setDisplayAmount(amount)
    } else {
      const countDuration = isJackpotTierInner
        ? 3000
        : isSubtleWin
          ? celebrationDuration * 0.12
          : celebrationDuration * 0.4
      const tickMs = Math.max(16, countDuration / 60)
      const steps = Math.round(countDuration / tickMs)
      const increment = amount / steps
      let current = 0
      interval = setInterval(() => {
        current += increment
        if (current >= amount) {
          setDisplayAmount(amount)
          clearInterval(interval!)
        } else {
          setDisplayAmount(Math.floor(current))
        }
      }, tickMs)
    }

    const closeTimeout = setTimeout(() => {
      const alreadyHandled = celebrationSettledRef.current
      if (!alreadyHandled) {
        celebrationSettledRef.current = true
        onAnimationCompleteRef.current?.()
      }
      setVisible(false)
      setShowSkip(false)
      if (!alreadyHandled) {
        onCloseRef.current?.()
      }
    }, celebrationDuration)

    return () => {
      clearTimeout(dismissGate)
      if (bounceTimeout) clearTimeout(bounceTimeout)
      if (interval) clearInterval(interval)
      clearTimeout(closeTimeout)
      cancelAnimation(cardScale)
      cancelAnimation(cardOpacity)
      cancelAnimation(flashOpacity)
      cancelAnimation(shakeX)
      cancelAnimation(neonPulse)
    }
  }, [
    show,
    amount,
    winType,
    winMultiplier,
    freeSpins,
    winFeedback,
    freeSpinsAwarded,
    reduceMotion,
    animationVariant,
  ])

  if (!visible || winType === 'none') return null

  const isSubtleWin = isSubtleVaultWin(lineWin, winType, winMultiplier)
  const cfg = resolveWinDisplayCfg(winType as Exclude<WinType, 'none'>, isSubtleWin)
  const celebrationDuration = resolveCelebrationDurationMs(
    cfg,
    animationVariant,
    reduceMotion,
    isSubtleWin,
  )
  const particleBudget = resolveParticleBudget(cfg, animationVariant, reduceMotion, isSubtleWin)
  const overlayMode = animationVariant?.overlayMode
  const isCompactWin = overlayMode === 'compact'
  const isBonusWin = overlayMode === 'bonus'

  const accentColor = isSubtleWin
    ? t.textSecondary
    : winType === 'jackpot'
      ? t.gold
      : winType === 'megaWin'
        ? t.jackpot
        : winType === 'bigWin'
          ? t.win
          : t.primary

  const particleColors =
    winType === 'jackpot'
      ? [t.gold, t.primary, hexWithAlpha(t.gold, 'CC'), t.accent, '#FFD700', '#FFC500']
      : winType === 'megaWin'
        ? [t.jackpot, t.win, t.gold, t.accent]
        : winType === 'bigWin'
          ? [t.win, t.primary, t.accent, t.freeSpin]
          : [t.primary, t.win]

  const headlineFromVariant = animationVariant?.headline
  const titleText = spinsOnly
    ? headlineFromVariant ?? 'Free Spins'
    : isSubtleWin
      ? ''
      : headlineFromVariant ?? cfg.title

  const isFullscreen = resolveFullscreenLayout(cfg, animationVariant, isSubtleWin)
  const isHighTier = winType === 'megaWin' || winType === 'jackpot'
  const blurTint = resolvedMode === 'dark' ? 'dark' : 'light'
  const blurIntensity = Math.round(
    isCompactWin ? Math.min(26, cfg.blurIntensity * 0.82) : cfg.blurIntensity,
  )

  const showSpotlight =
    animationVariant && hasWinEffect(animationVariant, 'spotlight') && !isSubtleWin && !reduceMotion
  const showVaultRow = animationVariant && hasWinEffect(animationVariant, 'vaultOpen') && !isSubtleWin
  const showPortalRow = animationVariant && hasWinEffect(animationVariant, 'portalOpen') && !isSubtleWin
  const showTreasureRow = animationVariant && hasWinEffect(animationVariant, 'treasureBurst') && !isSubtleWin
  const shimmerFx =
    animationVariant &&
    (hasWinEffect(animationVariant, 'sparkleSweep') || isFullscreen || isJackpotTier)

  const cornerSparkleTier =
    (cfg.cornerSparkles || (animationVariant && hasWinEffect(animationVariant, 'jackpotBurst'))) &&
    !reduceMotion

  const gradientColors: [string, string] =
    winType === 'jackpot'
      ? [hexWithAlpha(t.gold, '30'), hexWithAlpha(t.surfaceElevated, 'FF')]
      : winType === 'megaWin'
        ? [hexWithAlpha(t.jackpot, '22'), hexWithAlpha(t.surfaceElevated, 'FF')]
        : [t.surfaceElevated, t.surfaceElevated]

  const subtleMultLabel = `${Number(winMultiplier.toFixed(4))}×`

  const neonGlowOnCard = Boolean(
    animationVariant && hasWinEffect(animationVariant, 'neonPulse') && !isSubtleWin,
  )
  const prominentSkipTier =
    isJackpotTier || winType === 'megaWin' || winType === 'bigWin' || animationVariant?.winType === 'bonusTrigger'

  const inner = (
    <Animated.View style={shakeStyle}>
      <Animated.View style={[cardStyle, neonGlowOnCard && neonBorderStyle]}>
        <Pressable
          style={[
            styles.card,
            { borderColor: accentColor },
            isSubtleWin && styles.cardSubtle,
            isCompactWin && !isFullscreen && styles.cardCompact,
            (isFullscreen || isBonusWin) && styles.cardFs,
            isBonusWin && {
              borderColor: hexWithAlpha(t.freeSpin, '90'),
              backgroundColor: hexWithAlpha(t.freeSpin, '08'),
            },
            isHighTier && {
              borderWidth: 2.5,
              shadowColor: accentColor,
              shadowOpacity: 0.55,
              shadowRadius: 18,
              elevation: 12,
            },
            neonGlowOnCard && {
              shadowColor: t.primary,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
          onPress={requestClose}
          accessibilityRole="button"
          accessibilityLabel={
            spinsOnly
              ? 'Free Spins awarded'
              : isSubtleWin
                ? formatSubtleWinAccessibilityLabel(amount, winMultiplier)
                : lineWin
                  ? 'Win'
                  : 'Result'
          }
          accessibilityHint={allowDismiss ? 'Tap to dismiss' : 'Please wait'}
        >
          {isFullscreen ? (
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
          ) : null}

          {isSubtleWin && !spinsOnly ? (
            <>
              <View style={styles.subtleRow}>
                <Text style={[styles.subtleMark, { color: t.textMuted }]}>{VAULT_COIN_MARK}</Text>
                <Text style={[styles.subtleAmt, { color: t.textPrimary }]}>
                  ${displayAmount.toLocaleString()}
                </Text>
              </View>
              <Text style={[styles.subtleMeta, { color: t.textMuted }]}>
                {subtleMultLabel} return vs line bet
              </Text>
            </>
          ) : (
            <>
              {titleText ? (
                <Text
                  style={[
                    styles.title,
                    { color: accentColor },
                    isCompactWin && styles.titleCompact,
                    winType === 'jackpot' && styles.titleMega,
                    winType === 'megaWin' && styles.titleJackpot,
                  ]}
                >
                  {titleText}
                </Text>
              ) : null}

              {animationVariant?.subheadline ? (
                <Text style={[styles.subhead, { color: hexWithAlpha(accentColor, 'CC') }]}>
                  {animationVariant.subheadline}
                </Text>
              ) : null}

              {showVaultRow ? (
                <Text style={[styles.fxRow, { color: t.gold }]}>🏛️  Vault opening — coins incoming</Text>
              ) : null}
              {showPortalRow ? (
                <Text style={[styles.fxRow, { color: t.primary }]}>🌀  Bonus portal charged</Text>
              ) : null}
              {showTreasureRow ? (
                <Text style={[styles.fxRow, { color: t.gold }]}>📦  Treasure burst</Text>
              ) : null}

              {winMultiplier > 0 && amount > 0 && winType !== 'jackpot' ? (
                <Text style={[styles.multiplier, { color: accentColor }]}>
                  {winMultiplier % 1 === 0 ? winMultiplier : winMultiplier.toFixed(1)}x
                </Text>
              ) : null}

              {amount > 0 ? (
                isFullscreen || (shimmerFx && !reduceMotion) ? (
                  <ShimmerSweep
                    active={visible}
                    passes={isJackpotTier ? 6 : isFullscreen ? 3 : 2}
                    startDelay={isFullscreen ? 500 : 120}
                    shimmerColor="rgba(255,255,255,0.38)"
                  >
                    <Text style={[styles.amt, { color: accentColor }, isJackpotTier && styles.amtJackpot]}>
                      ${displayAmount.toLocaleString()}
                    </Text>
                    <Text style={[styles.amtSub, { color: hexWithAlpha(accentColor, '99') }]}>
                      virtual coins
                    </Text>
                  </ShimmerSweep>
                ) : (
                  <Text style={[styles.amt, { color: accentColor }]}>
                    ${displayAmount.toLocaleString()} virtual coins
                  </Text>
                )
              ) : null}
            </>
          )}

          {/* Free spin streak multiplier badge */}
          {lastFreeSpinMultiplier > 1 && amount > 0 ? (
            <Animated.View
              entering={FadeInDown.delay(300).duration(400)}
              style={[styles.mysteryBadge, { borderColor: hexWithAlpha(t.freeSpin, '60'), backgroundColor: hexWithAlpha(t.freeSpin, '18') }]}
            >
              <Text style={styles.mysteryIcon}>🔥</Text>
              <Text style={[styles.mysteryText, { color: t.freeSpin }]}>
                {lastFreeSpinMultiplier}× Free Spin Streak
              </Text>
            </Animated.View>
          ) : null}

          {/* Mystery Multiplier reveal badge */}
          {lastMysteryMultiplier != null && amount > 0 ? (
            <Animated.View
              entering={FadeInDown.delay(600).duration(400)}
              style={[styles.mysteryBadge, { borderColor: hexWithAlpha(accentColor, '50'), backgroundColor: hexWithAlpha(accentColor, '15') }]}
            >
              <Text style={[styles.mysteryIcon]}>✨</Text>
              <Text style={[styles.mysteryText, { color: accentColor }]}>
                {lastMysteryMultiplier}× Mystery Multiplier
              </Text>
            </Animated.View>
          ) : null}

          {/* Jackpot breakdown — slides in after count-up */}
          {isJackpotTier && amount > 0 && lastJackpotBonus > 0 ? (
            <JackpotBreakdown
              total={amount}
              jackpotBonus={lastJackpotBonus}
              accentColor={accentColor}
              borderColor={hexWithAlpha(accentColor, '30')}
            />
          ) : null}

          {freeSpins > 0 ? (
            <Text style={[styles.fsBonus, { color: t.freeSpin }]}>
              {spinsOnly ? `${freeSpins} Free Spins awarded!` : `+${freeSpins} Free Spins`}
            </Text>
          ) : null}

          {xpGained > 0 ? (
            <Animated.View
              entering={FadeInDown.delay(isSubtleWin ? 90 : 180).duration(380)}
              style={[
                styles.xpBadge,
                {
                  borderColor: hexWithAlpha(t.primary, '55'),
                  backgroundColor: hexWithAlpha(t.primary, '12'),
                },
              ]}
              accessibilityRole="text"
              accessibilityLabel={`${xpGained} experience gained`}
            >
              <Text style={[styles.xpBadgeIcon]}>✦</Text>
              <Text style={[styles.xpBadgeTxt, { color: t.primary }]}>+{xpGained.toLocaleString()} XP</Text>
            </Animated.View>
          ) : null}

          {/* Skip / continue hint */}
          {prominentSkipTier ? (
            showSkip ? (
              <Pressable
                onPress={requestClose}
                style={[styles.skipBtn, { borderColor: hexWithAlpha(accentColor, '50') }]}
                accessibilityRole="button"
                accessibilityLabel="Skip celebration"
              >
                <Text style={[styles.skipTxt, { color: t.textSecondary }]}>Skip</Text>
              </Pressable>
            ) : (
              <Text style={[styles.hint, { color: t.textSecondary }]}> </Text>
            )
          ) : isFullscreen ? (
            <Text style={[styles.hint, { color: t.textSecondary }]}>Tap to continue</Text>
          ) : !isFullscreen && lineWin && allowDismiss ? (
            <Text style={[styles.hint, { color: t.textSecondary }, isSubtleWin && styles.hintSubtle]}>
              {isSubtleWin ? 'Tap to close' : 'Tap to skip'}
            </Text>
          ) : null}
        </Pressable>
      </Animated.View>
    </Animated.View>
  )

  if (!isFullscreen) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        {showSpotlight ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient
              colors={[hexWithAlpha(accentColor, '38'), 'transparent', hexWithAlpha(accentColor, '18')]}
              locations={[0, 0.42, 1]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>
        ) : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isSubtleWin ? hexWithAlpha(t.overlay, '55') : t.overlay },
          ]}
        >
          <BlurView
            intensity={blurIntensity}
            tint={blurTint}
            blurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
        </View>
        {animationVariant && hasWinEffect(animationVariant, 'screenFlash') && !reduceMotion ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }, flashStyle]}
          />
        ) : null}
        {particleBudget > 0 ? (
          <CelebrationParticles
            count={particleBudget}
            colors={particleColors}
            duration={celebrationDuration}
          />
        ) : null}
        <View style={styles.center}>{inner}</View>
      </Modal>
    )
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      {showSpotlight ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <LinearGradient
            colors={[hexWithAlpha(accentColor, '40'), 'transparent', hexWithAlpha(accentColor, '20')]}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>
      ) : null}
      {/* Blurred backdrop */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}>
        <BlurView
          intensity={blurIntensity}
          tint={blurTint}
          blurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      </View>

      {animationVariant && hasWinEffect(animationVariant, 'screenFlash') && !reduceMotion ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }, flashStyle]}
        />
      ) : null}

      {/* Particles behind content */}
      {particleBudget > 0 ? (
        <CelebrationParticles
          count={particleBudget}
          colors={particleColors}
          duration={celebrationDuration}
        />
      ) : null}

      {/* Corner sparkles — 8 for jackpot, 4 for others */}
      {cornerSparkleTier ? (
        <>
          <CornerSparkle position={{ top: 48, left: 24 }} color={accentColor} delay={0} />
          <CornerSparkle position={{ top: 48, right: 24 }} color={accentColor} delay={180} />
          <CornerSparkle position={{ bottom: 80, left: 24 }} color={accentColor} delay={90} />
          <CornerSparkle position={{ bottom: 80, right: 24 }} color={accentColor} delay={270} />
          {isJackpotTier ? (
            <>
              <CornerSparkle position={{ top: 160, left: 12 }} color={t.primary} delay={350} />
              <CornerSparkle position={{ top: 160, right: 12 }} color={t.primary} delay={450} />
              <CornerSparkle position={{ bottom: 200, left: 12 }} color={t.accent} delay={550} />
              <CornerSparkle position={{ bottom: 200, right: 12 }} color={t.accent} delay={650} />
            </>
          ) : null}
        </>
      ) : null}

      <Pressable
        style={styles.fsBackdrop}
        onPress={requestClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss win overlay"
        accessibilityHint={allowDismiss ? 'Tap to dismiss' : 'Please wait'}
      >
        <View style={styles.center}>{inner}</View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fsBackdrop: { flex: 1 },
  card: {
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
    minWidth: 220,
    overflow: 'hidden',
  },
  cardSubtle: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    minWidth: 200,
    gap: 4,
  },
  cardFs: {
    paddingVertical: 36,
    paddingHorizontal: 40,
    minWidth: 280,
  },
  cardCompact: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 200,
    maxWidth: 320,
  },
  titleCompact: {
    fontSize: 22,
    letterSpacing: 0.3,
  },
  subhead: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -2,
    letterSpacing: 0.4,
  },
  fxRow: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    opacity: 0.92,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  titleJackpot: {
    fontSize: 32,
    letterSpacing: 1.5,
  },
  titleMega: {
    fontSize: 38,
    letterSpacing: 2.5,
  },
  multiplier: {
    fontSize: 20,
    fontWeight: '800',
    opacity: 0.85,
  },
  subtleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  subtleMark: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtleAmt: {
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  subtleMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  amt: {
    fontSize: 44,
    fontWeight: '900',
    textAlign: 'center',
  },
  amtJackpot: {
    fontSize: 52,
    letterSpacing: 1,
  },
  amtSub: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -4,
  },
  fsBonus: {
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  xpBadgeIcon: {
    fontSize: 12,
    opacity: 0.9,
  },
  xpBadgeTxt: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  hint: {
    marginTop: 16,
    fontSize: 13,
  },
  hintSubtle: {
    marginTop: 10,
    fontSize: 12,
  },
  cornerOuter: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  // Jackpot breakdown card
  breakdown: {
    marginTop: 12,
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.4,
    marginVertical: 2,
  },
  breakdownTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownTotalVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  // Mystery Multiplier badge
  mysteryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  mysteryIcon: { fontSize: 16 },
  mysteryText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  // Skip button for jackpot
  skipBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  skipTxt: {
    fontSize: 13,
    fontWeight: '600',
  },
})
