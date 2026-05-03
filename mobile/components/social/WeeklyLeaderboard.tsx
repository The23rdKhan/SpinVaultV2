import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { PlayerProfileModal } from '@/components/social/PlayerProfileModal'
import { ALL_VANITY_ITEMS, RARITY_COLORS } from '@/lib/vanity-data'
import { useGame } from '@/lib/game-context'
import { getSupabase } from '@/lib/supabase'
import { isServerSpinEnabled } from '@/lib/server-spin'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import type { CasinoPalette } from '@/theme/tokens'

/**
 * UTC week starting Monday — keep aligned with `public.week_period_start_utc` in
 * `supabase/migrations/20260203160000_phase5_leaderboard.sql`.
 */
function weekPeriodStartUTC(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = x.getUTCDay()
  const diff = (dow + 6) % 7
  x.setUTCDate(x.getUTCDate() - diff)
  return x.toISOString().slice(0, 10)
}

type LeaderboardType = 'biggestWin' | 'totalWinnings'

interface Entry {
  rank: number
  username: string
  value: number
  frame?: string
  title?: string
  pet?: string
  vipTier?: number
  isCurrentUser?: boolean
}

const NAMES = [
  'LuckyAce',
  'SpinMaster',
  'JackpotJenny',
  'GoldenDragon',
  'HighRoller99',
  'DiamondQueen',
  'SlotKing',
  'FortuneSeeker',
  'WildWinner',
  'MegaSpinner',
  'CyberSlots',
  'TreasureHunter',
  'NeonNinja',
  'VIPVictor',
  'BonusBoss',
  'ReelDeal',
  'CashCow',
  'BigBetBob',
  'LadyLuck',
  'PlatinumPlayer',
]

const PETS = ['pet-none', 'pet-cat', 'pet-dragon', 'pet-phoenix', 'pet-unicorn', 'pet-robot']

function petEmoji(petId: string): string {
  const pet = ALL_VANITY_ITEMS.find((i) => i.id === petId)
  const img = pet?.previewImage
  if (img === 'cat') return '🐱'
  if (img === 'dragon') return '🐉'
  if (img === 'phoenix') return '🔥'
  if (img === 'unicorn') return '🦄'
  if (img === 'robot') return '🤖'
  if (img === 'celestial') return '✨'
  return ''
}

