import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Toast from 'react-native-toast-message'
import { EditProfileSheet } from '@/components/profile/EditProfileSheet'
import { HelpFeedback } from '@/components/profile/HelpFeedback'
import {
  AccountSection,
  AchievementsGridSection,
  CoinLedgerSection,
  EquippedVanitySection,
  NotificationPrefsSection,
  RecentBigWinsSection,
  ResponsiblePlaySection,
  StatsGridSection,
  SupportSection,
  TrophyCaseSection,
} from '@/components/profile/parity-sections'
import { AppButton } from '@/components/ui/AppButton'
import { AppScrollView } from '@/components/ui/AppScrollView'
import type { AppearanceMode } from '@/lib/appearance-context'
import { useAppearance } from '@/lib/appearance-context'
import type { AuthProviderKind } from '@/lib/auth-context'
import { useAuth } from '@/lib/auth-context'
import { useGame } from '@/lib/game-context'
import { SCREEN_PAD_H } from '@/lib/screen-edge'
import { useCasinoTheme, type AppTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'

function accountProviderBadge(isGuest: boolean, provider: AuthProviderKind | undefined): string {
  if (isGuest) return 'Guest'
  if (provider === 'apple') return 'Apple'
  if (provider === 'google') return 'Google'
  if (provider === 'email') return 'Email'
  return 'Signed in'
}

const VIP_TIER_DEFS = [
  { level: 1, name: 'Bronze', minXp: 0 },
  { level: 2, name: 'Silver', minXp: 5000 },
  { level: 3, name: 'Gold', minXp: 15000 },
  { level: 4, name: 'Platinum', minXp: 50000 },
  { level: 5, name: 'Diamond', minXp: 150000 },
] as const

function vipTierAccent(t: AppTheme, level: number): string {
  switch (level) {
    case 1:
      return t.rarity.common
    case 2:
      return t.textMuted
    case 3:
      return t.gold
    case 4:
      return t.freeSpin
    case 5:
      return t.rarity.mythic
    default:
      return t.primary
  }
}

export default function ProfileScreen() {
  const t = useCasinoTheme()
  const insets = useSafeAreaInsets()
  const {
    username,
    setUsername,
    bio,
    setBio,
    avatarUri,
    setAvatarUri,
    level,
    xp,
    coins,
    totalSpins,
    biggestWin,
    totalWins,
    dailyStreak,
    ownedThemes,
    userVanity,
    recentBigWins,
    coinLedger,
    soundEnabled,
    musicEnabled,
    hapticsEnabled,
    notificationsEnabled,
    toggleSound,
    toggleMusic,
    toggleHaptics,
    toggleNotifications,
    sessionReminderMinutes,
    setSessionReminder,
    cooldownEnabled,
    toggleCooldown,
    dailyPurchaseLimit,
    setPurchaseLimit,
    trophies,
  } = useGame()

  const {
    user,
    isGuest,
    signOut,
    restorePurchases,
    notificationPrefs,
    setNotificationPref,
  } = useAuth()

  const { mode: appearanceMode, setMode: setAppearanceMode } = useAppearance()

  const [editOpen, setEditOpen] = useState(false)

  const xpNeeded = level * 1000
  const xpPct = Math.min(100, Math.round((xp / Math.max(1, xpNeeded)) * 100))
  const totalXp = level * 1000 + xp

  const currentVip =
    [...VIP_TIER_DEFS].reverse().find((ti) => totalXp >= ti.minXp) ?? VIP_TIER_DEFS[0]
  const nextVip = VIP_TIER_DEFS.find((ti) => ti.minXp > totalXp)
  const vipAccent = vipTierAccent(t, currentVip.level)
  const vipBarPct =
    nextVip != null
      ? Math.min(
          100,
          ((totalXp - currentVip.minXp) / Math.max(1, nextVip.minXp - currentVip.minXp)) * 100,
        )
      : 100

  const onRestore = async () => {
    const ok = await restorePurchases()
    if (ok) {
      Toast.show({ type: 'success', text1: 'Restore complete', text2: 'Your purchases have been restored.' })
    } else {
      Toast.show({ type: 'error', text1: 'Restore failed — try again', text2: 'If the issue persists, contact support.' })
    }
  }

  const appearanceOptions: { id: AppearanceMode; label: string }[] = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'system', label: 'System' },
  ]

  const bottomPad = Math.max(insets.bottom, 12) + 64

  return (
    <AppScrollView
      style={[styles.scroll, { backgroundColor: t.background }]}
      contentContainerStyle={[
        styles.pad,
        { paddingHorizontal: SCREEN_PAD_H, paddingBottom: bottomPad },
      ]}
    >
      <Text style={[styles.lead, { color: t.textSecondary }]}>
        Your vault identity, collections & settings
      </Text>

      <LinearGradient
        colors={[hexWithAlpha(t.primary, '22'), t.surfaceElevated, hexWithAlpha(t.primary, '11')]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderColor: t.border }]}
      >
        <View style={styles.heroTop}>
          <View style={styles.avatarCol}>
            <View style={[styles.avatarRing, { borderColor: vipAccent }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarPhoto} />
              ) : (
                <View style={[styles.avatarInner, { backgroundColor: t.surfaceElevated }]}>
                  <FontAwesome name="user" size={28} color={t.textPrimary} />
                </View>
              )}
            </View>
            <View
              style={[
                styles.vipPill,
                {
                  borderWidth: 1,
                  borderColor: vipAccent,
                  backgroundColor: hexWithAlpha(vipAccent, '33'),
                },
              ]}
            >
              <FontAwesome name="star" size={10} color={vipAccent} />
              <Text style={[styles.vipPillTxt, { color: t.textPrimary }]}>{currentVip.name}</Text>
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.nameRow}>
              <Text style={[styles.username, { color: t.textPrimary }]} numberOfLines={1}>
                {username}
              </Text>
              <AppButton variant="ghost" size="sm" label="Edit" onPress={() => setEditOpen(true)} />
            </View>
            {bio ? (
              <Text style={[styles.heroBio, { color: t.textSecondary }]} numberOfLines={2}>
                {bio}
              </Text>
            ) : null}
            <View style={styles.badgeRow}>
              <View style={[styles.levelPill, { backgroundColor: hexWithAlpha(t.primary, '33') }]}>
                <Text style={[styles.levelPillTxt, { color: t.primary }]}>Lv {level}</Text>
              </View>
              <View
                style={[
                  styles.levelPill,
                  {
                    backgroundColor: isGuest
                      ? hexWithAlpha(t.accent, '22')
                      : hexWithAlpha(t.win, '33'),
                  },
                ]}
              >
                <Text style={[styles.levelPillTxt, { color: isGuest ? t.accent : t.win }]}>
                  {accountProviderBadge(isGuest, user?.provider)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {nextVip ? (
          <View style={{ marginTop: 12 }}>
            <View style={styles.vipLblRow}>
              <Text style={[styles.vipLbl, { color: t.textMuted }]}>{currentVip.name}</Text>
              <Text style={[styles.vipLbl, { color: t.textMuted }]}>{nextVip.name}</Text>
            </View>
            <View style={[styles.vipTrack, { backgroundColor: t.muted }]}>
              <View
                style={[styles.vipFill, { width: `${vipBarPct}%`, backgroundColor: vipAccent }]}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.heroStats}>
          <View style={[styles.statCard, { backgroundColor: t.cardSoft }]}>
            <Text style={[styles.statLbl, { color: t.textMuted }]}>
              Level {level} · XP {Math.min(xp, xpNeeded)}/{xpNeeded}
            </Text>
            <View style={[styles.xpTrack, { backgroundColor: t.muted }]}>
              <View style={[styles.xpFill, { width: `${xpPct}%`, backgroundColor: t.primary }]} />
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: t.cardSoft }]}>
            <Text style={[styles.statLbl, { color: t.textMuted }]}>Coins</Text>
            <View style={styles.walletRow}>
              <FontAwesome name="circle" size={14} color={t.gold} />
              <Text style={[styles.walletAmt, { color: t.textPrimary }]}>{coins.toLocaleString()}</Text>
            </View>
            <Text style={[styles.walletHint, { color: t.textMuted }]}>Virtual coins</Text>
          </View>
        </View>
      </LinearGradient>

      <AccountSection
        isGuest={isGuest}
        userEmail={user?.email}
        userProvider={user?.provider}
        onSocialLinkSuccess={() =>
          Toast.show({ type: 'success', text1: 'Account linked' })
        }
        onRestore={onRestore}
        onSignOut={signOut}
      />

      <StatsGridSection
        totalSpins={totalSpins}
        biggestWin={biggestWin}
        totalWins={totalWins}
        dailyStreak={dailyStreak}
        themesOwned={ownedThemes.length}
      />

      <CoinLedgerSection entries={coinLedger} />

      <EquippedVanitySection userVanity={userVanity} />

      <TrophyCaseSection trophies={trophies} />

      <RecentBigWinsSection wins={recentBigWins} />

      <AchievementsGridSection
        totalSpins={totalSpins}
        biggestWin={biggestWin}
        ownedThemesLength={ownedThemes.length}
        dailyStreak={dailyStreak}
        coins={coins}
      />

      <NotificationPrefsSection
        prefs={notificationPrefs}
        setPref={(key, value) => setNotificationPref(key, value)}
      />

      <Text style={[styles.h3, { color: t.textPrimary }]}>Appearance</Text>
      <View style={styles.row}>
        {appearanceOptions.map((o) => (
          <AppButton
            key={o.id}
            variant={appearanceMode === o.id ? 'primary' : 'outline'}
            label={o.label}
            onPress={() => setAppearanceMode(o.id)}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      <Text style={[styles.h3, { color: t.textPrimary }]}>Settings</Text>
      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}>
        <ToggleRow
          label="Sound Effects"
          description="Reels, wins, and UI sounds"
          on={soundEnabled}
          onToggle={toggleSound}
          t={t}
        />
        <ToggleRow
          label="Background Music"
          description="Lobby and ambient music"
          on={musicEnabled}
          onToggle={toggleMusic}
          t={t}
        />
        <ToggleRow
          label="Haptic Feedback"
          description="Vibration on spins and big wins"
          on={hapticsEnabled}
          onToggle={toggleHaptics}
          t={t}
        />
        <ToggleRow
          label="Push Notifications"
          description="System alerts when enabled on this device"
          on={notificationsEnabled}
          onToggle={toggleNotifications}
          t={t}
          isLast
        />
      </View>

      <ResponsiblePlaySection
        sessionReminderMinutes={sessionReminderMinutes}
        setSessionReminder={setSessionReminder}
        dailyPurchaseLimit={dailyPurchaseLimit}
        setPurchaseLimit={setPurchaseLimit}
        cooldownEnabled={cooldownEnabled}
        toggleCooldown={toggleCooldown}
      />

      <HelpFeedback />

      <SupportSection />

      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        username={username}
        bio={bio}
        avatarUri={avatarUri}
        isGuest={isGuest}
        onSaveName={(n) => {
          setUsername(n)
          Toast.show({ type: 'success', text1: 'Profile updated' })
        }}
        onSaveBio={setBio}
        onSaveAvatar={setAvatarUri}
      />
    </AppScrollView>
  )
}

