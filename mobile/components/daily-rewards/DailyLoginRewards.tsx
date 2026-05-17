import { useEffect, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { AppButton } from '@/components/ui/AppButton'
import { DAILY_LOGIN_REWARD_COINS } from '@shared/economy/daily-login-rewards'
import type { DailyReward } from '@/lib/game-context'
import { useHaptics } from '@/lib/use-haptics'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'

/** Coins awarded on completing all 7 days (Day 7 value). */
const WEEKLY_BONUS_COINS = DAILY_LOGIN_REWARD_COINS[DAILY_LOGIN_REWARD_COINS.length - 1]

interface DailyLoginRewardsProps {
  dailyRewards: DailyReward[]
  dailyStreak: number
  /** True after Day 7 is claimed, until midnight resets the cycle. */
  weeklyStreakCompleted: boolean
  nextClaimableDay: number
  claimFlash: number | null
  /** Fire-and-forget; parent runs async server work. */
  onClaim: (day: number) => void | Promise<void>
}

function fmtCoins(coins: number): string {
  if (coins >= 1000) {
    const k = coins / 1000
    return `${k % 1 === 0 ? k : k.toFixed(1)}k`
  }
  return String(coins)
}

/** Pops a scale-spring animation on the shared value whenever `trigger` changes. */
function useClaimPop(trigger: boolean) {
  const scale = useSharedValue(1)
  const prevRef = useRef(trigger)
  useEffect(() => {
    if (trigger && !prevRef.current) {
      scale.value = withSequence(
        withSpring(1.25, { damping: 4, stiffness: 280 }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      )
    }
    prevRef.current = trigger
  }, [trigger, scale])
  return scale
}

function DayCell({
  reward,
  isClaimable,
  isClaimed,
  isLocked,
  flash,
  onClaim,
}: {
  reward: DailyReward
  isClaimable: boolean
  isClaimed: boolean
  isLocked: boolean
  flash: boolean
  onClaim: () => void
}) {
  const t = useCasinoTheme()
  const scale = useClaimPop(flash)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={[styles.cellWrap, animStyle]}>
      <AppButton
        variant={isClaimable ? 'primary' : 'outline'}
        disabled={!isClaimable || isLocked}
        onPress={onClaim}
        style={[styles.cellBtn, flash && { borderColor: t.win, borderWidth: 2 }]}
        accessibilityLabel={`Day ${reward.day} reward ${reward.coins} Vault Coins`}
        accessibilityHint={isClaimable ? 'Double-tap to claim' : undefined}
      >
        <View style={styles.cellInner}>
          <Text style={[styles.dayLbl, { color: t.textMuted }]}>D{reward.day}</Text>
          <View
            style={[
              styles.circle,
              { backgroundColor: isClaimed ? t.win : isClaimable ? t.primary : t.muted },
            ]}
          >
            {isClaimed ? (
              <FontAwesome name="check" size={14} color={t.primaryForeground} />
            ) : isLocked ? (
              <FontAwesome name="lock" size={12} color={t.textMuted} />
            ) : (
              <FontAwesome name="gift" size={12} color={t.primaryForeground} />
            )}
          </View>
          <View style={styles.coinRow}>
            <FontAwesome name="circle" size={10} color={t.gold} />
            <Text
              style={[styles.coinTxt, { color: isClaimed ? t.win : t.textPrimary }]}
              numberOfLines={1}
            >
              {fmtCoins(reward.coins)}
            </Text>
          </View>
          {isClaimable ? <View style={[styles.dot, { backgroundColor: t.primary }]} /> : null}
        </View>
      </AppButton>
    </Animated.View>
  )
}

export function DailyLoginRewards({
  dailyRewards,
  dailyStreak,
  weeklyStreakCompleted,
  nextClaimableDay,
  claimFlash,
  onClaim,
}: DailyLoginRewardsProps) {
  const t = useCasinoTheme()
  const { claimTap } = useHaptics()

  const weekBannerOpacity = useSharedValue(weeklyStreakCompleted ? 1 : 0)
  useEffect(() => {
    weekBannerOpacity.value = withTiming(weeklyStreakCompleted ? 1 : 0, { duration: 400 })
  }, [weeklyStreakCompleted, weekBannerOpacity])
  const weekBannerStyle = useAnimatedStyle(() => ({ opacity: weekBannerOpacity.value }))

  return (
    <View style={[styles.panel, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}>
      <Text style={[styles.title, { color: t.textPrimary }]}>Daily login rewards</Text>

      {weeklyStreakCompleted ? (
        <Animated.View
          style={[
            styles.weekDone,
            { borderColor: hexWithAlpha(t.win, '55'), backgroundColor: hexWithAlpha(t.win, '18') },
            weekBannerStyle,
          ]}
        >
          <FontAwesome name="trophy" size={20} color={t.win} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.weekDoneTitle, { color: t.win }]}>Full week complete!</Text>
            <Text style={[styles.weekDoneSub, { color: t.textSecondary }]}>
              New streak starts tomorrow
            </Text>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.weekRow}>
          {dailyRewards.map((reward) => {
            const isClaimed = reward.claimed
            const isClaimable = reward.day === nextClaimableDay
            const isLocked = reward.day > nextClaimableDay
            const flash = claimFlash === reward.day

            return (
              <DayCell
                key={reward.day}
                reward={reward}
                isClaimable={isClaimable}
                isClaimed={isClaimed}
                isLocked={isLocked}
                flash={flash}
                onClaim={() => {
                  if (isClaimable) {
                    claimTap()
                    void onClaim(reward.day)
                  }
                }}
              />
            )
          })}
        </View>
      )}

      <View style={[styles.mega, { borderTopColor: t.border }]}>
        <View style={styles.megaTop}>
          <Text style={[styles.megaLbl, { color: t.textPrimary }]}>Weekly streak bonus</Text>
          <View style={styles.megaAmt}>
            {/* Use t.gold (shell-stable, never overridden by machine skins) so this reward
                indicator stays gold across all themes. t.jackpot becomes red in Vegas theme,
                which looks like a debit here. */}
            <FontAwesome name="circle" size={14} color={t.gold} />
            <Text style={[styles.megaNum, { color: t.gold }]}>{fmtCoins(WEEKLY_BONUS_COINS)}</Text>
          </View>
        </View>
        <View style={[styles.barTrack, { backgroundColor: t.muted }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.min(100, (dailyStreak / DAILY_LOGIN_REWARD_COINS.length) * 100)}%`,
                backgroundColor: weeklyStreakCompleted ? t.win : t.primary,
              },
            ]}
          />
        </View>
        <View style={styles.dotsRow}>
          {DAILY_LOGIN_REWARD_COINS.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.trackDot,
                { backgroundColor: idx < dailyStreak ? (weeklyStreakCompleted ? t.win : t.primary) : t.muted },
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
  cellWrap: { flex: 1, minWidth: 0 },
  cellBtn: {
    width: '100%',
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
  weekDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  weekDoneTitle: { fontSize: 15, fontWeight: '800' },
  weekDoneSub: { fontSize: 12, marginTop: 2 },
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
