import { useState, type ReactNode } from 'react'
import { LegalDocumentModal } from '@/components/modals/LegalDocumentModal'
import type { LegalDocType } from '@shared/legal-documents'
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { GoogleSignInButton } from '@/components/social-auth-buttons/google/google-sign-in-button'
import { AppButton } from '@/components/ui/AppButton'
import { ItemPreview } from '@/components/shop/ItemPreview'
import type { AuthProviderKind, NotificationPrefs } from '@/lib/auth-context'
import { useAppearance } from '@/lib/appearance-context'
import { isExpoUiNativeAvailable } from '@/lib/is-expo-ui-native-available'
import { useNativeSemanticColors } from '@/lib/native-semantic-colors'
import { useCasinoTheme, type AppTheme } from '@/lib/use-casino-theme'
import { rarityPresentation } from '@/lib/rarity-from-theme'
import {
  getProfileAchievementProgress,
  type ProfileAchievementIconId,
} from '@/lib/profile-achievements'
import { openExternalUrl, SUPPORT_URLS } from '@/lib/support-links'
import { hexWithAlpha } from '@/theme/tokens'
import type { CoinLedgerEntry, WinType } from '@/lib/game-context'
import { getWinTypeDisplayTitle, isEngineWinType } from '@/lib/vault-copy'
import {
  ALL_VANITY_ITEMS,
  RARITY_LABELS,
  TROPHY_DEFINITIONS,
  type Trophy,
  type UserVanity,
} from '@/lib/vanity-data'

/**
 * Convert internal coin-ledger labels into clean user-facing copy.
 * Only changes the display string — no IDs or database fields are touched.
 */
