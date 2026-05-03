import { useState, type ReactNode } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { GoogleSignInButton } from '@/components/social-auth-buttons/google/google-sign-in-button'
import { AppButton } from '@/components/ui/AppButton'
import { ItemPreview } from '@/components/shop/ItemPreview'
import type { AuthProviderKind, NotificationPrefs } from '@/lib/auth-context'
import { useAppearance } from '@/lib/appearance-context'
import { isExpoUiNativeAvailable } from '@/lib/is-expo-ui-native-available'
import { useNativeSemanticColors } from '@/lib/native-semantic-colors'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import {
  getProfileAchievementProgress,
  type ProfileAchievementIconId,
} from '@/lib/profile-achievements'
import { openExternalUrl, SUPPORT_URLS } from '@/lib/support-links'
import type { CasinoPalette } from '@/theme/tokens'
import type { CoinLedgerEntry, WinType } from '@/lib/game-context'
import {
  ALL_VANITY_ITEMS,
  RARITY_COLORS,
  RARITY_LABELS,
  TROPHY_DEFINITIONS,
  type Trophy,
  type UserVanity,
} from '@/lib/vanity-data'

/** RN fallback rows for notification prefs (same keys as `NotificationPrefs` / Expo UI pilot). */
const NOTIFICATION_PREFS_ROWS_RN: {
  key: keyof NotificationPrefs
  label: string
  description: string
  icon: keyof typeof FontAwesome.glyphMap
}[] = [
  { key: 'dailyBonus', label: 'Daily Bonus Reminders', description: 'Get notified about unclaimed bonuses', icon: 'gift' },
  { key: 'giftNotifications', label: 'Gift Notifications', description: 'When you receive a gift', icon: 'gift' },
  { key: 'eventReminders', label: 'Event Reminders', description: 'Special events and tournaments', icon: 'calendar' },
  { key: 'promotions', label: 'Promotions', description: 'Deals and special offers', icon: 'bullhorn' },
]

const EQUIPPED_SLOTS = [
  { key: 'equippedAvatarId' as const, label: 'Avatar' },
  { key: 'equippedFrameId' as const, label: 'Frame' },
  { key: 'equippedTitleId' as const, label: 'Title' },
  { key: 'equippedPetId' as const, label: 'Pet' },
  { key: 'equippedCabinetId' as const, label: 'Cabinet' },
  { key: 'featuredRoomId' as const, label: 'Room' },
]

const TROPHY_FA: Record<string, keyof typeof FontAwesome.glyphMap> = {
  star: 'star',
  zap: 'bolt',
  crown: 'star',
  coins: 'bitcoin',
  palette: 'paint-brush',
  flame: 'fire',
  gem: 'diamond',
  sparkles: 'star',
  car: 'car',
}

const ACHIEVEMENT_FA: Record<
  ProfileAchievementIconId,
  keyof typeof FontAwesome.glyphMap
> = {
  target: 'crosshairs',
  trending: 'bar-chart',
  trophy: 'trophy',
  sparkles: 'star',
  flame: 'fire',
  coins: 'bitcoin',
}

function SectionTitle({
  icon,
  title,
  right,
}: {
  icon: keyof typeof FontAwesome.glyphMap
  title: string
  right?: ReactNode
}) {
  const t = useCasinoTheme()
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleLeft}>
        <FontAwesome name={icon} size={16} color={t.primary} />
        <Text style={[styles.sectionTitle, { color: t.foreground }]}>{title}</Text>
      </View>
      {right}
    </View>
  )
}

