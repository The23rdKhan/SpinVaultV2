import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import type { WinType } from '@/lib/game-context'
import { useGame } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useHaptics } from '@/lib/use-haptics'

interface WinDisplayProps {
  show: boolean
  amount: number
  winType: WinType
  freeSpins: number
  onClose?: () => void
}

/** Tap-to-dismiss is ignored until this many ms have elapsed (all tiers). */
const MIN_TAP_DISMISS_MS = 400

const WIN_CONFIG: Record<
  Exclude<WinType, 'none'>,
  { title: string; duration: number; fullscreen: boolean }
> = {
  normal: { title: 'WIN', duration: 1200, fullscreen: false },
  bigWin: { title: 'BIG WIN!', duration: 3500, fullscreen: true },
  megaWin: { title: 'MEGA WIN!!', duration: 4500, fullscreen: true },
  jackpot: { title: 'JACKPOT!!!', duration: 6000, fullscreen: true },
}

export function WinDisplay({ show, amount, winType, freeSpins, onClose }: WinDisplayProps) {
  const t = useCasinoTheme()
  const { winMultiplier } = useGame()
  const [visible, setVisible] = useState(false)
  const [displayAmount, setDisplayAmount] = useState(0)
  const [allowDismiss, setAllowDismiss] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const { winFeedback } = useHaptics()

  // Card entrance animation
  const cardScale = useSharedValue(0.72)
  const cardOpacity = useSharedValue(0)
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }))

  const spinsOnly = amount <= 0 && freeSpins > 0 && winType !== 'none'
  const lineWin = amount > 0 && winType !== 'none'

  const requestClose = () => {
    if (!allowDismiss) return
    setVisible(false)
    onCloseRef.current?.()
  }

  useEffect(() => {
    if (!show || winType === 'none' || (!lineWin && !spinsOnly)) {
      setVisible(false)
      setDisplayAmount(0)
      setAllowDismiss(false)
      return
    }

    const cfg = WIN_CONFIG[winType as Exclude<WinType, 'none'>]
    setVisible(true)
    setAllowDismiss(false)

    // Entrance spring
    cardScale.value = 0.72
    cardOpacity.value = 0
    cardScale.value = withSpring(1, { damping: 14, stiffness: 200 })
    cardOpacity.value = withTiming(1, { duration: 180 })

    // Tier pump after settle
    if (winType !== 'normal') {
      setTimeout(() => {
        cardScale.value = withSequence(
          withTiming(1.07, { duration: 180, easing: Easing.out(Easing.quad) }),
          withSpring(1.0, { damping: 12 }),
        )
      }, 320)
    }

    // Haptics — audio handled at app root by CasinoAudioController
    winFeedback(winType)

    const dismissGate = setTimeout(() => setAllowDismiss(true), MIN_TAP_DISMISS_MS)

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
    const tickMs = Math.max(16, Math.min(1500, cfg.duration * 0.4) / 30)
    const steps = 30
    const increment = amount / steps
    let current = 0
    const interval = setInterval(() => {
      current += increment
      if (current >= amount) {
        setDisplayAmount(amount)
        clearInterval(interval)
      } else {
        setDisplayAmount(Math.floor(current))
      }
    }, tickMs)

    const closeTimeout = setTimeout(() => {
      setVisible(false)
      onCloseRef.current?.()
    }, cfg.duration)

    return () => {
      clearTimeout(dismissGate)
      clearInterval(interval)
      clearTimeout(closeTimeout)
    }
  // `spinsOnly` and `lineWin` are derived from props already in the dep array.
  // `cardScale`/`cardOpacity` are Reanimated shared values — stable references.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, amount, winType, winFeedback])

  if (!visible || winType === 'none') return null

  // winType !== 'none' is guaranteed by the guard above
  const cfg = WIN_CONFIG[winType as Exclude<WinType, 'none'>]
  const accent =
    winType === 'jackpot'
      ? t.jackpot
      : winType === 'megaWin' || winType === 'bigWin'
        ? t.win
        : t.primary

  const titleText = spinsOnly ? 'FREE SPINS!' : cfg.title

  const inner = (
    <Animated.View style={cardStyle}>
      <Pressable
        style={[styles.card, { borderColor: accent, backgroundColor: t.card }, cfg.fullscreen && styles.cardFs]}
        onPress={requestClose}
        accessibilityRole="button"
        accessibilityLabel={spinsOnly ? 'Free spins awarded' : lineWin ? 'Win' : 'Result'}
        accessibilityHint={allowDismiss ? 'Tap to dismiss' : 'Please wait'}
      >
        <Text style={[styles.title, { color: accent }]}>{titleText}</Text>
        {winMultiplier > 0 && amount > 0 ? (
          <Text style={[styles.multiplier, { color: accent }]}>
            {winMultiplier % 1 === 0 ? winMultiplier : winMultiplier.toFixed(1)}x
          </Text>
        ) : null}
        {amount > 0 ? (
          <Text style={[styles.amt, { color: accent }]}>{displayAmount.toLocaleString()} coins</Text>
        ) : null}
        {freeSpins > 0 ? (
          <Text style={[styles.fsBonus, { color: t.primary }]}>
            {spinsOnly ? `${freeSpins} free spins awarded!` : `+${freeSpins} free spins`}
          </Text>
        ) : null}
        {cfg.fullscreen ? (
          <Text style={[styles.hint, { color: t.mutedForeground }]}>Tap to continue</Text>
        ) : null}
        {!cfg.fullscreen && lineWin && allowDismiss ? (
          <Text style={[styles.hint, { color: t.mutedForeground }]}>Tap to skip</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  )

  if (!cfg.fullscreen) {
    return (
      <Modal transparent visible={visible} animationType="fade">
      <BlurView intensity={30} tint="dark" blurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
        <View style={styles.center}>{inner}</View>
      </Modal>
    )
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      <BlurView intensity={55} tint="dark" blurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
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
  },
  cardFs: {
    paddingVertical: 32,
    paddingHorizontal: 36,
  },
  title: { fontSize: 28, fontWeight: '900' },
  multiplier: { fontSize: 20, fontWeight: '800', opacity: 0.85 },
  amt: { fontSize: 44, fontWeight: '900' },
  fsBonus: { fontWeight: '800', marginTop: 8, textAlign: 'center' },
  hint: { marginTop: 16, fontSize: 13 },
})