function generateMockLeaderboard(
  type: LeaderboardType,
  user: {
    username: string
    value: number
    frame?: string
    title?: string
    pet?: string
  }
): Entry[] {
  const mockEntries: Entry[] = NAMES.slice(0, 20).map((name, i) => ({
    rank: i + 1,
    username: name,
    value:
      type === 'biggestWin'
        ? Math.floor(50000 / (i + 1) + Math.random() * 5000)
        : Math.floor(500000 / (i + 1) + Math.random() * 50000),
    vipTier: Math.max(1, 5 - Math.floor(i / 4)),
    frame: i < 3 ? 'frame-diamond' : i < 10 ? 'frame-gold' : 'frame-basic',
    title: i === 0 ? 'title-jackpot' : i < 5 ? 'title-legend' : 'title-player',
    pet: i < 5 ? PETS[Math.floor(Math.random() * PETS.length)] : 'pet-none',
  }))

  const userRank = 21 + Math.floor(Math.random() * 50)
  const userEntry: Entry = {
    rank: userRank,
    username: user.username,
    value: user.value,
    isCurrentUser: true,
    vipTier: 1,
    frame: user.frame ?? 'frame-basic',
    title: user.title,
    pet: user.pet ?? 'pet-none',
  }

  return [...mockEntries, userEntry]
    .sort((a, b) => b.value - a.value)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

function Row({
  entry,
  onPress,
  t,
}: {
  entry: Entry
  onPress: () => void
  t: CasinoPalette
}) {
  const frameItem = entry.frame ? ALL_VANITY_ITEMS.find((i) => i.id === entry.frame) : null
  const frameParts = frameItem ? RARITY_COLORS[frameItem.rarity] : null
  const petE = entry.pet ? petEmoji(entry.pet) : ''

  const rankStyle =
    entry.rank === 1
      ? { bg: '#f59e0b33', border: '#f59e0b', fg: '#fbbf24' }
      : entry.rank === 2
        ? { bg: '#a1a1aa33', border: '#a1a1aa', fg: '#d4d4d8' }
        : entry.rank === 3
          ? { bg: '#ea580c33', border: '#ea580c', fg: '#fb923c' }
          : { bg: `${t.muted}44`, border: 'transparent', fg: t.mutedForeground }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: t.border, opacity: pressed ? 0.92 : 1 },
        entry.isCurrentUser && { backgroundColor: `${t.primary}22`, borderColor: t.primary },
      ]}
    >
      <View style={[styles.rankCircle, { backgroundColor: rankStyle.bg, borderColor: rankStyle.border }]}>
        {entry.rank <= 3 ? (
          <FontAwesome name="star" size={14} color={rankStyle.fg} />
        ) : (
          <Text style={[styles.rankNum, { color: rankStyle.fg }]}>{entry.rank}</Text>
        )}
      </View>

      <View style={styles.avatarCol}>
        <View
          style={[
            styles.avatar,
            {
              borderColor: frameParts?.border ?? t.border,
              backgroundColor: t.muted,
            },
          ]}
        >
          <FontAwesome name="user" size={16} color={t.mutedForeground} />
        </View>
        {petE ? (
          <Text style={styles.petMini} accessibilityLabel="pet">
            {petE}
          </Text>
        ) : null}
      </View>

      <View style={styles.mid}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, { color: entry.isCurrentUser ? t.primary : t.foreground }]}
            numberOfLines={1}
          >
            {entry.username}
          </Text>
          {entry.vipTier != null && entry.vipTier >= 3 ? (
            <Text style={styles.vip}>VIP {entry.vipTier}</Text>
          ) : null}
        </View>
        {entry.title ? (
          <Text style={[styles.titleHint, { color: t.mutedForeground }]} numberOfLines={1}>
            {ALL_VANITY_ITEMS.find((i) => i.id === entry.title)?.name ?? entry.title}
          </Text>
        ) : null}
      </View>

      <View style={styles.valCol}>
        <FontAwesome name="bitcoin" size={12} color={t.primary} />
        <Text style={[styles.val, { color: t.foreground }]}>{entry.value.toLocaleString()}</Text>
      </View>
      <FontAwesome name="chevron-right" size={12} color={t.mutedForeground} />
    </Pressable>
  )
}