export function AccountSection({
  isGuest,
  userEmail,
  userProvider,
  onSocialLinkSuccess,
  onRestore,
  onSignOut,
}: {
  isGuest: boolean
  userEmail?: string
  userProvider?: AuthProviderKind
  /** After Apple/Google sign-in completes from the link sheet (session already updated). */
  onSocialLinkSuccess?: () => void
  onRestore: () => Promise<void>
  onSignOut: () => void
}) {
  const t = useCasinoTheme()
  const [showLink, setShowLink] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const providerLabel =
    userProvider === 'apple'
      ? 'Apple'
      : userProvider === 'google'
        ? 'Google'
        : userProvider === 'email'
          ? 'Email'
          : 'Signed in'

  const restore = async () => {
    setRestoring(true)
    try {
      await onRestore()
    } finally {
      setRestoring(false)
    }
  }

  return (
    <View>
      <SectionTitle icon="user" title="Account" />
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.card }]}>
        <View style={[styles.cardRow, { borderBottomColor: t.border }]}>
          <View
            style={[
              styles.accountIconWrap,
              {
                backgroundColor: isGuest ? '#f59e0b33' : `${t.win}33`,
              },
            ]}
          >
            <FontAwesome
              name="user"
              size={22}
              color={isGuest ? '#f59e0b' : t.win}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.accountPrimary, { color: t.foreground }]}>
              {isGuest ? 'Guest Account' : userEmail || 'Signed In'}
            </Text>
            <Text style={[styles.accountSecondary, { color: t.mutedForeground }]}>
              {isGuest
                ? 'Cloud save enabled — link Apple or Google to use this account on other devices'
                : 'Progress synced across devices'}
            </Text>
          </View>
        </View>

        {isGuest && (
          <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }}>
            {showLink ? (
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={[styles.hint, { color: t.mutedForeground }]}>
                  Link Apple or Google so you can sign in on a new device with the same progress
                </Text>
                <AppleSignInButton
                  navigateToTabs={false}
                  style={styles.appleBtnWrap}
                  onSuccess={() => {
                    setShowLink(false)
                    onSocialLinkSuccess?.()
                  }}
                />
                <GoogleSignInButton
                  navigateToTabs={false}
                  style={styles.appleBtnWrap}
                  onSuccess={() => {
                    setShowLink(false)
                    onSocialLinkSuccess?.()
                  }}
                />
                <AppButton variant="ghost" label="Cancel" onPress={() => setShowLink(false)} />
              </View>
            ) : (
              <Pressable
                onPress={() => setShowLink(true)}
                style={styles.linkExpandRow}
              >
                <FontAwesome name="link" size={14} color={t.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: t.foreground }]}>Link Account</Text>
                  <Text style={[styles.rowSub, { color: t.mutedForeground }]}>
                    Save your progress to the cloud
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={12} color={t.mutedForeground} />
              </Pressable>
            )}
          </View>
        )}

        <Pressable
          onPress={restore}
          disabled={restoring}
          style={styles.restoreRow}
        >
          <FontAwesome
            name="refresh"
            size={14}
            color={t.mutedForeground}
            style={restoring ? { opacity: 0.5 } : undefined}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: t.foreground }]}>Restore Purchases</Text>
            <Text style={[styles.rowSub, { color: t.mutedForeground }]}>
              Recover previously purchased items
            </Text>
          </View>
          {restoring ? <ActivityIndicator size="small" /> : null}
        </Pressable>

        {!isGuest ? (
          <Pressable onPress={onSignOut} style={styles.signOutRow}>
            <FontAwesome name="sign-out" size={14} color="#ef4444" />
            <Text style={styles.signOutTxt}>Sign Out ({providerLabel})</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

export function StatsGridSection({
  totalSpins,
  biggestWin,
  dailyStreak,
  themesOwned,
}: {
  totalSpins: number
  biggestWin: number
  dailyStreak: number
  themesOwned: number
}) {
  const t = useCasinoTheme()
  const cells = [
    { label: 'Total Spins', value: totalSpins.toLocaleString(), icon: 'crosshairs' as const },
    { label: 'Biggest Win', value: `$${biggestWin.toLocaleString()}`, icon: 'trophy' as const },
    { label: 'Day Streak', value: dailyStreak.toString(), icon: 'fire' as const },
    { label: 'Themes Owned', value: themesOwned.toString(), icon: 'star' as const },
  ]
  return (
    <View style={styles.statsGrid}>
      {cells.map((c) => (
        <View
          key={c.label}
          style={[styles.statCell, { borderColor: t.border, backgroundColor: t.card }]}
        >
          <FontAwesome name={c.icon} size={14} color={t.primary} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color: t.foreground }]} numberOfLines={2}>
            {c.value}
          </Text>
          <Text style={[styles.statLabel, { color: t.mutedForeground }]}>{c.label}</Text>
        </View>
      ))}
    </View>
  )
}

