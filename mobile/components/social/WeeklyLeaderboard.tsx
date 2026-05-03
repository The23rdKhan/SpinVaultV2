import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { PlayerProfileModal } from '@/components/social/PlayerProfileModal'
import { ALL_VANITY_ITEMS, RARITY_COLORS } from '@/lib/vanity-data'
import { getSupabase } from '@/lib/supabase'
import { isServerSpinEnabled } from '@/lib/server-spin'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import type { CasinoPalette } from '@/theme/tokens'

/**
 * UTC week starting Monday — keep aligned with `public.week_period_start_utc`.
 */
function weekPeriodStartUTC(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = x.getUTCDay()
  const diff = (dow + 6) % 7
  x.setUTCDate(x.getUTCDate() - diff)
  return x.toISOString().slice(0, 10)
}

type LeaderboardType = 'biggestWin' | 'totalWinnings'
type LeaderboardViewState = 'loading' | 'disabled' | 'signed_out' | 'error' | 'empty' | 'ready'

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

interface LeaderboardRow {
  rank: number | string | null
  username: string | null
  value: number | string | null
  user_id: string | null
  frame: string | null
  title: string | null
  pet: string | null
}

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

function mapRow(row: LeaderboardRow, currentUserId: string): Entry {
  return {
    rank: Number(row.rank ?? 0),
    username: String(row.username ?? 'Player'),
    value: Number(row.value ?? 0),
    frame: row.frame ?? 'frame-basic',
    title: row.title ?? undefined,
    pet: row.pet ?? 'pet-none',
    vipTier: undefined,
    isCurrentUser: row.user_id === currentUserId,
  }
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
  const [type, setType] = useState<LeaderboardType>('biggestWin')
  const [pick, setPick] = useState<Entry | null>(null)
  const [viewState, setViewState] = useState<LeaderboardViewState>('loading')
  const [topEntries, setTopEntries] = useState<Entry[]>([])
  const [selfEntry, setSelfEntry] = useState<Entry | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isServerSpinEnabled()) {
        if (!cancelled) {
          setViewState('disabled')
          setTopEntries([])
          setSelfEntry(null)
        }
        return
      }

      const supabase = getSupabase()
      if (!supabase) {
        if (!cancelled) {
          setViewState('error')
        }
        return
      }

      setViewState('loading')

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        if (!cancelled) {
          setViewState('signed_out')
          setTopEntries([])
          setSelfEntry(null)
        }
        return
      }

      const uid = session.user.id
      const period = weekPeriodStartUTC()
      const leaderboardType = type === 'biggestWin' ? 'weekly_biggest_win' : 'weekly_total_winnings'

      // Pull the visible leaderboard page and the current user's true weekly row
      // from the same authoritative server projection.
      const [topResult, selfResult] = await Promise.all([
        supabase
          .from('v_leaderboard_public')
          .select('rank, username, value, user_id, frame, title, pet')
          .eq('period_start', period)
          .eq('leaderboard_type', leaderboardType)
          .order('rank', { ascending: true })
          .limit(20),
        supabase
          .from('v_leaderboard_public')
          .select('rank, username, value, user_id, frame, title, pet')
          .eq('period_start', period)
          .eq('leaderboard_type', leaderboardType)
          .eq('user_id', uid)
          .maybeSingle(),
      ])

      if (cancelled) return

      if (topResult.error || selfResult.error) {
        setViewState('error')
        setTopEntries([])
        setSelfEntry(null)
        return
      }

      const top = ((topResult.data ?? []) as LeaderboardRow[]).map((row) => mapRow(row, uid))
      const self = selfResult.data ? mapRow(selfResult.data as LeaderboardRow, uid) : null

      setTopEntries(top)
      setSelfEntry(self)
      setViewState(top.length > 0 ? 'ready' : 'empty')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [type])

  const renderState = () => {
    if (viewState === 'ready') return null

    const stateMeta =
      viewState === 'loading'
        ? {
            icon: 'refresh' as const,
            title: 'Loading leaderboard…',
            body: 'Pulling the latest weekly standings from the server.',
          }
        : viewState === 'disabled'
          ? {
              icon: 'lock' as const,
              title: 'Leaderboard disabled',
              body: 'Weekly rankings appear only when server-tracked spins are enabled.',
            }
          : viewState === 'signed_out'
            ? {
                icon: 'user' as const,
                title: 'Sign in to view rankings',
                body: 'Leaderboard entries are tied to your account and weekly spin history.',
              }
            : viewState === 'error'
              ? {
                  icon: 'warning' as const,
                  title: 'Leaderboard unavailable',
                  body: 'Real rankings could not be loaded right now.',
                }
              : {
                  icon: 'trophy' as const,
                  title: 'No entries yet',
                  body: 'Weekly rankings will appear after the first tracked spins land this week.',
                }

    return (
      <View style={styles.stateBox}>
        <View style={[styles.stateIcon, { backgroundColor: `${t.primary}18`, borderColor: `${t.primary}33` }]}>
          <FontAwesome name={stateMeta.icon} size={18} color={t.primary} />
        </View>
        <Text style={[styles.stateTitle, { color: t.foreground }]}>{stateMeta.title}</Text>
        <Text style={[styles.stateSub, { color: t.mutedForeground }]}>{stateMeta.body}</Text>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <FontAwesome name="trophy" size={18} color={t.primary} />
        <Text style={[styles.h3, { color: t.foreground }]}>Weekly Leaderboard</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: `${t.muted}55` }]}>
        <Pressable
          onPress={() => setType('biggestWin')}
          style={[styles.tab, type === 'biggestWin' && { backgroundColor: t.primary }]}
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
          style={[styles.tab, type === 'totalWinnings' && { backgroundColor: t.primary }]}
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
        {viewState !== 'ready' ? (
          renderState()
        ) : (
          topEntries.map((entry, index) => (
            <View
              key={`${entry.rank}-${entry.username}-${entry.isCurrentUser ? 'me' : 'row'}`}
              style={[
                styles.listRow,
                { borderBottomColor: t.border },
                index === topEntries.length - 1 && styles.lastListRow,
              ]}
            >
              <Row entry={entry} onPress={() => setPick(entry)} t={t} />
            </View>
          ))
        )}
      </View>

      {selfEntry && selfEntry.rank > topEntries.length ? (
        <View style={[styles.selfBox, { borderColor: t.primary }]}>
          <Text style={[styles.selfLbl, { color: t.mutedForeground }]}>Your position</Text>
          <Row entry={selfEntry} onPress={() => setPick(selfEntry)} t={t} />
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
  lastListRow: { borderBottomWidth: 0 },
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
  stateBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  stateIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  stateSub: { fontSize: 12, textAlign: 'center' },
  selfBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
    gap: 6,
  },
  selfLbl: { textAlign: 'center', fontSize: 11 },
})
