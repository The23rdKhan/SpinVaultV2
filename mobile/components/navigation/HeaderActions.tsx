import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useGame, type Theme } from '@/lib/game-context'
import { THEME_CONFIGS } from '@/lib/theme-config'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppButton } from '@/components/ui/AppButton'

const THEMES: Theme[] = ['vegas', 'cyber', 'treasure']

export function HeaderActions() {
  const t = useCasinoTheme()
  const { currentTheme, setTheme, ownedThemes, coins } = useGame()
  const [open, setOpen] = useState(false)

  return (
    <>
      <View style={styles.row}>
        <View style={[styles.pill, { borderColor: t.border, backgroundColor: t.card }]}>
          <FontAwesome name="bitcoin" size={13} color={t.primary} />
          <Text style={[styles.coins, { color: t.foreground }]}>{coins.toLocaleString()}</Text>
          <Text style={[styles.coinsSuffix, { color: t.mutedForeground }]}>coins</Text>
        </View>
        <Pressable
          accessibilityLabel="Theme"
          onPress={() => setOpen(true)}
          style={[styles.iconBtn, { borderColor: t.border, backgroundColor: t.card }]}
        >
          <FontAwesome name="paint-brush" size={18} color={t.primary} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: t.foreground }]}>Machine theme</Text>
            {THEMES.map((id) => {
              const cfg = THEME_CONFIGS[id]
              const owned = ownedThemes.includes(id)
              const active = currentTheme === id
              return (
                <View key={id} style={{ marginBottom: 12, alignSelf: 'stretch', gap: 6 }}>
                  <AppButton
                    variant={active ? 'primary' : 'outline'}
                    disabled={!owned}
                    label={`${cfg.name}${!owned ? ' (locked)' : ''}`}
                    onPress={() => {
                      if (owned) {
                        setTheme(id)
                        setOpen(false)
                      }
                    }}
                    style={{ alignSelf: 'stretch' }}
                  />
                  <Text style={[styles.themeDesc, { color: t.mutedForeground }]}>
                    {cfg.description}
                  </Text>
                </View>
              )
            })}
            <AppButton variant="ghost" label="Close" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  coins: { fontWeight: '800', fontSize: 14 },
  coinsSuffix: { fontWeight: '700', fontSize: 11 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  themeDesc: { fontSize: 12, lineHeight: 16 },
})
