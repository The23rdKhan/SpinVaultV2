import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { AppButton } from '@/components/ui/AppButton'
import { useGame, type Theme } from '@/lib/game-context'
import { THEME_CONFIGS } from '@/lib/theme-config'
import {
  ALL_VANITY_ITEMS,
  getItemsByCategory,
  type VanityCategory,
} from '@/lib/vanity-data'
import { useCasinoTheme } from '@/lib/use-casino-theme'

const COIN_PACKS = [
  { id: 'starter', coins: 1000, bonus: 0, label: '+1,000' },
  { id: 'basic', coins: 5000, bonus: 500, label: '+5,500' },
  { id: 'popular', coins: 15000, bonus: 3000, label: '+18,000' },
]

const VANITY_TABS: VanityCategory[] = ['avatar', 'frame', 'title', 'pet', 'cabinet']

export default function ShopScreen() {
  const t = useCasinoTheme()
  const { coins, addCoins, buyTheme, ownedThemes, setTheme, buyVanityItem, equipVanityItem, userVanity } =
    useGame()
  const [tab, setTab] = useState<VanityCategory>('avatar')

  const msg = (m: string) => Toast.show({ type: 'success', text1: m })

  const onCoinPack = (pack: (typeof COIN_PACKS)[0]) => {
    addCoins(pack.coins + pack.bonus)
    msg(`Added ${(pack.coins + pack.bonus).toLocaleString()} coins`)
  }

  const onBuyTheme = (theme: Theme) => {
    const price = THEME_CONFIGS[theme].price
    if (ownedThemes.includes(theme)) {
      setTheme(theme)
      msg(`${THEME_CONFIGS[theme].name} equipped`)
      return
    }
    if (buyTheme(theme, price)) {
      setTheme(theme)
      msg(`${THEME_CONFIGS[theme].name} unlocked`)
    } else {
      msg('Not enough coins')
    }
  }

  const items = getItemsByCategory(tab)

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: t.background }]} contentContainerStyle={styles.pad}>
      <Text style={[styles.h2, { color: t.foreground }]}>Shop</Text>

      <Text style={[styles.h3, { color: t.foreground }]}>Coin packs (simulated)</Text>
      <View style={styles.row}>
        {COIN_PACKS.map((p) => (
          <AppButton key={p.id} variant="outline" label={p.label} onPress={() => onCoinPack(p)} style={{ flex: 1 }} />
        ))}
      </View>

      <Text style={[styles.h3, { color: t.foreground }]}>Themes</Text>
      {(['vegas', 'cyber', 'treasure'] as Theme[]).map((th) => {
        const cfg = THEME_CONFIGS[th]
        const owned = ownedThemes.includes(th)
        return (
          <View key={th} style={[styles.card, { borderColor: t.border }]}>
            <Text style={[styles.title, { color: t.foreground }]}>{cfg.name}</Text>
            <Text style={[styles.muted, { color: t.mutedForeground }]}>{cfg.description}</Text>
            <AppButton
              label={owned ? `Use ${cfg.name}` : `Unlock — ${cfg.price.toLocaleString()} coins`}
              variant={owned ? 'primary' : 'outline'}
              onPress={() => onBuyTheme(th)}
              style={{ marginTop: 8 }}
            />
          </View>
        )
      })}

      <Text style={[styles.h3, { color: t.foreground }]}>Vanity</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {VANITY_TABS.map((c) => (
          <AppButton
            key={c}
            size="sm"
            variant={tab === c ? 'primary' : 'ghost'}
            label={c}
            onPress={() => setTab(c)}
            style={{ marginRight: 8 }}
          />
        ))}
      </ScrollView>

      {items.slice(0, 12).map((item) => {
        const owned = userVanity.ownedItemIds.includes(item.id)
        const canBuy = !owned && coins >= item.priceCoins
        return (
          <View key={item.id} style={[styles.card, { borderColor: t.border }]}>
            <Text style={[styles.title, { color: t.foreground }]}>{item.name}</Text>
            <Text style={[styles.muted, { color: t.mutedForeground }]}>{item.description}</Text>
            <View style={styles.rowBtns}>
              <AppButton
                size="sm"
                variant="outline"
                label={owned ? 'Owned' : `${item.priceCoins} coins`}
                disabled={owned || !canBuy}
                onPress={() => {
                  if (buyVanityItem(item.id, item.priceCoins)) msg(`Bought ${item.name}`)
                  else msg('Not enough coins')
                }}
              />
              {owned ? (
                <AppButton
                  size="sm"
                  label="Equip"
                  onPress={() => equipVanityItem(item.category, item.id)}
                />
              ) : null}
            </View>
          </View>
        )
      })}

      <Text style={[styles.muted, { color: t.mutedForeground }]}>
        Showing sample items — full catalog in {ALL_VANITY_ITEMS.length} entries.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  pad: { padding: 16, paddingBottom: 48, gap: 12 },
  h2: { fontSize: 22, fontWeight: '800' },
  h3: { fontSize: 17, fontWeight: '800', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8 },
  rowBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  title: { fontWeight: '800', fontSize: 16 },
  muted: { fontSize: 13, marginTop: 4 },
  tabs: { flexGrow: 0, marginVertical: 8 },
})
