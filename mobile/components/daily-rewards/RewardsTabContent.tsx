import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Toast from 'react-native-toast-message'
import { WeeklyLeaderboard } from '@/components/social/WeeklyLeaderboard'
import { WinnerFeedStrip } from '@/components/social/WinnerFeedStrip'
import { SCREEN_PAD_H } from '@/lib/screen-edge'
import { useGame } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { DailyLoginRewards } from './DailyLoginRewards'
import { DailyWheel } from './DailyWheel'
import { FreeSpinsWallet } from './FreeSpinsWallet'
import { TodaysMissions } from './TodaysMissions'
import { WatchAdCard } from './WatchAdCard'

export function RewardsTabContent() {
  const t = useCasinoTheme()
  const insets = useSafeAreaInsets()
  const { dailyRewards, dailyStreak, weeklyStreakCompleted, claimDailyReward, coins } = useGame()
  const [claimFlash, setClaimFlash] = useState<number | null>(null)

  const nextClaimableDay = dailyStreak + 1

  const handleClaimDay = async (day: number) => {
    const ok = await claimDailyReward(day)
    if (ok) {
      setClaimFlash(day)
      setTimeout(() => setClaimFlash(null), 900)
      Toast.show({ type: 'success', text1: `Day ${day} claimed` })
    } else {
      Toast.show({
        type: 'error',
        text1: 'Claim failed',
        text2: 'Check connection or claim order and try again.',
      })
    }
  }

  const bottomPad = Math.max(insets.bottom, 12) + 28

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: t.background }]}
      contentContainerStyle={[
        styles.pad,
        { paddingHorizontal: SCREEN_PAD_H, paddingBottom: bottomPad },
      ]}
    >
      <View style={styles.hero}>
        <View>
          <Text style={[styles.tagline, { color: t.mutedForeground }]}>Collect daily bonuses!</Text>
        </View>
        <View style={[styles.pill, { borderColor: t.border, backgroundColor: t.card }]}>
          <FontAwesome name="bitcoin" size={14} color={t.primary} />
          <Text style={[styles.pillText, { color: t.foreground }]}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      <View style={[styles.streak, { borderColor: t.border, backgroundColor: `${t.card}ee` }]}>
        <FontAwesome name="fire" size={22} color={t.primary} />
        <Text style={[styles.streakNum, { color: t.foreground }]}>{dailyStreak}</Text>
        <Text style={[styles.streakLbl, { color: t.mutedForeground }]}>day streak</Text>
      </View>

      <WatchAdCard />
      <DailyWheel />
      <DailyLoginRewards
        dailyRewards={dailyRewards}
        dailyStreak={dailyStreak}
        weeklyStreakCompleted={weeklyStreakCompleted}
        nextClaimableDay={nextClaimableDay}
        claimFlash={claimFlash}
        onClaim={handleClaimDay}
      />
      <TodaysMissions />
      <FreeSpinsWallet />

      <View style={[styles.inbox, { borderColor: t.border, backgroundColor: t.card, opacity: 0.85 }]}>
        <View style={[styles.inboxIcon, { backgroundColor: t.muted }]}>
          <FontAwesome name="gift" size={22} color={t.mutedForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.inboxTitle, { color: t.foreground }]}>Gift Inbox</Text>
          <Text style={[styles.inboxSub, { color: t.mutedForeground }]}>No gifts yet — check back soon!</Text>
        </View>
      </View>

      <WinnerFeedStrip />
      <WeeklyLeaderboard />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  pad: { gap: 14, paddingTop: 8 },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  tagline: { fontSize: 14, fontWeight: '600' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontWeight: '800' },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  streakNum: { fontSize: 26, fontWeight: '900' },
  streakLbl: { fontSize: 14 },
  inbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  inboxIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxTitle: { fontSize: 16, fontWeight: '700' },
  inboxSub: { fontSize: 13, marginTop: 4 },
})
