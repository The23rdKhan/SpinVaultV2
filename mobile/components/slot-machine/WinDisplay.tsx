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

interface WinDisplayProps {
  show: boolean
  amount: number
  winType: WinType
  freeSpins: number
  onClose?: () => void
}

/** Jackpot skip button appears after this delay. */
const JACKPOT_SKIP_DELAY_MS = 2000
/** Minimum tap delay before dismiss registers for non-jackpot tiers. */
const MIN_TAP_DISMISS_MS = 400

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
    title: 'Win',
    duration: 1200,
    fullscreen: false,
    particleCount: 6,
    blurIntensity: 30,
    cornerSparkles: false,
  },
  bigWin: {
    title: 'Big Win',
    duration: 3500,
    fullscreen: true,
    particleCount: 12,
    blurIntensity: 45,
    cornerSparkles: true,
  },
  megaWin: {
    title: 'Mega Win',
    duration: 4500,
    fullscreen: true,
    particleCount: 20,
    blurIntensity: 55,
    cornerSparkles: true,
  },
  jackpot: {
    title: 'Mega Jackpot',
    duration: 8000,
    fullscreen: true,
    particleCount: 48,
    blurIntensity: 75,
    cornerSparkles: true,
  },
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
export function WinDisplay({ show, amount, winType, freeSpins, onClose }: WinDisplayProps) {
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
  const { winFeedback, freeSpinsAwarded } = useHaptics()

  const cardScale = useSharedValue(0.72)
  const cardOpacity = useSharedValue(0)
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }))

  const spinsOnly = amount <= 0 && freeSpins > 0 && winType !== 'none'
  const lineWin = amount > 0 && winType !== 'none'
  const isJackpotTier = winType === 'jackpot'

  const requestClose = () => {
    if (!allowDismiss) return
    setVisible(false)
    setShowSkip(false)
    onCloseRef.current?.()
  }

  useEffect(() => {
    if (!show || winType === 'none' || (!lineWin && !spinsOnly)) {
      setVisible(false)
      setDisplayAmount(0)
      setAllowDismiss(false)
      setShowSkip(false)
      return
    }

    const cfg = WIN_CONFIG[winType as Exclude<WinType, 'none'>]
    setVisible(true)
    setAllowDismiss(false)
    setShowSkip(false)

    if (reduceMotion) {
      cardScale.value = 1
      cardOpacity.value = 1
    } else {
      cardScale.value = 0.72
      cardOpacity.value = 0
      cardScale.value = withSpring(1, { damping: 14, stiffness: 200 })
      cardOpacity.value = withTiming(1, { duration: 180 })
      if (winType !== 'normal') {
        setTimeout(() => {
          cardScale.value = withSequence(
            withTiming(1.07, { duration: 180, easing: Easing.out(Easing.quad) }),
            withSpring(1.0, { damping: 12 }),
          )
        }, 320)
      }
    }

    if (spinsOnly) {
      freeSpinsAwarded()
    } else {
      winFeedback(winType)
    }

    // Jackpot: skip button after JACKPOT_SKIP_DELAY_MS, dismiss allowed immediately after
    // Other tiers: dismiss after MIN_TAP_DISMISS_MS
    const dismissDelay = isJackpotTier ? JACKPOT_SKIP_DELAY_MS : MIN_TAP_DISMISS_MS
    const dismissGate = setTimeout(() => {
      setAllowDismiss(true)
      if (isJackpotTier) setShowSkip(true)
    }, dismissDelay)

    if (amount <= 0) {
      setDisplayAmount(0)
      const closeTimeout = setTimeout(() => {
        setVisible(false)
        onCloseRef.current?.()
      }, cfg.duration)
      return () => {
        clearTimeout(dismissGate)
        clearTimeout(closeTimeout)
      }
    }

    setDisplayAmount(0)
    let interval: ReturnType<typeof setInterval> | undefined
    if (reduceMotion) {
      setDisplayAmount(amount)
    } else {
      // Jackpot counter runs over 3s for dramatic effect, capped at total duration
      const countDuration = isJackpotTier ? 3000 : cfg.duration * 0.4
      const tickMs = Math.max(16, Math.min(countDuration, countDuration) / 60)
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
      setVisible(false)
      setShowSkip(false)
      onCloseRef.current?.()
    }, cfg.duration)

    return () => {
      clearTimeout(dismissGate)
      if (interval) clearInterval(interval)
      clearTimeout(closeTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, amount, winType, winFeedback, freeSpinsAwarded, reduceMotion])

  if (!visible || winType === 'none') return null

  const cfg = WIN_CONFIG[winType as Exclude<WinType, 'none'>]

  const accentColor =
    winType === 'jackpot'
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

  const titleText = spinsOnly ? 'Free Spins' : cfg.title

  const isFullscreen = cfg.fullscreen
  const isHighTier = winType === 'megaWin' || winType === 'jackpot'
  const blurTint = resolvedMode === 'dark' ? 'dark' : 'light'

  const gradientColors: [string, string] =
    winType === 'jackpot'
      ? [hexWithAlpha(t.gold, '30'), hexWithAlpha(t.surfaceElevated, 'FF')]
      : winType === 'megaWin'
        ? [hexWithAlpha(t.jackpot, '22'), hexWithAlpha(t.surfaceElevated, 'FF')]
        : [t.surfaceElevated, t.surfaceElevated]

  const inner = (
    <Animated.View style={cardStyle}>
      <Pressable
        style={[
          styles.card,
          { borderColor: accentColor },
          isFullscreen && styles.cardFs,
          isHighTier && {
            borderWidth: 2.5,
            shadowColor: accentColor,
            shadowOpacity: 0.55,
            shadowRadius: 18,
            elevation: 12,
          },
        ]}
        onPress={requestClose}
        accessibilityRole="button"
        accessibilityLabel={spinsOnly ? 'Free Spins awarded' : lineWin ? 'Win' : 'Result'}
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

        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: accentColor },
            winType === 'jackpot' && styles.titleMega,
            winType === 'megaWin' && styles.titleJackpot,
          ]}
        >
          {titleText}
        </Text>

        {winMultiplier > 0 && amount > 0 && winType !== 'jackpot' ? (
          <Text style={[styles.multiplier, { color: accentColor }]}>
            {winMultiplier % 1 === 0 ? winMultiplier : winMultiplier.toFixed(1)}x
          </Text>
        ) : null}

        {/* Amount — shimmer for bigWin+ */}
        {amount > 0 ? (
          isFullscreen ? (
            <ShimmerSweep active={visible} passes={isJackpotTier ? 6 : 3} startDelay={500} shimmerColor="rgba(255,255,255,0.38)">
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

        {/* Skip / continue hint */}
        {isJackpotTier ? (
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
          <Text style={[styles.hint, { color: t.textSecondary }]}>Tap to skip</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  )

  if (!isFullscreen) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}>
          <BlurView
            intensity={cfg.blurIntensity}
            tint={blurTint}
            blurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
        </View>
        <CelebrationParticles
          count={cfg.particleCount}
          colors={particleColors}
          duration={cfg.duration}
        />
        <View style={styles.center}>{inner}</View>
      </Modal>
    )
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      {/* Blurred backdrop */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}>
        <BlurView
          intensity={cfg.blurIntensity}
          tint={blurTint}
          blurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Particles behind content */}
      <CelebrationParticles
        count={cfg.particleCount}
        colors={particleColors}
        duration={cfg.duration}
      />

      {/* Corner sparkles — 8 for jackpot, 4 for others */}
      {cfg.cornerSparkles && !reduceMotion ? (
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
  cardFs: {
    paddingVertical: 36,
    paddingHorizontal: 40,
    minWidth: 280,
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
  hint: {
    marginTop: 16,
    fontSize: 13,
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
