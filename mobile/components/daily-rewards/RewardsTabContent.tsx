import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Toast from 'react-native-toast-message'
import { router } from 'expo-router'
import { WeeklyLeaderboard } from '@/components/social/WeeklyLeaderboard'
import { WinnerFeedStrip } from '@/components/social/WinnerFeedStrip'
import { AppScrollView } from '@/components/ui/AppScrollView'
import { SCREEN_PAD_H } from '@/lib/screen-edge'
import { useGame } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'
import { routes } from '@/lib/app-routes'
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
    <AppScrollView
      style={[styles.scroll, { backgroundColor: t.background }]}
      contentContainerStyle={[
        styles.pad,
        { paddingHorizontal: SCREEN_PAD_H, paddingBottom: bottomPad },
      ]}
    >
      <View style={styles.hero}>
        <View>
          <Text style={[styles.tagline, { color: t.textSecondary }]}>
            Daily quests & virtual coin bonuses
          </Text>
        </View>
        <View style={[styles.pill, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}>
          <FontAwesome name="circle" size={14} color={t.gold} />
          <Text style={[styles.pillText, { color: t.textPrimary }]}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      <View style={[styles.streak, { borderColor: t.border, backgroundColor: hexWithAlpha(t.surfaceElevated, 'EE') }]}>
        <FontAwesome name="fire" size={22} color={t.primary} />
        <Text style={[styles.streakNum, { color: t.textPrimary }]}>{dailyStreak}</Text>
        <Text style={[styles.streakLbl, { color: t.textMuted }]}>day streak</Text>
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

      {/* Go Play shortcut — guides players back to the machine after collecting rewards */}
      <Pressable
        style={({ pressed }) => [
          styles.goPlay,
          {
            borderColor: hexWithAlpha(t.primary, '66'),
            backgroundColor: pressed
              ? hexWithAlpha(t.primary, '22')
              : hexWithAlpha(t.primary, '12'),
          },
        ]}
        onPress={() => router.push(routes.tabsIndex)}
        accessibilityRole="button"
        accessibilityLabel="Go Play"
        accessibilityHint="Return to the slot machine"
      >
        <Text style={[styles.goPlayLabel, { color: t.textSecondary }]}>Ready to spin?</Text>
        <View style={[styles.goPlayBtn, { backgroundColor: t.primary }]}>
          <FontAwesome name="play" size={12} color={t.primaryForeground} />
          <Text style={[styles.goPlayBtnTxt, { color: t.primaryForeground }]}>Go Play</Text>
        </View>
      </Pressable>

      <View style={[styles.inbox, { borderColor: t.border, backgroundColor: t.surfaceElevated, opacity: 0.95 }]}>
        <View style={[styles.inboxIcon, { backgroundColor: t.cardSoft }]}>
          <FontAwesome name="gift" size={22} color={t.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.inboxTitle, { color: t.textPrimary }]}>Reward inbox</Text>
          <Text style={[styles.inboxSub, { color: t.textSecondary }]}>
            Special reward deliveries will appear here when available.
          </Text>
        </View>
      </View>

      <WinnerFeedStrip />
      <WeeklyLeaderboard />
    </AppScrollView>
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
  goPlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  goPlayLabel: { fontSize: 14, fontWeight: '600' },
  goPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    minHeight: 44,
  },
  goPlayBtnTxt: { fontWeight: '900', fontSize: 14 },
})
