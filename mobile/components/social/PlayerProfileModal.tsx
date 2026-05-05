import { useMemo } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { LinearGradient } from 'expo-linear-gradient'
import { ALL_VANITY_ITEMS, TROPHY_DEFINITIONS } from '@/lib/vanity-data'
import { rarityPresentation } from '@/lib/rarity-from-theme'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'

export interface PlayerProfileEntry {
  rank: number
  username: string
  value: number
  frame?: string
  title?: string
  pet?: string
  vipTier?: number
  isCurrentUser?: boolean
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const PET_EMOJI: Record<string, string> = {
  cat: '🐱',
  dragon: '🐉',
  phoenix: '🔥',
  unicorn: '🦄',
  robot: '🤖',
  celestial: '✨',
}

const TROPHY_FA: Record<string, keyof typeof FontAwesome.glyphMap> = {
  star: 'star',
  zap: 'bolt',
  crown: 'star',
  coins: 'circle',
  palette: 'paint-brush',
  flame: 'fire',
  gem: 'diamond',
  sparkles: 'star',
  car: 'car',
}

export function PlayerProfileModal({
  player,
  metricLabel,
  onClose,
}: {
  player: PlayerProfileEntry
  metricLabel: string
  onClose: () => void
}) {
  const t = useCasinoTheme()

  const frameItem = player.frame ? ALL_VANITY_ITEMS.find((i) => i.id === player.frame) : null
  const titleItem = player.title
    ? ALL_VANITY_ITEMS.find((i) => i.id === player.title || i.previewImage === player.title)
    : null
  const petItem = player.pet ? ALL_VANITY_ITEMS.find((i) => i.id === player.pet) : null
  const showPet = petItem && petItem.id !== 'pet-none'

  const frameParts = frameItem ? rarityPresentation(t, frameItem.rarity) : null

  const publicStats = useMemo(() => {
    const r = mulberry32(hashSeed(`${player.username}_stats`))
    return {
      level: Math.floor(r() * 50) + 10,
      totalSpins: Math.floor(r() * 10000) + 1000,
      biggestWin: Math.floor(r() * 50000) + 5000,
      memberSince: '2024',
    }
  }, [player.username])

  const mockTrophies = useMemo(() => {
    const r = mulberry32(hashSeed(`${player.username}_tr`))
    return TROPHY_DEFINITIONS.slice(0, 6).map((tr) => ({
      ...tr,
      unlocked: r() > 0.4,
    }))
  }, [player.username])

  const unlockedCount = mockTrophies.filter((x) => x.unlocked).length

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={[styles.backdrop, { backgroundColor: t.overlay }]} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: t.surfaceElevated, borderColor: t.border }]}>
          <Pressable onPress={onClose} style={[styles.closeFab, { backgroundColor: hexWithAlpha(t.muted, '88') }]}>
            <FontAwesome name="times" size={18} color={t.textMuted} />
          </Pressable>

          <LinearGradient
            colors={[hexWithAlpha(t.primary, '44'), 'transparent']}
            style={styles.headerGrad}
          >
            <View style={styles.avatarBlock}>
              <View
                style={[
                  styles.avatarRing,
                  {
                    borderColor: frameParts?.border ?? t.border,
                    borderWidth: frameParts ? 4 : 2,
                    backgroundColor: t.cardSoft,
                  },
                ]}
              >
                <FontAwesome name="user" size={36} color={t.textMuted} />
              </View>
              {showPet ? (
                <View
                  style={[
                    styles.petBadge,
                    {
                      borderColor: rarityPresentation(t, petItem!.rarity).border,
                      backgroundColor: t.surfaceElevated,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>
                    {PET_EMOJI[petItem!.previewImage] ?? '🐾'}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.userName, { color: t.textPrimary }]}>{player.username}</Text>

            <View style={styles.titleRow}>
              {titleItem ? (
                <Text style={[styles.titleTxt, { color: rarityPresentation(t, titleItem.rarity).text }]}>
                  {titleItem.previewImage || titleItem.name}
                </Text>
              ) : player.title ? (
                <Text style={{ color: t.textMuted }}>{player.title}</Text>
              ) : null}
              {player.vipTier != null && player.vipTier >= 2 ? (
                <View style={[styles.vipPill, { backgroundColor: hexWithAlpha(t.gold, '22') }]}>
                  <FontAwesome name="star" size={10} color={t.gold} />
                  <Text style={[styles.vipTxt, { color: t.gold }]}>VIP {player.vipTier}</Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.rankPill, { borderColor: hexWithAlpha(t.primary, '88'), backgroundColor: hexWithAlpha(t.overlay, '22') }]}>
              <Text style={[styles.rankPillTxt, { color: t.primary }]}>Rank #{player.rank}</Text>
            </View>
          </LinearGradient>

          <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
            <View>
              <View style={styles.sectionHead}>
                <FontAwesome name="star" size={14} color={t.primary} />
                <Text style={[styles.sectionTitle, { color: t.textMuted }]}>This week</Text>
              </View>
              <View style={[styles.lbRow, { borderColor: t.border, backgroundColor: hexWithAlpha(t.muted, '33') }]}>
                <Text style={[styles.lbLbl, { color: t.textSecondary }]}>{metricLabel}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FontAwesome name="circle" size={16} color={t.gold} />
                  <Text style={[styles.lbVal, { color: t.textPrimary }]}>
                    {player.value.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            <View>
              <View style={styles.sectionHead}>
                <FontAwesome name="star" size={14} color={t.primary} />
                <Text style={[styles.sectionTitle, { color: t.textMuted }]}>Equipped cosmetics</Text>
              </View>
              <View style={styles.cosGrid}>
                <CosmeticCell
                  label="Frame"
                  name={frameItem?.name ?? 'Basic'}
                  rarityStyle={frameItem ? rarityPresentation(t, frameItem.rarity) : null}
                  muted={t.textMuted}
                  fallbackBorder={hexWithAlpha(t.border, '66')}
                  fallbackBg={hexWithAlpha(t.cardSoft, '66')}
                />
                <CosmeticCell
                  label="Title"
                  name={titleItem?.name ?? 'Player'}
                  rarityStyle={titleItem ? rarityPresentation(t, titleItem.rarity) : null}
                  muted={t.textMuted}
                  fallbackBorder={hexWithAlpha(t.border, '66')}
                  fallbackBg={hexWithAlpha(t.cardSoft, '66')}
                />
                <CosmeticCell
                  label="Pet"
                  name={showPet ? petItem!.name : 'None'}
                  rarityStyle={showPet ? rarityPresentation(t, petItem!.rarity) : null}
                  muted={t.textMuted}
                  fallbackBorder={hexWithAlpha(t.border, '66')}
                  fallbackBg={hexWithAlpha(t.cardSoft, '66')}
                />
              </View>
            </View>

            <View>
              <Text style={[styles.sectionTitle, { color: t.textMuted, marginBottom: 10 }]}>
                Public stats
              </Text>
              <View style={styles.statsGrid}>
                <StatBox label="Level" value={String(publicStats.level)} icon="star" t={t} />
                <StatBox
                  label="Total spins"
                  value={publicStats.totalSpins.toLocaleString()}
                  icon="bar-chart"
                  t={t}
                />
                <StatBox
                  label="Best spin"
                  value={publicStats.biggestWin.toLocaleString()}
                  icon="circle"
                  t={t}
                />
                <StatBox label="Leaderboard" value={`#${player.rank}`} icon="trophy" t={t} />
              </View>
            </View>

            <View>
              <View style={[styles.sectionHead, { justifyContent: 'space-between', width: '100%' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FontAwesome name="trophy" size={14} color={t.gold} />
                  <Text style={[styles.sectionTitle, { color: t.textMuted }]}>Trophy case</Text>
                </View>
                <Text style={{ color: t.textMuted, fontSize: 11 }}>
                  {unlockedCount}/{mockTrophies.length}
                </Text>
              </View>
              <View style={styles.trophyGrid}>
                {mockTrophies.map((tr) => {
                  const fa = TROPHY_FA[tr.icon] ?? 'certificate'
                  return (
                    <View
                      key={tr.id}
                      style={[
                        styles.trophyCell,
                        {
                          borderColor: tr.unlocked ? t.gold : t.border,
                          backgroundColor: tr.unlocked ? hexWithAlpha(t.gold, '18') : hexWithAlpha(t.muted, '22'),
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.trophyIcon,
                          {
                            backgroundColor: tr.unlocked ? hexWithAlpha(t.gold, '33') : hexWithAlpha(t.muted, '44'),
                          },
                        ]}
                      >
                        <FontAwesome
                          name={fa}
                          size={18}
                          color={tr.unlocked ? t.gold : t.textMuted}
                        />
                      </View>
                      <Text
                        style={[
                          styles.trophyName,
                          { color: tr.unlocked ? t.gold : t.textMuted },
                        ]}
                        numberOfLines={2}
                      >
                        {tr.unlocked ? tr.name : '???'}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>

            <View style={[styles.notice, { borderColor: t.border, backgroundColor: hexWithAlpha(t.muted, '22') }]}>
              <FontAwesome name="lock" size={14} color={t.textMuted} />
              <Text style={[styles.noticeTxt, { color: t.textSecondary }]}>
                Virtual coin balance, checkout history, and account details stay private.
              </Text>
            </View>

            <Text style={[styles.footer, { color: t.textMuted }]}>
              Playing since {publicStats.memberSince}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function CosmeticCell({
  label,
  name,
  rarityStyle,
  muted,
  fallbackBorder,
  fallbackBg,
}: {
  label: string
  name: string
  rarityStyle: { bg: string; text: string; border: string } | null
  muted: string
  fallbackBorder: string
  fallbackBg: string
}) {
  return (
    <View
      style={[
        styles.cosCell,
        {
          borderColor: rarityStyle?.border ?? fallbackBorder,
          backgroundColor: rarityStyle?.bg ?? fallbackBg,
        },
      ]}
    >
      <Text style={[styles.cosLbl, { color: muted }]}>{label}</Text>
      <Text
        style={[styles.cosName, { color: rarityStyle?.text ?? muted }]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  )
}

function StatBox({
  label,
  value,
  icon,
  t,
}: {
  label: string
  value: string
  icon: keyof typeof FontAwesome.glyphMap
  t: ReturnType<typeof useCasinoTheme>
}) {
  return (
    <View style={[styles.statBox, { backgroundColor: hexWithAlpha(t.muted, '33') }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <FontAwesome name={icon} size={12} color={t.primary} />
        <Text style={[styles.statLbl, { color: t.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.statVal, { color: t.textPrimary }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  closeFab: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGrad: {
    paddingTop: 28,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  avatarBlock: { position: 'relative', marginBottom: 10 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { fontSize: 20, fontWeight: '900' },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  titleTxt: { fontSize: 14, fontWeight: '700' },
  vipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  vipTxt: { fontSize: 11, fontWeight: '800' },
  rankPill: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  rankPillTxt: { fontSize: 13, fontWeight: '900' },
  body: { maxHeight: 420 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  lbLbl: { fontSize: 13, fontWeight: '600' },
  lbVal: { fontSize: 18, fontWeight: '900' },
  cosGrid: { flexDirection: 'row', gap: 8 },
  cosCell: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
  },
  cosLbl: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  cosName: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 10,
    padding: 10,
  },
  statLbl: { fontSize: 11, fontWeight: '600' },
  statVal: { fontSize: 17, fontWeight: '900' },
  trophyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trophyCell: {
    width: '31%',
    flexGrow: 1,
    minWidth: 72,
    borderRadius: 12,
    borderWidth: 2,
    padding: 8,
    alignItems: 'center',
    gap: 6,
  },
  trophyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyName: { fontSize: 9, fontWeight: '800', textAlign: 'center' },
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  noticeTxt: { flex: 1, fontSize: 11, lineHeight: 16 },
  footer: { textAlign: 'center', fontSize: 11 },
})
