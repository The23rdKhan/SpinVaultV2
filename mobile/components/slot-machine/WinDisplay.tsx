import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import type { WinType } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'

interface WinDisplayProps {
  show: boolean
  amount: number
  winType: WinType
  freeSpins: number
  onClose?: () => void
}

const WIN_CONFIG: Record<
  Exclude<WinType, 'none'>,
  { title: string; duration: number; fullscreen: boolean }
> = {
  normal: { title: 'WIN', duration: 2000, fullscreen: false },
  bigWin: { title: 'BIG WIN!', duration: 3500, fullscreen: true },
  megaWin: { title: 'MEGA WIN!!', duration: 4500, fullscreen: true },
  jackpot: { title: 'JACKPOT!!!', duration: 6000, fullscreen: true },
}

export function WinDisplay({ show, amount, winType, freeSpins, onClose }: WinDisplayProps) {
  const t = useCasinoTheme()
  const [visible, setVisible] = useState(false)
  const [displayAmount, setDisplayAmount] = useState(0)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const spinsOnly = amount <= 0 && freeSpins > 0 && winType !== 'none'
  const lineWin = amount > 0 && winType !== 'none'

  useEffect(() => {
    if (!show || winType === 'none' || (!lineWin && !spinsOnly)) {
      setVisible(false)
      setDisplayAmount(0)
      return
    }

    const cfg = WIN_CONFIG[winType]
    setVisible(true)

    if (amount <= 0) {
      setDisplayAmount(0)
      const closeTimeout = setTimeout(() => {
        setVisible(false)
        onCloseRef.current?.()
      }, cfg.duration)
      return () => clearTimeout(closeTimeout)
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
      clearInterval(interval)
      clearTimeout(closeTimeout)
    }
  }, [show, amount, winType, lineWin, spinsOnly])

  if (!visible || winType === 'none') return null

  const cfg = WIN_CONFIG[winType]
  const accent =
    winType === 'jackpot'
      ? t.jackpot
      : winType === 'megaWin' || winType === 'bigWin'
        ? t.win
        : t.primary

  const titleText = spinsOnly ? 'FREE SPINS!' : cfg.title

  const inner = (
    <Pressable
      style={[styles.card, { borderColor: accent, backgroundColor: t.card }, cfg.fullscreen && styles.cardFs]}
      onPress={() => {
        setVisible(false)
        onCloseRef.current?.()
      }}
    >
      <Text style={[styles.title, { color: accent }]}>{titleText}</Text>
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
    </Pressable>
  )

  if (!cfg.fullscreen) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.center}>{inner}</View>
      </Modal>
    )
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable
        style={[styles.fsBackdrop, { backgroundColor: `${t.background}ee` }]}
        onPress={() => {
          setVisible(false)
          onCloseRef.current?.()
        }}
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
  amt: { fontSize: 44, fontWeight: '900' },
  fsBonus: { fontWeight: '800', marginTop: 8, textAlign: 'center' },
  hint: { marginTop: 16, fontSize: 13 },
})
