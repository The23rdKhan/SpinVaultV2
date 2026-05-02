import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useGame } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'

export function Marquee() {
  const t = useCasinoTheme()
  const { bonusProgress, freeSpins, isJackpotMode } = useGame()

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[t.card, t.cabinetBg]}
        style={[styles.top, { borderColor: t.cabinetBorder }]}
      >
        <View style={[styles.jackpotPill, { backgroundColor: t.jackpot, opacity: isJackpotMode ? 1 : 0.95 }]}>
          <Text style={styles.jackpotText}>MEGA JACKPOT</Text>
        </View>

        <View style={[styles.ticker, { backgroundColor: t.cabinetBg }]}>
          {freeSpins > 0 ? (
            <Text style={[styles.tickerText, { color: t.win }]}>
              FREE SPINS: {freeSpins} REMAINING!
            </Text>
          ) : (
            <Text style={[styles.tickerText, { color: t.mutedForeground }]} numberOfLines={1}>
              Match 5 SEVENS • 3 SCATTERS = 10 FREE SPINS • WILD substitutes
            </Text>
          )}
        </View>

        <View style={styles.meterRow}>
          <Text style={[styles.meterLabel, { color: t.mutedForeground }]}>Bonus</Text>
          <View style={[styles.meterTrack, { backgroundColor: t.muted, borderColor: t.border }]}>
            <View style={[styles.meterFill, { width: `${bonusProgress}%`, backgroundColor: t.primary }]} />
          </View>
          <Text style={[styles.meterPct, { color: t.primary }]}>{bonusProgress}%</Text>
        </View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  top: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  jackpotPill: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  jackpotText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 14,
  },
  ticker: {
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  tickerText: { fontSize: 12, fontWeight: '600', paddingHorizontal: 12 },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  meterLabel: { fontSize: 10, fontWeight: '700', width: 44 },
  meterTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  meterFill: { height: '100%', borderRadius: 999 },
  meterPct: { fontSize: 10, fontWeight: '800', width: 36, textAlign: 'right' },
})