function formatLedgerLabel(raw: string): string {
  // "Vanity avatar-lucky" → "Avatar Unlock"
  const vanityMatch = raw.match(/^Vanity\s+(\w+)-(.+)$/i)
  if (vanityMatch) {
    const cat = vanityMatch[1]
    if (!cat) return raw
    return `${cat.charAt(0).toUpperCase() + cat.slice(1)} Unlock`
  }

  // "Coin pack (com.spinvault.deal.daily)" → friendly name
  const coinPackMatch = raw.match(/^Coin pack \(([^)]+)\)$/i)
  if (coinPackMatch) {
    const sku = coinPackMatch[1] ?? ''
    if (sku.includes('daily')) return 'Daily Deal Coin Pack'
    if (sku.includes('starter')) return 'Starter Coin Pack'
    if (sku.includes('mega')) return 'Mega Coin Pack'
    return 'Coin Pack'
  }

  // "Spin win (bigWin)" → "Big Win", "Spin win (normal)" → "Win", etc.
  const spinWinMatch = raw.match(/^Spin win \(([^)]+)\)$/i)
  if (spinWinMatch) {
    const tier = spinWinMatch[1] ?? ''
    return isEngineWinType(tier) ? getWinTypeDisplayTitle(tier) : getWinTypeDisplayTitle('normal')
  }

  return raw
}

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
  coins: 'circle',
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
  coins: 'circle',
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
        <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>{title}</Text>
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
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}>
        <View style={[styles.cardRow, { borderBottomColor: t.border }]}>
          <View
            style={[
              styles.accountIconWrap,
              {
                backgroundColor: isGuest ? hexWithAlpha(t.accent, '22') : hexWithAlpha(t.win, '33'),
              },
            ]}
          >
            <FontAwesome
              name="user"
              size={22}
              color={isGuest ? t.accent : t.win}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.accountPrimary, { color: t.textPrimary }]}>
              {isGuest ? 'Guest Account' : userEmail || 'Signed In'}
            </Text>
            <Text style={[styles.accountSecondary, { color: t.textSecondary }]}>
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
                <Text style={[styles.hint, { color: t.textMuted }]}>
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
                  <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Link Account</Text>
                  <Text style={[styles.rowSub, { color: t.textMuted }]}>
                    Save your progress to the cloud
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={12} color={t.textMuted} />
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
            color={t.textMuted}
            style={restoring ? { opacity: 0.5 } : undefined}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Restore Purchases</Text>
            <Text style={[styles.rowSub, { color: t.textMuted }]}>
              Recover previously purchased items
            </Text>
          </View>
          {restoring ? <ActivityIndicator size="small" /> : null}
        </Pressable>

        {!isGuest ? (
          <Pressable
            onPress={() =>
              Alert.alert(
                'Sign out',
                'You will be signed out of your account. Make sure your progress is synced before continuing.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign out', style: 'destructive', onPress: onSignOut },
                ],
              )
            }
            style={({ pressed }) => [
              styles.signOutRow,
              {
                borderTopColor: hexWithAlpha(t.destructive, '44'),
                backgroundColor: hexWithAlpha(t.destructive, '0C'),
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <FontAwesome name="sign-out" size={14} color={t.destructive} />
            <Text style={[styles.signOutTxt, { color: t.destructive }]}>Sign Out ({providerLabel})</Text>
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
  totalWins,
}: {
  totalSpins: number
  biggestWin: number
  dailyStreak: number
  themesOwned: number
  totalWins: number
}) {
  const t = useCasinoTheme()
  const cells = [
    { label: 'Total spins', value: totalSpins.toLocaleString(), icon: 'crosshairs' as const },
    { label: 'Spin wins', value: totalWins.toLocaleString(), icon: 'check-circle' as const },
    {
      label: 'Best spin (Vault Coins)',
      value: biggestWin.toLocaleString(),
      icon: 'trophy' as const,
    },
    { label: 'Streak', value: dailyStreak.toString(), icon: 'fire' as const },
    { label: 'Themes', value: themesOwned.toString(), icon: 'star' as const },
  ]
  return (
    <View style={{ gap: 10 }}>
      <SectionTitle icon="bar-chart" title="Progress & stats" />
      <View style={styles.statsGrid}>
        {cells.map((c) => (
          <View
            key={c.label}
            style={[styles.statCell, { borderColor: t.border, backgroundColor: t.cardSoft }]}
          >
            <FontAwesome name={c.icon} size={14} color={t.primary} style={{ marginBottom: 4 }} />
            <Text style={[styles.statValue, { color: t.textPrimary }]} numberOfLines={2}>
              {c.value}
            </Text>
            <Text style={[styles.statLabel, { color: t.textMuted }]}>{c.label}</Text>
          </View>
        ))}
      </View>
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
      <Text style={[styles.ledgerHint, { color: t.textMuted }]}>
        Recent rewards, spins, and bonuses — saved on this device for reference only.
      </Text>
      {entries.length === 0 ? (
        <Text style={[styles.ledgerEmpty, { color: t.textMuted }]}>
          No entries yet — spin the reels or use the shop to see your history here.
        </Text>
      ) : (
        <View style={[styles.ledgerCard, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}>
          {visible.map((e, i) => (
            <View
              key={e.id}
              style={[
                styles.ledgerRow,
                { borderBottomColor: t.border },
                i === visible.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                <Text style={[styles.ledgerLabel, { color: t.textPrimary }]} numberOfLines={2}>
                  {formatLedgerLabel(e.label)}
                </Text>
                <Text style={[styles.ledgerTs, { color: t.textMuted }]}>
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
      <SectionTitle icon="star" title="Showcase loadout" />
      <View style={styles.equippedGrid}>
        {EQUIPPED_SLOTS.map(({ key, label }) => {
          const itemId = userVanity[key]
          const item = itemId ? ALL_VANITY_ITEMS.find((i) => i.id === itemId) : undefined
          const rarity = item ? rarityPresentation(t, item.rarity) : null
          return (
            <View
              key={key}
              style={[
                styles.equippedCell,
                {
                  borderColor: rarity?.border ?? t.border,
                  backgroundColor: rarity ? rarity.bg : hexWithAlpha(t.locked, '22'),
                },
              ]}
            >
              <View style={styles.equippedPreview}>
                {item ? (
                  <ItemPreview item={item} size="sm" />
                ) : (
                  <Text style={{ color: t.textMuted, fontSize: 18 }}>—</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.equippedCatRow}>
                  <Text style={[styles.equippedCat, { color: t.textMuted }]}>{label}</Text>
                  {item ? (
                    <View style={[styles.equippedBadge, { backgroundColor: hexWithAlpha(rarity?.text ?? t.primary, '28'), borderColor: rarity?.border ?? t.border }]}>
                      <Text style={[styles.equippedBadgeTxt, { color: rarity?.text ?? t.primary }]}>
                        Equipped
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[styles.equippedName, { color: rarity?.text ?? t.textMuted }]}
                  numberOfLines={1}
                >
                  {item ? item.name : 'None'}
                </Text>
                {item && rarity ? (
                  <Text style={[styles.equippedRarity, { color: rarity.text }]}>
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
          <Text style={[styles.sectionRight, { color: t.textMuted }]}>
            {unlocked}/{trophies.length} unlocked
          </Text>
        }
      />
      <View style={styles.trophyGrid}>
        {trophies.map((tr) => (
          <TrophyParityCell key={tr.id} trophy={tr} t={t} />
        ))}
      </View>
    </View>
  )
}

function TrophyParityCell({ trophy, t }: { trophy: Trophy; t: AppTheme }) {
  const def = TROPHY_DEFINITIONS.find((d) => d.id === trophy.id)
  const fa = TROPHY_FA[trophy.icon] ?? 'certificate'
  const unlocked = trophy.unlocked
  const prestige = t.gold
  return (
    <View
      style={[
        styles.trophyCell,
        {
          borderColor: unlocked ? prestige : t.border,
          backgroundColor: unlocked ? hexWithAlpha(prestige, '18') : t.cardSoft,
          opacity: unlocked ? 1 : 0.85,
        },
      ]}
    >
      <View
        style={[
          styles.trophyIconRing,
          {
            backgroundColor: unlocked ? hexWithAlpha(prestige, '33') : hexWithAlpha(t.muted, '44'),
          },
        ]}
      >
        <FontAwesome name={fa} size={22} color={unlocked ? prestige : t.textMuted} />
      </View>
      <Text
        style={[styles.trophyName, { color: unlocked ? prestige : t.textMuted }]}
        numberOfLines={2}
      >
        {unlocked ? trophy.name : '???'}
      </Text>
      {def ? (
        <Text
          style={[
            styles.trophyDesc,
            { color: t.textMuted, opacity: unlocked ? 1 : 0.7 },
          ]}
          numberOfLines={unlocked ? 2 : 3}
        >
          {def.description}
        </Text>
      ) : null}
    </View>
  )
}

function winTypeMeta(theme: AppTheme, type: WinType): { label: string; bg: string; fg: string } {
  const muted = theme.textMuted ?? '#64748b'
  switch (type) {
    case 'none':
      return {
        label: getWinTypeDisplayTitle('none'),
        bg: hexWithAlpha(muted, '22'),
        fg: muted,
      }
    case 'jackpot':
      return {
        label: getWinTypeDisplayTitle('jackpot'),
        bg: hexWithAlpha(theme.jackpot ?? '#a855f7', '33'),
        fg: theme.jackpot ?? '#a855f7',
      }
    case 'megaWin':
      return {
        label: getWinTypeDisplayTitle('megaWin'),
        bg: hexWithAlpha(theme.gold ?? '#f59e0b', '33'),
        fg: theme.gold ?? '#f59e0b',
      }
    case 'bigWin':
      return {
        label: getWinTypeDisplayTitle('bigWin'),
        bg: hexWithAlpha(theme.win ?? '#22c55e', '33'),
        fg: theme.win ?? '#22c55e',
      }
    case 'normal':
      return {
        label: getWinTypeDisplayTitle('normal'),
        bg: hexWithAlpha(muted, '33'),
        fg: muted,
      }
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
      <SectionTitle icon="area-chart" title="Recent wins" />
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.surfaceElevated, padding: 0 }]}>
        {slice.map((win, i) => {
          const meta = winTypeMeta(t, win.type)
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
                <Text style={[styles.winMult, { color: t.textMuted }]}>
                  {win.multiplier.toFixed(1)}x
                </Text>
              </View>
              <View style={styles.winRight}>
                <FontAwesome name="circle" size={14} color={t.gold} />
                <Text style={[styles.winAmt, { color: t.textPrimary }]}>
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
                  backgroundColor: a.unlocked ? hexWithAlpha(t.win, '14') : t.cardSoft,
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
                    color={a.unlocked ? t.background : t.textMuted}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.achName, { color: t.textPrimary }]} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <Text style={[styles.achDesc, { color: t.textMuted }]} numberOfLines={2}>
                    {a.description}
                  </Text>
                  {!a.unlocked ? (
                    <View style={{ marginTop: 8 }}>
                      <View style={[styles.progressTrack, { backgroundColor: t.muted }]}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: t.primary }]} />
                      </View>
                      <Text style={[styles.progressLbl, { color: t.textMuted }]}>
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

  const titleC = native?.label ?? t.textPrimary
  const subC = native?.secondaryLabel ?? t.textSecondary
  const sep = native?.separator ?? t.border
  const iconC = native?.rowIcon ?? t.textMuted

  return (
    <View>
      <SectionTitle icon="bell" title="Notification Preferences" />
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.surfaceElevated, padding: 0 }]}>
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
              <View style={[styles.switchKnob, { backgroundColor: t.surfaceElevated }]} />
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

// TODO(launch): Enforce dailyPurchaseLimit in the shop purchase flow before enabling this UI.
// Values are stored but the spending cap is not yet enforced — see shop/index.tsx onCoinPack.
const PURCHASE_LIMIT_CHIPS: { label: string; value: number | null }[] = [
  { label: 'Off', value: null },
  { label: '$10 / day', value: 10 },
  { label: '$25 / day', value: 25 },
  { label: '$50 / day', value: 50 },
]

export function ResponsiblePlaySection({
  sessionReminderMinutes,
  setSessionReminder,
  dailyPurchaseLimit,
  setPurchaseLimit,
  cooldownEnabled,
  toggleCooldown,
}: {
  sessionReminderMinutes: number | null
  setSessionReminder: (minutes: number | null) => void
  dailyPurchaseLimit: number | null
  setPurchaseLimit: (limit: number | null) => void
  cooldownEnabled: boolean
  toggleCooldown: () => void
}) {
  const t = useCasinoTheme()
  const { mode } = useAppearance()
  const native = useNativeSemanticColors(mode)
  const titleC = native?.label ?? t.textPrimary
  const subC = native?.secondaryLabel ?? t.textSecondary
  const sep = native?.separator ?? t.border
  const iconC = native?.rowIcon ?? t.textMuted

  return (
    <View>
      <SectionTitle icon="shield" title="Responsible Play" />
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.surfaceElevated, padding: 0 }]}>
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
                      backgroundColor: selected ? hexWithAlpha(t.primary, '33') : 'transparent',
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
        {/* TODO(launch): Remove opacity/disabled once cooldown is enforced in ControlDeck spin path. */}
        <Pressable
          onPress={toggleCooldown}
          style={[styles.prefRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: sep, opacity: 0.5 }]}
          accessibilityState={{ disabled: true }}
          disabled
        >
          <FontAwesome name="shield" size={14} color={iconC} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.rowTitle, { color: titleC }]}>Cooldown Mode</Text>
            <Text style={[styles.rowSub, { color: subC }]}>
              30 second delay between spins — coming soon
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
            <View style={[styles.switchKnob, { backgroundColor: t.surfaceElevated }]} />
          </View>
        </Pressable>
        {/* TODO(launch): Remove "coming soon" note once daily spend cap is enforced in shop/index.tsx. */}
        <View style={[styles.prefRowCol, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: sep }]}>
          <View style={styles.prefRowColHeader}>
            <FontAwesome name="credit-card" size={14} color={iconC} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: titleC }]}>Daily Purchase Limit</Text>
              <Text style={[styles.rowSub, { color: subC }]}>
                Spend cap — coming soon
              </Text>
            </View>
          </View>
          <View style={styles.chipRowFull}>
            {PURCHASE_LIMIT_CHIPS.map((c) => {
              const selected =
                (c.value === null && dailyPurchaseLimit === null) ||
                c.value === dailyPurchaseLimit
              return (
                <Pressable
                  key={c.label}
                  onPress={() => setPurchaseLimit(c.value)}
                  style={[
                    styles.chipFull,
                    {
                      borderColor: selected ? t.primary : sep,
                      backgroundColor: selected ? hexWithAlpha(t.primary, '33') : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipTxt, { color: selected ? t.primary : titleC }]}>
                    {c.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>
      <Text style={[styles.disclaimer, { color: subC }]}>
        Play responsibly. Vault Coins are for in-game entertainment only and have no cash value. SpinVault does not offer
        real-money gambling or cash prizes.
      </Text>
    </View>
  )
}

export function SupportSection() {
  const t = useCasinoTheme()
  const { mode } = useAppearance()
  const native = useNativeSemanticColors(mode)
  const titleC = native?.label ?? t.textPrimary
  const sep = native?.separator ?? t.border
  const iconC = native?.rowIcon ?? t.textMuted
  const [legalModal, setLegalModal] = useState<LegalDocType | null>(null)

  return (
    <>
      <View>
        <SectionTitle icon="question-circle" title="Support" />
        <View style={[styles.card, { borderColor: t.border, backgroundColor: t.surfaceElevated, padding: 0 }]}>
          <Pressable
            onPress={() => openExternalUrl(SUPPORT_URLS.helpCenter)}
            style={[styles.supportRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: sep }]}
          >
            <FontAwesome name="question-circle" size={14} color={iconC} />
            <Text style={[styles.rowTitle, { color: titleC, flex: 1 }]}>Help Center</Text>
            <FontAwesome name="chevron-right" size={12} color={iconC} />
          </Pressable>
          <Pressable
            onPress={() => openExternalUrl(SUPPORT_URLS.contactMail)}
            style={[styles.supportRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: sep }]}
          >
            <FontAwesome name="envelope" size={14} color={iconC} />
            <Text style={[styles.rowTitle, { color: titleC, flex: 1 }]}>Contact Support</Text>
            <FontAwesome name="chevron-right" size={12} color={iconC} />
          </Pressable>
          <Pressable
            onPress={() => setLegalModal('privacy')}
            style={[styles.supportRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: sep }]}
          >
            <FontAwesome name="file-text-o" size={14} color={iconC} />
            <Text style={[styles.rowTitle, { color: titleC, flex: 1 }]}>Privacy Policy</Text>
            <FontAwesome name="chevron-right" size={12} color={iconC} />
          </Pressable>
          <Pressable onPress={() => setLegalModal('terms')} style={styles.supportRow}>
            <FontAwesome name="file-text-o" size={14} color={iconC} />
            <Text style={[styles.rowTitle, { color: titleC, flex: 1 }]}>Terms of Service</Text>
            <FontAwesome name="chevron-right" size={12} color={iconC} />
          </Pressable>
        </View>
      </View>

      {/* Always mounted so the slide-out dismiss animation plays correctly. */}
      <LegalDocumentModal
        visible={legalModal !== null}
        type={legalModal ?? 'terms'}
        onClose={() => setLegalModal(null)}
      />
    </>
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
  },
  signOutTxt: { fontWeight: '700', fontSize: 14 },
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
  equippedCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 2,
  },
  equippedCat: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  equippedBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  equippedBadgeTxt: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
  prefRowCol: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  prefRowColHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  chipRowFull: {
    flexDirection: 'row',
    gap: 8,
  },
  chipFull: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  disclaimer: { fontSize: 10, marginTop: 8, paddingHorizontal: 4, lineHeight: 14 },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
})