export function WeeklyLeaderboard() {
  const t = useCasinoTheme()
  const { username, leaderboardStats, userVanity } = useGame()
  const [type, setType] = useState<LeaderboardType>('biggestWin')
  const [pick, setPick] = useState<Entry | null>(null)
  const [serverEntries, setServerEntries] = useState<Entry[] | null>(null)

  const equippedTitleItem = userVanity.equippedTitleId
    ? ALL_VANITY_ITEMS.find((i) => i.id === userVanity.equippedTitleId)
    : null
  const displayTitle = equippedTitleItem?.id

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isServerSpinEnabled()) {
        setServerEntries(null)
        return
      }
      const supabase = getSupabase()
      if (!supabase) return
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) {
        setServerEntries(null)
        return
      }
      const uid = session.user.id
      const period = weekPeriodStartUTC()
      const lbType = type === 'biggestWin' ? 'weekly_biggest_win' : 'weekly_total_winnings'
      const { data, error } = await supabase
        .from('v_leaderboard_public')
        .select('rank, username, value, user_id')
        .eq('period_start', period)
        .eq('leaderboard_type', lbType)
        .order('rank', { ascending: true })
        .limit(40)
      if (cancelled || error || !data?.length) {
        if (!cancelled) setServerEntries(null)
        return
      }
      const mapped: Entry[] = data.map((row) => ({
        rank: Number(row.rank),
        username: String(row.username ?? 'Player'),
        value: Number(row.value ?? 0),
        isCurrentUser: row.user_id === uid,
        vipTier: 1,
        frame: 'frame-basic',
        pet: 'pet-none',
      }))
      setServerEntries(mapped)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [type])

  const mockEntries = useMemo(
    () =>
      generateMockLeaderboard(type, {
        username,
        value:
          type === 'biggestWin'
            ? leaderboardStats.weeklyBiggestWin
            : leaderboardStats.weeklyTotalWinnings,
        frame: userVanity.equippedFrameId,
        title: displayTitle,
        pet: userVanity.equippedPetId,
      }),
    [username, type, leaderboardStats, userVanity, displayTitle],
  )

  /** Merge server rows with a synthetic self row when the user is not in the returned page. */
  const entries = useMemo(() => {
    if (!serverEntries?.length) return mockEntries
    const userValue =
      type === 'biggestWin'
        ? leaderboardStats.weeklyBiggestWin
        : leaderboardStats.weeklyTotalWinnings
    let list = [...serverEntries]
    if (!list.some((e) => e.isCurrentUser)) {
      list.push({
        rank: list.length + 1,
        username,
        value: userValue,
        isCurrentUser: true,
        vipTier: 1,
        frame: userVanity.equippedFrameId ?? 'frame-basic',
        title: displayTitle,
        pet: userVanity.equippedPetId ?? 'pet-none',
      })
    }
    list = [...list].sort((a, b) => b.value - a.value).map((e, i) => ({ ...e, rank: i + 1 }))
    return list
  }, [
    serverEntries,
    mockEntries,
    type,
    leaderboardStats.weeklyBiggestWin,
    leaderboardStats.weeklyTotalWinnings,
    username,
    userVanity.equippedFrameId,
    userVanity.equippedPetId,
    displayTitle,
  ])

  const top = entries.slice(0, 20)
  const self = entries.find((e) => e.isCurrentUser)

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <FontAwesome name="trophy" size={18} color={t.primary} />
        <Text style={[styles.h3, { color: t.foreground }]}>Weekly Leaderboard</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: `${t.muted}55` }]}>
        <Pressable
          onPress={() => setType('biggestWin')}
          style={[
            styles.tab,
            type === 'biggestWin' && { backgroundColor: t.primary },
          ]}
        >
          <FontAwesome
            name="star"
            size={14}
            color={type === 'biggestWin' ? t.primaryForeground : t.mutedForeground}
          />
          <Text
            style={[
              styles.tabTxt,
              { color: type === 'biggestWin' ? t.primaryForeground : t.mutedForeground },
            ]}
          >
            Biggest Win
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setType('totalWinnings')}
          style={[
            styles.tab,
            type === 'totalWinnings' && { backgroundColor: t.primary },
          ]}
        >
          <FontAwesome
            name="bar-chart"
            size={14}
            color={type === 'totalWinnings' ? t.primaryForeground : t.mutedForeground}
          />
          <Text
            style={[
              styles.tabTxt,
              { color: type === 'totalWinnings' ? t.primaryForeground : t.mutedForeground },
            ]}
          >
            Total Winnings
          </Text>
        </Pressable>
      </View>

      <View style={[styles.list, { borderColor: t.border, backgroundColor: t.card }]}>
        {top.map((e) => (
          <View
            key={`${e.rank}-${e.username}-${e.isCurrentUser ? 'me' : 'row'}`}
            style={[styles.listRow, { borderBottomColor: t.border }]}
          >
            <Row entry={e} onPress={() => setPick(e)} t={t} />
          </View>
        ))}
      </View>

      {self && self.rank > 20 ? (
        <View style={[styles.selfBox, { borderColor: t.primary }]}>
          <Text style={[styles.selfLbl, { color: t.mutedForeground }]}>Your position</Text>
          <Row entry={self} onPress={() => setPick(self)} t={t} />
        </View>
      ) : null}

      {pick != null ? (
        <PlayerProfileModal
          player={pick}
          metricLabel={type === 'biggestWin' ? 'Biggest win (weekly)' : 'Total winnings (weekly)'}
          onClose={() => setPick(null)}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  h3: { fontSize: 18, fontWeight: '800' },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabTxt: { fontSize: 13, fontWeight: '700' },
  list: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: { fontSize: 12, fontWeight: '800' },
  avatarCol: { position: 'relative' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petMini: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    fontSize: 12,
    backgroundColor: '#00000022',
    borderRadius: 8,
    paddingHorizontal: 2,
  },
  mid: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 14, fontWeight: '800', flexShrink: 1 },
  vip: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fbbf24',
    backgroundColor: '#f59e0b22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  titleHint: { fontSize: 11, marginTop: 2 },
  valCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  val: { fontSize: 14, fontWeight: '800' },
  selfBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
    gap: 6,
  },
  selfLbl: { textAlign: 'center', fontSize: 11 },
})