export function CoinLedgerSection({ entries }: { entries: CoinLedgerEntry[] }) {
  const t = useCasinoTheme()
  const [expanded, setExpanded] = useState(false)

  const visible = expanded ? entries.slice(0, 40) : entries.slice(0, 10)

  return (
    <View style={{ gap: 10 }}>
      <SectionTitle icon="history" title="Coin activity" />
      <Text style={[styles.ledgerHint, { color: t.mutedForeground }]}>
        Recent wins, bets, shop top-ups, and bonuses — saved on this device only.
      </Text>
      {entries.length === 0 ? (
        <Text style={[styles.ledgerEmpty, { color: t.mutedForeground }]}>
          No entries yet — spin the reels or use the shop to see your history here.
        </Text>
      ) : (
        <View style={[styles.ledgerCard, { borderColor: t.border, backgroundColor: t.card }]}>
          {visible.map((e, i) => (
            <View
              key={e.id}
              style={[
                styles.ledgerRow,
                i === visible.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                <Text style={[styles.ledgerLabel, { color: t.foreground }]} numberOfLines={2}>
                  {e.label}
                </Text>
                <Text style={[styles.ledgerTs, { color: t.mutedForeground }]}>
                  {new Date(e.ts).toLocaleString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.ledgerDelta,
                  { color: e.delta >= 0 ? t.win : t.destructive },
                ]}
              >
                {e.delta >= 0 ? '+' : ''}
                {e.delta.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}
      {entries.length > 10 ? (
        <AppButton
          variant="ghost"
          size="sm"
          label={expanded ? 'Show fewer' : `Show more (${entries.length})`}
          onPress={() => setExpanded((x) => !x)}
        />
      ) : null}
    </View>
  )
}

export function EquippedVanitySection({ userVanity }: { userVanity: UserVanity }) {
  const t = useCasinoTheme()
  return (
    <View>
      <SectionTitle icon="star" title="Equipped Items" />
      <View style={styles.equippedGrid}>
        {EQUIPPED_SLOTS.map(({ key, label }) => {
          const itemId = userVanity[key]
          const item = itemId ? ALL_VANITY_ITEMS.find((i) => i.id === itemId) : undefined
          const rarity = item ? RARITY_COLORS[item.rarity] : null
          return (
            <View
              key={key}
              style={[
                styles.equippedCell,
                {
                  borderColor: rarity?.border ?? t.border,
                  backgroundColor: rarity ? rarity.bg : `${t.muted}44`,
                },
              ]}
            >
              <View style={styles.equippedPreview}>
                {item ? (
                  <ItemPreview item={item} size="sm" />
                ) : (
                  <Text style={{ color: t.mutedForeground, fontSize: 18 }}>—</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.equippedCat, { color: t.mutedForeground }]}>{label}</Text>
                <Text
                  style={[styles.equippedName, { color: rarity?.text ?? t.mutedForeground }]}
                  numberOfLines={1}
                >
                  {item ? item.name : 'None'}
                </Text>
                {item ? (
                  <Text style={[styles.equippedRarity, { color: rarity!.text }]}>
                    {RARITY_LABELS[item.rarity]}
                  </Text>
                ) : null}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export function TrophyCaseSection({ trophies }: { trophies: Trophy[] }) {
  const t = useCasinoTheme()
  const unlocked = trophies.filter((x) => x.unlocked).length
  return (
    <View>
      <SectionTitle
        icon="trophy"
        title="Trophy Case"
        right={
          <Text style={[styles.sectionRight, { color: t.mutedForeground }]}>
            {unlocked}/{trophies.length} unlocked
          </Text>
        }
      />
      <View style={styles.trophyGrid}>
        {trophies.map((tr) => (
          <TrophyParityCell key={tr.id} trophy={tr} palette={t} />
        ))}
      </View>
    </View>
  )
}

function TrophyParityCell({ trophy, palette }: { trophy: Trophy; palette: CasinoPalette }) {
  const def = TROPHY_DEFINITIONS.find((d) => d.id === trophy.id)
  const fa = TROPHY_FA[trophy.icon] ?? 'certificate'
  const unlocked = trophy.unlocked
  return (
    <View
      style={[
        styles.trophyCell,
        {
          borderColor: unlocked ? '#f59e0b' : palette.border,
          backgroundColor: unlocked ? '#f59e0b18' : palette.card,
          opacity: unlocked ? 1 : 0.85,
        },
      ]}
    >
      <View
        style={[
          styles.trophyIconRing,
          { backgroundColor: unlocked ? '#f59e0b33' : `${palette.muted}44` },
        ]}
      >
        <FontAwesome name={fa} size={22} color={unlocked ? '#fbbf24' : palette.mutedForeground} />
      </View>
      <Text
        style={[styles.trophyName, { color: unlocked ? '#fbbf24' : palette.mutedForeground }]}
        numberOfLines={2}
      >
        {unlocked ? trophy.name : '???'}
      </Text>
      {def ? (
        <Text
          style={[
            styles.trophyDesc,
            { color: palette.mutedForeground, opacity: unlocked ? 1 : 0.7 },
          ]}
          numberOfLines={unlocked ? 2 : 3}
        >
          {def.description}
        </Text>
      ) : null}
    </View>
  )
}

function winTypeMeta(type: WinType): { label: string; bg: string; fg: string } {
  switch (type) {
    case 'jackpot':
      return { label: 'Jackpot', bg: '#a855f733', fg: '#c084fc' }
    case 'megaWin':
      return { label: 'Mega', bg: '#f59e0b33', fg: '#fbbf24' }
    case 'bigWin':
      return { label: 'Big', bg: '#22c55e33', fg: '#4ade80' }
    default:
      return { label: String(type), bg: '#71717a33', fg: '#a1a1aa' }
  }
}

export function RecentBigWinsSection({
  wins,
}: {
  wins: { amount: number; multiplier: number; timestamp: string; type: WinType }[]
}) {
  const t = useCasinoTheme()
  if (wins.length === 0) return null
  const slice = wins.slice(0, 5)
  return (
    <View>
      <SectionTitle icon="area-chart" title="Recent Big Wins" />
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.card, padding: 0 }]}>
        {slice.map((win, i) => {
          const meta = winTypeMeta(win.type)
          return (
            <View
              key={`${win.timestamp}-${win.amount}-${i}`}
              style={[
                styles.winRow,
                i < slice.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
              ]}
            >
              <View style={styles.winLeft}>
                <View style={[styles.winBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.winBadgeTxt, { color: meta.fg }]}>{meta.label}</Text>
                </View>
                <Text style={[styles.winMult, { color: t.mutedForeground }]}>
                  {win.multiplier.toFixed(1)}x
                </Text>
              </View>
              <View style={styles.winRight}>
                <FontAwesome name="bitcoin" size={14} color={t.primary} />
                <Text style={[styles.winAmt, { color: t.foreground }]}>
                  {win.amount.toLocaleString()}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export function AchievementsGridSection({
  totalSpins,
  biggestWin,
  ownedThemesLength,
  dailyStreak,
  coins,
}: {
  totalSpins: number
  biggestWin: number
  ownedThemesLength: number
  dailyStreak: number
  coins: number
}) {
  const t = useCasinoTheme()
  const achievements = getProfileAchievementProgress({
    totalSpins,
    biggestWin,
    ownedThemesLength,
    dailyStreak,
    coins,
  })
  return (
    <View>
      <SectionTitle icon="certificate" title="Achievements" />
      <View style={styles.achGrid}>
        {achievements.map((a) => {
          const pct = Math.min(100, (a.progress / Math.max(1, a.target)) * 100)
          const fa = ACHIEVEMENT_FA[a.icon]
          return (
            <View
              key={a.id}
              style={[
                styles.achCard,
                {
                  borderColor: a.unlocked ? t.win : t.border,
                  backgroundColor: a.unlocked ? `${t.win}14` : t.card,
                },
              ]}
            >
              <View style={styles.achTop}>
                <View
                  style={[
                    styles.achIconBox,
                    {
                      backgroundColor: a.unlocked ? t.win : t.muted,
                    },
                  ]}
                >
                  <FontAwesome
                    name={fa}
                    size={14}
                    color={a.unlocked ? '#fff' : t.mutedForeground}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.achName, { color: t.foreground }]} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <Text style={[styles.achDesc, { color: t.mutedForeground }]} numberOfLines={2}>
                    {a.description}
                  </Text>
                  {!a.unlocked ? (
                    <View style={{ marginTop: 8 }}>
                      <View style={[styles.progressTrack, { backgroundColor: t.muted }]}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: t.primary }]} />
                      </View>
                      <Text style={[styles.progressLbl, { color: t.mutedForeground }]}>
                        {a.progress.toLocaleString()}/{a.target.toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export function NotificationPrefsSection({
  prefs,
  setPref,
}: {
  prefs: NotificationPrefs
  setPref: (key: keyof NotificationPrefs, value: boolean) => void
}) {
  const t = useCasinoTheme()
  const { resolvedMode, mode } = useAppearance()
  const native = useNativeSemanticColors(mode)

  const expoUiReady = isExpoUiNativeAvailable()
  if ((Platform.OS === 'ios' || Platform.OS === 'android') && expoUiReady) {
    const { ExpoUiNotificationPrefsPilot } =
      require('./ExpoUiNotificationPrefsPilot') as typeof import('./ExpoUiNotificationPrefsPilot')
    return (
      <View>
        <SectionTitle icon="bell" title="Notification Preferences" />
        <ExpoUiNotificationPrefsPilot prefs={prefs} setPref={setPref} resolvedMode={resolvedMode} />
      </View>
    )
  }

  const titleC = native?.label ?? t.foreground
  const subC = native?.secondaryLabel ?? t.mutedForeground
  const sep = native?.separator ?? t.border
  const iconC = native?.rowIcon ?? t.mutedForeground

  return (
    <View>
      <SectionTitle icon="bell" title="Notification Preferences" />
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.card, padding: 0 }]}>
        {NOTIFICATION_PREFS_ROWS_RN.map((row, i) => (
          <Pressable
            key={row.key}
            onPress={() => setPref(row.key, !prefs[row.key])}
            style={[
              styles.prefRow,
              i < NOTIFICATION_PREFS_ROWS_RN.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: sep,
              },
            ]}
          >
            <FontAwesome name={row.icon} size={14} color={iconC} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: titleC }]}>{row.label}</Text>
              <Text style={[styles.rowSub, { color: subC }]}>{row.description}</Text>
            </View>
            <View
              style={[
                styles.switchTrack,
                {
                  backgroundColor: prefs[row.key] ? t.primary : t.muted,
                  justifyContent: prefs[row.key] ? 'flex-end' : 'flex-start',
                },
              ]}
            >
              <View style={styles.switchKnob} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const SESSION_CHIPS: { label: string; value: number | null }[] = [
  { label: 'Off', value: null },
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '2 hr', value: 120 },
]

export function ResponsiblePlaySection({
  sessionReminderMinutes,
  setSessionReminder,
  cooldownEnabled,
  toggleCooldown,
}: {
  sessionReminderMinutes: number | null
  setSessionReminder: (minutes: number | null) => void
  cooldownEnabled: boolean
  toggleCooldown: () => void
}) {
  const t = useCasinoTheme()
  const { mode } = useAppearance()
  const native = useNativeSemanticColors(mode)
  const titleC = native?.label ?? t.foreground
  const subC = native?.secondaryLabel ?? t.mutedForeground
  const sep = native?.separator ?? t.border
  const iconC = native?.rowIcon ?? t.mutedForeground

  return (
    <View>
      <SectionTitle icon="shield" title="Responsible Play" />
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.card, padding: 0 }]}>
        <View style={[styles.prefRow, { flexWrap: 'wrap', gap: 10 }]}>
          <FontAwesome name="clock-o" size={14} color={iconC} />
          <View style={{ flex: 1, minWidth: 140 }}>
            <Text style={[styles.rowTitle, { color: titleC }]}>Session Reminder</Text>
            <Text style={[styles.rowSub, { color: subC }]}>Get reminded after playing</Text>
          </View>
          <View style={styles.chipRow}>
            {SESSION_CHIPS.map((c) => {
              const selected =
                (c.value === null && sessionReminderMinutes === null) ||
                c.value === sessionReminderMinutes
              return (
                <Pressable
                  key={c.label}
                  onPress={() => setSessionReminder(c.value)}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? t.primary : sep,
                      backgroundColor: selected ? `${t.primary}33` : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.chipTxt, { color: selected ? t.primary : titleC }]}>
                    {c.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
        <Pressable onPress={toggleCooldown} style={[styles.prefRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: sep }]}>
          <FontAwesome name="shield" size={14} color={iconC} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.rowTitle, { color: titleC }]}>Cooldown Mode</Text>
            <Text style={[styles.rowSub, { color: subC }]}>
              30 second delay between spins
            </Text>
          </View>
          <View
            style={[
              styles.switchTrack,
              {
                backgroundColor: cooldownEnabled ? t.primary : t.muted,
                justifyContent: cooldownEnabled ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            <View style={styles.switchKnob} />
          </View>
        </Pressable>
      </View>
      <Text style={[styles.disclaimer, { color: subC }]}>
        Play responsibly. This is a simulated casino game for entertainment purposes only.
      </Text>
    </View>
  )
}

export function SupportSection() {
  const t = useCasinoTheme()
  const { mode } = useAppearance()
  const native = useNativeSemanticColors(mode)
  const titleC = native?.label ?? t.foreground
  const sep = native?.separator ?? t.border
  const iconC = native?.rowIcon ?? t.mutedForeground

  const row = async (url: string) => {
    await openExternalUrl(url)
  }
  return (
    <View>
      <SectionTitle icon="question-circle" title="Support" />
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.card, padding: 0 }]}>
        <Pressable
          onPress={() => row(SUPPORT_URLS.helpCenter)}
          style={[styles.supportRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: sep }]}
        >
          <FontAwesome name="question-circle" size={14} color={iconC} />
          <Text style={[styles.rowTitle, { color: titleC, flex: 1 }]}>Help Center</Text>
          <FontAwesome name="chevron-right" size={12} color={iconC} />
        </Pressable>
        <Pressable onPress={() => row(SUPPORT_URLS.contactMail)} style={styles.supportRow}>
          <FontAwesome name="envelope" size={14} color={iconC} />
          <Text style={[styles.rowTitle, { color: titleC, flex: 1 }]}>Contact Support</Text>
          <FontAwesome name="chevron-right" size={12} color={iconC} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionRight: { fontSize: 12, fontWeight: '600' },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accountIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPrimary: { fontSize: 15, fontWeight: '700' },
  accountSecondary: { fontSize: 12, marginTop: 2 },
  hint: { fontSize: 12, marginBottom: 4 },
  appleBtnWrap: { alignSelf: 'stretch', marginBottom: 6 },
  linkBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  linkBtnTxt: { fontWeight: '700', fontSize: 14 },
  linkExpandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  restoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#fecaca55',
    backgroundColor: '#ef444411',
  },
  signOutTxt: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 11, marginTop: 2 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCell: {
    width: '48%',
    flexGrow: 1,
    minWidth: '22%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  statLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  ledgerHint: { fontSize: 12, lineHeight: 16 },
  ledgerEmpty: { fontSize: 13, fontStyle: 'italic' },
  ledgerCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  ledgerLabel: { fontSize: 13, fontWeight: '600' },
  ledgerTs: { fontSize: 10, marginTop: 2 },
  ledgerDelta: { fontSize: 14, fontWeight: '800' },
  equippedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equippedCell: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
  },
  equippedPreview: { width: 40, alignItems: 'center', justifyContent: 'center' },
  equippedCat: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  equippedName: { fontSize: 12, fontWeight: '800' },
  equippedRarity: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
  trophyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trophyCell: {
    width: '31%',
    flexGrow: 1,
    minWidth: 96,
    borderRadius: 14,
    borderWidth: 2,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    minHeight: 120,
  },
  trophyIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyName: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  trophyDesc: { fontSize: 9, textAlign: 'center', lineHeight: 12 },
  winRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  winLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  winBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  winBadgeTxt: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  winMult: { fontSize: 11, fontWeight: '600' },
  winRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  winAmt: { fontSize: 14, fontWeight: '800' },
  achGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  achTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  achIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achName: { fontSize: 12, fontWeight: '700' },
  achDesc: { fontSize: 10, marginTop: 2, lineHeight: 13 },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  progressLbl: { fontSize: 9, marginTop: 4 },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
    flex: 1,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipTxt: { fontSize: 11, fontWeight: '700' },
  disclaimer: { fontSize: 10, marginTop: 8, paddingHorizontal: 4, lineHeight: 14 },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
})
