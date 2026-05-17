import { useState } from 'react'
import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useGame, type Theme } from '@/lib/game-context'
import { VAULT_COIN_PNG } from '@/lib/brand-assets'
import { THEME_CONFIGS } from '@/lib/theme-config'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'
import { AppButton } from '@/components/ui/AppButton'

const THEMES: Theme[] = ['vegas', 'cyber', 'treasure']

export function HeaderActions() {
  const t = useCasinoTheme()
  const { width: windowWidth } = useWindowDimensions()
  const { currentTheme, setTheme, ownedThemes, coins } = useGame()
  const [open, setOpen] = useState(false)
  const showCoinsLabel = windowWidth >= 390

  return (
    <>
      <View style={styles.row}>
        <View
          style={[
            styles.pill,
            {
              borderColor: hexWithAlpha(t.gold, '55'),
              backgroundColor: hexWithAlpha(t.gold, '12'),
            },
          ]}
        >
          <Image
            source={VAULT_COIN_PNG}
            style={styles.vaultCoin}
            accessibilityIgnoresInvertColors
            accessibilityLabel="Vault Coins"
          />
          <Text style={[styles.coins, { color: t.gold }]}>{coins.toLocaleString()}</Text>
          {showCoinsLabel ? (
            <Text style={[styles.coinsSuffix, { color: hexWithAlpha(t.gold, '99') }]}>Vault Coins</Text>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel="Choose slot machine look"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => setOpen(true)}
          style={[
            styles.iconBtn,
            {
              borderColor: hexWithAlpha(t.gold, '35'),
              backgroundColor: t.surfaceElevated,
            },
          ]}
        >
          <FontAwesome name="sliders" size={17} color={t.primary} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: t.overlay }]}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close"
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: t.card,
                borderColor: t.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
          >
            <Text style={[styles.sheetTitle, { color: t.textPrimary }]}>Slot machine look</Text>
            <Text style={[styles.sheetLead, { color: t.textSecondary }]}>
              Visual style for the reels — your SpinVault home stays the same.
            </Text>
            {THEMES.map((id) => {
              const cfg = THEME_CONFIGS[id]
              const owned = ownedThemes.includes(id)
              const active = currentTheme === id
              return (
                <View key={id} style={styles.themeBlock}>
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
                    style={styles.themeBtn}
                  />
                  <Text style={[styles.themeDesc, { color: t.textMuted }]}>{cfg.description}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  vaultCoin: { width: 22, height: 22 },
  coins: { fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  coinsSuffix: { fontWeight: '600', fontSize: 10, letterSpacing: 0.12, flexShrink: 1 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: 18,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  sheetLead: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  themeBlock: { marginBottom: 12, alignSelf: 'stretch', gap: 6 },
  themeBtn: { alignSelf: 'stretch' },
  themeDesc: { fontSize: 13, lineHeight: 18 },
})
