import { StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { AppButton } from '@/components/ui/AppButton'
import type { DailyReward } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'

interface DailyLoginRewardsProps {
  dailyRewards: DailyReward[]
  dailyStreak: number
  nextClaimableDay: number
  claimFlash: number | null
  onClaim: (day: number) => boolean
}

function fmtCoins(coins: number): string {
  if (coins >= 1000) {
    const k = coins / 1000
    return `${k % 1 === 0 ? k : k.toFixed(1)}k`
  }
  return String(coins)
}

export function DailyLoginRewards({
  dailyRewards,
  dailyStreak,
  nextClaimableDay,
  claimFlash,
  onClaim,
}: DailyLoginRewardsProps) {
  const t = useCasinoTheme()

  return (
    <View style={[styles.panel, { borderColor: t.border, backgroundColor: t.card }]}>
      <Text style={[styles.title, { color: t.foreground }]}>Daily Login Rewards</Text>

      <View style={styles.weekRow}>
        {dailyRewards.map((reward) => {
          const isClaimed = reward.claimed
          const isClaimable = reward.day === nextClaimableDay
          const isLocked = reward.day > nextClaimableDay
          const flash = claimFlash === reward.day

          return (
            <AppButton
              key={reward.day}
              variant={isClaimable ? 'primary' : 'outline'}
              disabled={!isClaimable || isLocked}
              onPress={() => isClaimable && onClaim(reward.day)}
              style={[styles.cellBtn, flash && { borderColor: t.win, borderWidth: 2 }]}
              accessibilityLabel={`Day ${reward.day} reward ${reward.coins} coins`}
            >
              <View style={styles.cellInner}>
                <Text style={[styles.dayLbl, { color: t.mutedForeground }]}>D{reward.day}</Text>
                <View
                  style={[
                    styles.circle,
                    {
                      backgroundColor: isClaimed ? t.win : isClaimable ? t.primary : t.muted,
                    },
                  ]}
                >
                  {isClaimed ? (
                    <FontAwesome name="check" size={14} color={t.primaryForeground} />
                  ) : isLocked ? (
                    <FontAwesome name="lock" size={12} color={t.mutedForeground} />
                  ) : (
                    <FontAwesome name="gift" size={12} color={t.primaryForeground} />
                  )}
                </View>
                <View style={styles.coinRow}>
                  <FontAwesome name="bitcoin" size={10} color={t.primary} />
                  <Text
                    style={[
                      styles.coinTxt,
                      { color: isClaimed ? t.win : t.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {fmtCoins(reward.coins)}
                  </Text>
                </View>
                {isClaimable ? <View style={[styles.dot, { backgroundColor: t.primary }]} /> : null}
              </View>
            </AppButton>
          )
        })}
      </View>

      <View style={[styles.mega, { borderTopColor: t.border }]}>
        <View style={styles.megaTop}>
          <Text style={[styles.megaLbl, { color: t.foreground }]}>Weekly Mega Bonus</Text>
          <View style={styles.megaAmt}>
            <FontAwesome name="bitcoin" size={14} color={t.jackpot} />
            <Text style={[styles.megaNum, { color: t.jackpot }]}>2,500</Text>
          </View>
        </View>
        <View style={[styles.barTrack, { backgroundColor: t.muted }]}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(100, (dailyStreak / 7) * 100)}%`, backgroundColor: t.primary },
            ]}
          />
        </View>
        <View style={styles.dotsRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <View
              key={day}
              style={[
                styles.trackDot,
                { backgroundColor: day <= dailyStreak ? t.primary : t.muted },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  weekRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  cellBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 96,
  },
  cellInner: {
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    width: '100%',
  },
  dayLbl: { fontSize: 10, fontWeight: '600' },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  coinTxt: { fontSize: 10, fontWeight: '800', maxWidth: 44 },
  dot: {
    position: 'absolute',
    top: -4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mega: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  megaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  megaLbl: { fontSize: 13, fontWeight: '700' },
  megaAmt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  megaNum: { fontWeight: '900' },
  barTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  trackDot: { width: 6, height: 6, borderRadius: 3 },
})
