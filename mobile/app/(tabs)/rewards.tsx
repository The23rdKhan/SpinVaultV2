import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Toast from 'react-native-toast-message'
import { AppButton } from '@/components/ui/AppButton'
import { useAuth } from '@/lib/auth-context'
import { useGame } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'

export default function RewardsScreen() {
  const t = useCasinoTheme()
  const {
    dailyRewards,
    dailyStreak,
    claimDailyReward,
    coins,
    spinDailyWheel,
    dailyWheel,
    missions,
    claimMissionReward,
    freeSpins,
    leaderboardStats,
    addCoins,
  } = useGame()
  const { watchAd, canWatchAd, adsWatchedToday, maxDailyAds } = useAuth()
  const [claimFlash, setClaimFlash] = useState<number | null>(null)

  const nextClaimableDay = dailyStreak + 1

  const handleClaim = (day: number) => {
    if (claimDailyReward(day)) {
      setClaimFlash(day)
      setTimeout(() => setClaimFlash(null), 800)
      Toast.show({ type: 'success', text1: `Day ${day} claimed` })
    }
  }

  const onWheel = () => {
    if (dailyWheel.dailyWheelClaimed) return
    const reward = spinDailyWheel()
    Toast.show({ type: 'success', text1: `Wheel: +${reward} coins` })
  }

  const onWatchAd = async () => {
    if (!canWatchAd()) return
    const reward = await watchAd()
    if (reward > 0) addCoins(reward)
    Toast.show({ type: 'success', text1: `+${reward} coins` })
  }

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: t.background }]} contentContainerStyle={styles.pad}>
      <View style={styles.rowBetween}>
        <Text style={[styles.h2, { color: t.foreground }]}>Rewards</Text>
        <View style={[styles.pill, { borderColor: t.border }]}>
          <FontAwesome name="money" size={14} color={t.primary} />
          <Text style={[styles.pillText, { color: t.foreground }]}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.card }]}>
        <Text style={[styles.streak, { color: t.primary }]}>{dailyStreak} day streak</Text>
      </View>

      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.card }]}>
        <Text style={[styles.h3, { color: t.foreground }]}>Watch & earn</Text>
        <Text style={[styles.muted, { color: t.mutedForeground }]}>
          {canWatchAd()
            ? `${maxDailyAds - adsWatchedToday} left today`
            : 'Come back tomorrow'}
        </Text>
        <AppButton
          label="Watch ad"
          disabled={!canWatchAd()}
          onPress={onWatchAd}
          style={{ marginTop: 10 }}
        />
      </View>

      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.card }]}>
        <Text style={[styles.h3, { color: t.foreground }]}>Daily wheel</Text>
        <AppButton
          label={dailyWheel.dailyWheelClaimed ? 'Already spun today' : 'Spin'}
          disabled={dailyWheel.dailyWheelClaimed}
          onPress={onWheel}
          style={{ marginTop: 10 }}
        />
      </View>

      <Text style={[styles.h3, { color: t.foreground }]}>Login calendar</Text>
      <View style={styles.grid}>
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
              onPress={() => handleClaim(reward.day)}
              label={`D${reward.day}\n${reward.coins}`}
              style={[
                styles.dayBtn,
                flash && { borderColor: t.win },
                isClaimed && { opacity: 0.85 },
                isLocked && { opacity: 0.45 },
              ]}
            />
          )
        })}
      </View>

      <Text style={[styles.h3, { color: t.foreground, marginTop: 16 }]}>Missions</Text>
      {missions.map((m) => (
        <View key={m.id} style={[styles.mission, { borderColor: t.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mTitle, { color: t.foreground }]}>{m.name}</Text>
            <Text style={[styles.muted, { color: t.mutedForeground }]}>
              {m.progress}/{m.target}
            </Text>
          </View>
          <AppButton
            size="sm"
            label={m.claimed ? 'Done' : m.completed ? 'Claim' : '…'}
            disabled={!m.completed || m.claimed}
            onPress={() => {
              if (claimMissionReward(m.id)) Toast.show({ type: 'success', text1: 'Reward claimed' })
            }}
          />
        </View>
      ))}

      <Text style={[styles.h3, { color: t.foreground, marginTop: 16 }]}>Leaderboard</Text>
      <View style={[styles.card, { borderColor: t.border }]}>
        <Text style={[styles.muted, { color: t.mutedForeground }]}>
          Weekly winnings: {leaderboardStats.weeklyTotalWinnings.toLocaleString()}
        </Text>
        <Text style={[styles.muted, { color: t.mutedForeground }]}>
          Best this week: {leaderboardStats.weeklyBiggestWin.toLocaleString()}
        </Text>
        <Text style={[styles.muted, { color: t.mutedForeground }]}>
          Free spins bank: {freeSpins}
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  pad: { padding: 16, paddingBottom: 40, gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h2: { fontSize: 22, fontWeight: '800' },
  h3: { fontSize: 17, fontWeight: '800' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontWeight: '800' },
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  streak: { fontWeight: '900', fontSize: 18, textAlign: 'center' },
  muted: { fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayBtn: { minWidth: 72, minHeight: 64 },
  mission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  mTitle: { fontWeight: '700' },
})
