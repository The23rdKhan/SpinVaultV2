import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAuth } from '@/lib/auth-context'
import { getSupabase } from '@/lib/supabase'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'

type FeedRow = {
  id: string
  win_type: string
  win_amount: number
  multiplier: number | null
  created_at: string
  profiles: { username: string } | null
}

function normalizeFeedRows(raw: unknown): FeedRow[] {
  if (!Array.isArray(raw)) return []
  const out: FeedRow[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id : null
    if (!id) continue
    let profiles: { username: string } | null = null
    const p = r.profiles
    if (p && typeof p === 'object' && !Array.isArray(p)) {
      const u = (p as { username?: unknown }).username
      if (typeof u === 'string') profiles = { username: u }
    } else if (Array.isArray(p) && p[0] && typeof p[0] === 'object') {
      const u = (p[0] as { username?: unknown }).username
      if (typeof u === 'string') profiles = { username: u }
    }
    out.push({
      id,
      win_type: typeof r.win_type === 'string' ? r.win_type : '',
      win_amount: Number(r.win_amount),
      multiplier: r.multiplier == null ? null : Number(r.multiplier),
      created_at: typeof r.created_at === 'string' ? r.created_at : '',
      profiles,
    })
  }
  return out
}

const REACTIONS = ['fire', 'crown', 'coins', 'party'] as const
type ReactionKind = (typeof REACTIONS)[number]

const REACTION_ICON: Record<ReactionKind, string> = {
  fire: 'fire',
  crown: 'star',
  coins: 'circle',
  party: 'smile-o',
}

export function WinnerFeedStrip() {
  const t = useCasinoTheme()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [feeds, setFeeds] = useState<FeedRow[]>([])
  const [myByFeed, setMyByFeed] = useState<Partial<Record<string, ReactionKind>>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const uid = user?.id && !user.id.startsWith('guest_') ? user.id : null

  const load = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) {
      setFeeds([])
      setLoading(false)
      return
    }

    const { data: feedData, error: feedErr } = await supabase
      .from('winner_feed')
      .select('id, win_type, win_amount, multiplier, created_at, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(15)

    if (feedErr) {
      if (__DEV__) console.warn('[winner_feed]', feedErr.message)
      setFeeds([])
      setLoading(false)
      return
    }

    const rows = normalizeFeedRows(feedData)
    setFeeds(rows)

    if (uid && rows.length > 0) {
      const ids = rows.map((r) => r.id)
      const { data: rx, error: rxErr } = await supabase
        .from('feed_reactions')
        .select('feed_id, reaction')
        .eq('user_id', uid)
        .in('feed_id', ids)

      if (!rxErr && rx) {
        const map: Partial<Record<string, ReactionKind>> = {}
        for (const r of rx) {
          const k = r.reaction as ReactionKind
          if (REACTIONS.includes(k)) map[r.feed_id] = k
        }
        setMyByFeed(map)
      } else {
        setMyByFeed({})
      }
    } else {
      setMyByFeed({})
    }

    setLoading(false)
  }, [uid])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const setReaction = async (feedId: string, reaction: ReactionKind) => {
    const supabase = getSupabase()
    if (!supabase || !uid) return

    const current = myByFeed[feedId]
    setBusyId(feedId)

    try {
      if (current) {
        await supabase.from('feed_reactions').delete().eq('feed_id', feedId).eq('user_id', uid)
      }
      if (current === reaction) {
        setMyByFeed((prev) => {
          const next = { ...prev }
          delete next[feedId]
          return next
        })
        return
      }

      const { error } = await supabase.from('feed_reactions').insert({
        feed_id: feedId,
        user_id: uid,
        reaction,
      })

      if (error) {
        if (__DEV__) console.warn('[feed_reactions]', error.message)
        await load()
        return
      }

      setMyByFeed((prev) => ({ ...prev, [feedId]: reaction }))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}>
        <ActivityIndicator color={t.primary} />
      </View>
    )
  }

  if (feeds.length === 0) return null

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <FontAwesome name="trophy" size={16} color={t.primary} />
        <Text style={[styles.title, { color: t.textPrimary }]}>Community highlights</Text>
      </View>
      <Text style={[styles.sub, { color: t.textSecondary }]}>
        Recent virtual coin wins — tap a reaction to cheer someone on.
      </Text>
      {feeds.map((row, idx) => {
        const name = row.profiles?.username ?? 'Player'
        const mult = row.multiplier != null ? Number(row.multiplier).toFixed(1) : '—'
        return (
          <View
            key={row.id}
            style={[
              styles.row,
              { borderColor: t.border, backgroundColor: t.surfaceElevated },
              idx > 0 && { marginTop: 10 },
            ]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.name, { color: t.textPrimary }]} numberOfLines={1}>
                {name}
              </Text>
              <View style={styles.winPill}>
                <FontAwesome name="circle" size={12} color={t.gold} />
                <Text style={[styles.winAmt, { color: t.textPrimary }]}>
                  {Number(row.win_amount).toLocaleString()}
                </Text>
              </View>
            </View>
            <Text style={[styles.meta, { color: t.textMuted }]}>
              {row.win_type} · {mult}x
            </Text>
            <View style={styles.rxRow}>
              {REACTIONS.map((rx) => {
                const active = myByFeed[row.id] === rx
                return (
                  <Pressable
                    key={rx}
                    disabled={!uid || busyId === row.id}
                    onPress={() => void setReaction(row.id, rx)}
                    style={[
                      styles.rxBtn,
                      {
                        borderColor: active ? t.primary : t.border,
                        backgroundColor: active ? hexWithAlpha(t.primary, '22') : 'transparent',
                      },
                    ]}
                    accessibilityLabel={`${rx} reaction`}
                  >
                    <FontAwesome
                      // glyph names from FontAwesome 4 set bundled with @expo/vector-icons
                      name={REACTION_ICON[rx] as never}
                      size={14}
                      color={active ? t.primary : t.textMuted}
                    />
                  </Pressable>
                )
              })}
              {!uid ? (
                <Text style={[styles.signInHint, { color: t.textMuted }]}>
                  Sign in to react
                </Text>
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 12, marginBottom: 4 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  row: { borderRadius: 14, borderWidth: 1, padding: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontWeight: '700', fontSize: 15 },
  winPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  winAmt: { fontWeight: '800', fontSize: 15 },
  meta: { fontSize: 12, marginTop: 4 },
  rxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  rxBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInHint: { fontSize: 11, marginLeft: 4 },
})
