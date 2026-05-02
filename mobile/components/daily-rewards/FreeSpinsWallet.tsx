import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { AppButton } from '@/components/ui/AppButton'
import { routes } from '@/lib/app-routes'
import { useGame } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'

export function FreeSpinsWallet() {
  const t = useCasinoTheme()
  const { freeSpins } = useGame()
  const active = freeSpins > 0

  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: active ? `${t.primary}88` : t.border,
          backgroundColor: t.card,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: active ? t.primary : `${t.muted}99` },
            ]}
          >
            <FontAwesome name="star" size={22} color={active ? t.primaryForeground : t.mutedForeground} />
          </View>
          <View>
            <Text style={[styles.title, { color: t.foreground }]}>Free Spins</Text>
            <Text style={[styles.sub, { color: t.mutedForeground }]}>
              {active ? 'Ready to use!' : 'Win from Scatters'}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={[styles.big, { color: active ? t.primary : t.mutedForeground }]}>{freeSpins}</Text>
          {active ? (
            <AppButton
              size="sm"
              label="Play"
              onPress={() => router.navigate(routes.tabsIndex)}
              style={styles.playBtn}
            />
          ) : null}
        </View>
      </View>
      <View style={[styles.footer, { borderTopColor: t.border }]}>
        <Text style={[styles.hint, { color: t.mutedForeground }]}>
          Land 3+ Scatter symbols to win 10 Free Spins. Free spins use your current bet without deducting
          coins!
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  big: { fontSize: 28, fontWeight: '900' },
  playBtn: { minWidth: 72 },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hint: { fontSize: 11, lineHeight: 16 },
})
