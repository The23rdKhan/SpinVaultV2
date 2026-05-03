import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useGame, BET_OPTIONS } from '@/lib/game-context'
import { routes } from '@/lib/app-routes'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppButton } from '@/components/ui/AppButton'

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

  const [displayedWin, setDisplayedWin] = useState(0)
  const [fastMode, setFastMode] = useState(false)
  const countUpRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const decreaseBet = () => {
    const i = BET_OPTIONS.indexOf(currentBet)
    if (i > 0) setBet(BET_OPTIONS[i - 1])
  }

  const increaseBet = () => {
    const i = BET_OPTIONS.indexOf(currentBet)
    if (i < BET_OPTIONS.length - 1) setBet(BET_OPTIONS[i + 1])
  }

  const setMaxBet = () => setBet(BET_OPTIONS[BET_OPTIONS.length - 1])

  return (
    <View style={styles.wrap}>
      <View style={styles.quickRow}>
        <AppButton variant="ghost" size="sm" onPress={onOpenInfo} style={styles.quickBtn}>
          <FontAwesome name="info-circle" size={14} color={t.foreground} />
          <Text style={{ color: t.foreground, fontWeight: '700', fontSize: 12 }}>INFO</Text>
        </AppButton>
        <AppButton variant="ghost" size="sm" onPress={onOpenLines} style={styles.quickBtn}>
          <FontAwesome name="th" size={14} color={t.foreground} />
          <Text style={{ color: t.foreground, fontWeight: '700', fontSize: 12 }}>LINES</Text>
        </AppButton>
        <AppButton
          variant="ghost"
          size="sm"
          accessibilityLabel="Quick win tally"
          accessibilityHint="Speeds up the last win number animation only"
          onPress={() => setFastMode((f) => !f)}
          style={styles.quickBtn}
        >
          <FontAwesome name="forward" size={14} color={fastMode ? t.primary : t.foreground} />
          <Text style={{ color: fastMode ? t.primary : t.foreground, fontWeight: '700', fontSize: 12 }}>
            QUICK
          </Text>
        </AppButton>
      </View>

      <View style={[styles.stats, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: t.mutedForeground }]}>Last win</Text>
          <Text style={[styles.statVal, { color: lastWin > 0 ? t.win : t.foreground }]}>
            ${displayedWin.toLocaleString()}
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: t.mutedForeground }]}>Spins</Text>
          <Text style={[styles.statVal, { color: t.foreground }]}>{totalSpins}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { color: t.mutedForeground }]}>Best</Text>
          <Text style={[styles.statVal, { color: t.primary }]}>${biggestWin.toLocaleString()}</Text>
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
              <FontAwesome name="minus" size={18} color={t.foreground} />
            </AppButton>
            <View style={styles.betMid}>
              <Text style={[styles.betLabel, { color: t.mutedForeground }]}>Bet</Text>
              <Text style={[styles.betAmt, { color: t.primary }]}>${currentBet}</Text>
            </View>
            <AppButton
              variant="outline"
              size="icon"
              disabled={isSpinning || currentBet === BET_OPTIONS[BET_OPTIONS.length - 1]}
              onPress={increaseBet}
            >
              <FontAwesome name="plus" size={18} color={t.foreground} />
            </AppButton>
          </View>

          <PressableSpin canSpin={canSpin} isSpinning={isSpinning} freeSpins={freeSpins} onSpin={() => spin()} />

          <View style={styles.rightCol}>
            <AppButton variant="outline" size="sm" disabled={isSpinning} onPress={setMaxBet} label="MAX" />
            <Text style={[styles.balLabel, { color: t.mutedForeground }]}>Balance</Text>
            <Text style={[styles.balVal, { color: t.foreground }]}>${coins.toLocaleString()}</Text>
          </View>
        </View>

        {coins < currentBet && freeSpins === 0 ? (
          <View style={styles.warnBlock}>
            <Text style={[styles.warn, { color: t.destructive }]}>
              Not enough coins for this bet. Lower bet with − or get coins below.
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
  return (
    <Pressable disabled={!canSpin} onPress={onSpin} accessibilityRole="button">
      <LinearGradient
        colors={[t.spinButtonTop, t.spinButtonBottom]}
        style={[styles.spinOuter, { opacity: canSpin ? 1 : 0.45 }]}
      >
        <Text style={styles.spinText}>
          {isSpinning ? '…' : freeSpins > 0 ? 'FREE\nSPIN' : 'SPIN'}
        </Text>
      </LinearGradient>
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
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  spinText: {
    color: '#fff',
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
