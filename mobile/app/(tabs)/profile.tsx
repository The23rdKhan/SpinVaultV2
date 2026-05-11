import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { AppButton } from '@/components/ui/AppButton'
import type { AppearanceMode } from '@/lib/appearance-context'
import { useAppearance } from '@/lib/appearance-context'
import { useAuth } from '@/lib/auth-context'
import { useGame } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import type { CasinoPalette } from '@/theme/tokens'

export default function ProfileScreen() {
  const t = useCasinoTheme()
  const {
    username,
    setUsername,
    level,
    xp,
    coins,
    totalSpins,
    biggestWin,
    dailyStreak,
    soundEnabled,
    musicEnabled,
    hapticsEnabled,
    notificationsEnabled,
    toggleSound,
    toggleMusic,
    toggleHaptics,
    toggleNotifications,
    trophies,
  } = useGame()

  const { user, isGuest, signOut, restorePurchases } = useAuth()
  const { mode: appearanceMode, setMode: setAppearanceMode } = useAppearance()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(username)

  const xpNeeded = level * 1000
  const xpPct = Math.min(100, Math.round((xp / xpNeeded) * 100))

  const saveName = () => {
    if (name.trim()) setUsername(name.trim())
    setEditing(false)
    Toast.show({ type: 'success', text1: 'Profile updated' })
  }

  const onRestore = async () => {
    await restorePurchases()
    Toast.show({ type: 'info', text1: 'Restore complete (simulated)' })
  }

  const appearanceOptions: { id: AppearanceMode; label: string }[] = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'system', label: 'System' },
  ]

  const unlockedTrophies = trophies.filter((x) => x.unlocked).length

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: t.background }]} contentContainerStyle={styles.pad}>
      <Text style={[styles.h2, { color: t.foreground }]}>Profile</Text>

      <View style={[styles.card, { borderColor: t.border }]}>
        <Text style={[styles.label, { color: t.mutedForeground }]}>Display name</Text>
        {editing ? (
          <>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: t.foreground, borderColor: t.border }]}
            />
            <AppButton label="Save" onPress={saveName} style={{ marginTop: 8 }} />
          </>
        ) : (
          <>
            <Text style={[styles.big, { color: t.foreground }]}>{username}</Text>
            <AppButton variant="outline" label="Edit" onPress={() => setEditing(true)} style={{ marginTop: 8 }} />
          </>
        )}
        <Text style={[styles.muted, { color: t.mutedForeground }]}>
          {user?.provider ?? 'guest'} {isGuest ? '(guest)' : ''}
        </Text>
      </View>

      <View style={[styles.card, { borderColor: t.border }]}>
        <Text style={[styles.label, { color: t.mutedForeground }]}>Level {level}</Text>
        <Text style={[styles.muted, { color: t.mutedForeground }]}>
          XP {xp}/{xpNeeded} ({xpPct}%)
        </Text>
        <Text style={[styles.stat, { color: t.foreground }]}>Coins: {coins.toLocaleString()}</Text>
        <Text style={[styles.stat, { color: t.foreground }]}>Spins: {totalSpins}</Text>
        <Text style={[styles.stat, { color: t.foreground }]}>Best win: {biggestWin}</Text>
        <Text style={[styles.stat, { color: t.foreground }]}>Streak: {dailyStreak}d</Text>
        <Text style={[styles.stat, { color: t.foreground }]}>
          Trophies: {unlockedTrophies}/{trophies.length}
        </Text>
      </View>

      <Text style={[styles.h3, { color: t.foreground }]}>Appearance</Text>
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

      <Text style={[styles.h3, { color: t.foreground }]}>Preferences</Text>
      <ToggleRow label="Sound" on={soundEnabled} onToggle={toggleSound} t={t} />
      <ToggleRow label="Music" on={musicEnabled} onToggle={toggleMusic} t={t} />
      <ToggleRow label="Haptics" on={hapticsEnabled} onToggle={toggleHaptics} t={t} />
      <ToggleRow label="Notifications" on={notificationsEnabled} onToggle={toggleNotifications} t={t} />

      <AppButton variant="outline" label="Restore purchases" onPress={onRestore} style={{ marginTop: 12 }} />
      <AppButton variant="destructive" label="Sign out" onPress={signOut} style={{ marginTop: 8 }} />
    </ScrollView>
  )
}

function ToggleRow({
  label,
  on,
  onToggle,
  t,
}: {
  label: string
  on: boolean
  onToggle: () => void
  t: CasinoPalette
}) {
  return (
    <View style={[styles.toggleRow, { borderColor: t.border }]}>
      <Text style={{ color: t.foreground, fontWeight: '600' }}>{label}</Text>
      <AppButton size="sm" variant={on ? 'primary' : 'outline'} label={on ? 'On' : 'Off'} onPress={onToggle} />
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  pad: { padding: 16, paddingBottom: 48, gap: 12 },
  h2: { fontSize: 22, fontWeight: '800' },
  h3: { fontSize: 17, fontWeight: '800', marginTop: 8 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  big: { fontSize: 22, fontWeight: '900' },
  muted: { fontSize: 13 },
  stat: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  row: { flexDirection: 'row', gap: 8 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