function ToggleRow({
  label,
  description,
  on,
  onToggle,
  t,
  isLast,
}: {
  label: string
  description?: string
  on: boolean
  onToggle: () => void
  t: ReturnType<typeof useCasinoTheme>
  /** Omit bottom border on last row */
  isLast?: boolean
}) {
  return (
    <View
      style={[
        styles.toggleRow,
        { borderColor: t.border },
        isLast && { borderBottomWidth: 0 },
      ]}
    >
      <View style={styles.toggleLabelCol}>
        <Text style={{ color: t.textPrimary, fontWeight: '600' }}>{label}</Text>
        {description ? (
          <Text style={[styles.toggleDesc, { color: t.textSecondary }]}>{description}</Text>
        ) : null}
      </View>
      <AppButton size="sm" variant={on ? 'primary' : 'outline'} label={on ? 'On' : 'Off'} onPress={onToggle} />
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  pad: { gap: 14, paddingTop: 8 },
  lead: { fontSize: 14, fontWeight: '600' },
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  heroBio: { fontSize: 12, lineHeight: 17, marginTop: 2, marginBottom: 2 },
  avatarCol: {
    alignItems: 'center',
    gap: 6,
  },
  vipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  vipPillTxt: { fontSize: 10, fontWeight: '900' },
  walletHint: { fontSize: 9, fontWeight: '600', marginTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  username: { fontSize: 20, fontWeight: '900', flex: 1 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  levelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  levelPillTxt: { fontSize: 11, fontWeight: '800' },
  vipLblRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  vipLbl: { fontSize: 10 },
  vipTrack: { height: 6, borderRadius: 999, overflow: 'hidden' },
  vipFill: { height: '100%', borderRadius: 999 },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, gap: 8 },
  statLbl: { fontSize: 11, fontWeight: '600' },
  xpTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 999 },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletAmt: { fontSize: 16, fontWeight: '900' },
  h3: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', gap: 8 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabelCol: { flex: 1, paddingRight: 10, minWidth: 0 },
  toggleDesc: { fontSize: 12, marginTop: 3, lineHeight: 16 },
})
