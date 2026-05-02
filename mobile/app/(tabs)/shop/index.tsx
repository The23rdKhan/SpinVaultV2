import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Toast from 'react-native-toast-message'
import { useFocusEffect } from 'expo-router'
import { CosmeticChest } from '@/components/shop/CosmeticChest'
import { ItemPreview } from '@/components/shop/ItemPreview'
import { ThemeUnlockCards } from '@/components/shop/ThemeUnlockCards'
import { AppButton } from '@/components/ui/AppButton'
import { useGame, type Theme } from '@/lib/game-context'
import { SCREEN_PAD_H } from '@/lib/screen-edge'
import { THEME_CONFIGS } from '@/lib/theme-config'
import {
  ALL_VANITY_ITEMS,
  getItemsByCategory,
  RARITY_COLORS,
  RARITY_LABELS,
  type VanityCategory,
} from '@/lib/vanity-data'
import { track } from '@/lib/analytics/track'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AnalyticsEvents } from '@shared/analytics/event-names'

const COIN_PACKS = [
  { id: 'starter', coins: 1000, bonus: 0, priceLabel: '$0.99', popular: false },
  { id: 'basic', coins: 5000, bonus: 500, priceLabel: '$4.99', popular: false },
  { id: 'popular', coins: 15000, bonus: 3000, priceLabel: '$9.99', popular: true },
  { id: 'premium', coins: 50000, bonus: 15000, priceLabel: '$24.99', popular: false },
  { id: 'ultimate', coins: 150000, bonus: 50000, priceLabel: '$49.99', popular: false },
]

const FREE_SPIN_BUNDLES = [
  { id: 'mini', spins: 5, price: 500 },
  { id: 'standard', spins: 15, price: 1200 },
  { id: 'mega', spins: 50, price: 3500 },
]

const VANITY_TABS: { id: VanityCategory; label: string }[] = [
  { id: 'avatar', label: 'Avatars' },
  { id: 'frame', label: 'Frames' },
  { id: 'title', label: 'Titles' },
  { id: 'pet', label: 'Pets' },
  { id: 'cabinet', label: 'Cabinets' },
  { id: 'room', label: 'Rooms' },
  { id: 'car', label: 'Garage' },
  { id: 'badge', label: 'Badges' },
]

export default function ShopScreen() {
  const t = useCasinoTheme()
  const insets = useSafeAreaInsets()
  const {
    coins,
    freeSpins,
    addCoins,
    addFreeSpins,
    buyFreeSpinsWithCoins,
    buyTheme,
    ownedThemes,
    setTheme,
    currentTheme,
    buyVanityItem,
    equipVanityItem,
    userVanity,
  } = useGame()
  const [tab, setTab] = useState<VanityCategory>('avatar')

  useFocusEffect(
    useCallback(() => {
      track(AnalyticsEvents.SHOP_OPENED)
    }, []),
  )

  const msg = (m: string) => Toast.show({ type: 'success', text1: m })

  const onCoinPack = (pack: (typeof COIN_PACKS)[0]) => {
    track(AnalyticsEvents.PURCHASE_STARTED, {
      product_id: pack.id,
      kind: 'coin_pack',
    })
    addCoins(pack.coins + pack.bonus)
    track(AnalyticsEvents.PURCHASE_COMPLETED, {
      product_id: pack.id,
      kind: 'coin_pack',
      coins_granted: pack.coins + pack.bonus,
    })
    msg(`Added ${(pack.coins + pack.bonus).toLocaleString()} coins`)
  }

  const onBuySpins = (bundle: (typeof FREE_SPIN_BUNDLES)[0]) => {
    if (buyFreeSpinsWithCoins(bundle.price, bundle.spins)) {
      msg(`+${bundle.spins} free spins`)
    } else {
      msg('Not enough coins')
    }
  }

  const onStarterPack = () => {
    track(AnalyticsEvents.PURCHASE_STARTED, {
      product_id: 'starter_bundle',
      kind: 'starter_pack',
    })
    addCoins(10000)
    addFreeSpins(10)
    track(AnalyticsEvents.PURCHASE_COMPLETED, {
      product_id: 'starter_bundle',
      kind: 'starter_pack',
      coins_granted: 10000,
      free_spins_granted: 10,
    })
    msg('Starter pack — 10,000 coins + 10 free spins!')
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
  const bottomPad = Math.max(insets.bottom, 12) + 28 + 56
  const stickyBottom = Math.max(insets.bottom, 10) + 56

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.pad,
          { paddingHorizontal: SCREEN_PAD_H, paddingBottom: bottomPad },
        ]}
      >
        <Text style={[styles.lead, { color: t.mutedForeground }]}>
          Coin packs & cosmetics — simulated IAP
        </Text>

        <LinearGradient
          colors={[`${t.primary}44`, t.card, `${t.primary}33`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.starter, { borderColor: t.primary }]}
        >
          <View style={[styles.starterBadge, { backgroundColor: t.primary }]}>
            <Text style={[styles.starterBadgeTxt, { color: t.primaryForeground }]}>LIMITED</Text>
          </View>
          <View style={styles.starterRow}>
            <View style={[styles.starterIcon, { backgroundColor: `${t.primary}55` }]}>
              <FontAwesome name="gift" size={28} color={t.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.starterTitle, { color: t.foreground }]}>Starter Pack</Text>
              <Text style={[styles.starterSub, { color: t.mutedForeground }]}>
                10,000 coins + 10 free spins
              </Text>
              <Text style={[styles.starterHint, { color: t.win }]}>
                First purchase only — 50% OFF (simulated)
              </Text>
            </View>
            <AppButton label="$2.99" onPress={onStarterPack} />
          </View>
        </LinearGradient>

        <View style={styles.sectionHead}>
          <FontAwesome name="bolt" size={16} color={t.primary} />
          <Text style={[styles.h3, { color: t.foreground }]}>Free Spin Bundles</Text>
        </View>
        <View style={styles.bundleRow}>
          {FREE_SPIN_BUNDLES.map((b) => {
            const afford = coins >= b.price
            return (
              <PressableBundle
                key={b.id}
                spins={b.spins}
                price={b.price}
                disabled={!afford}
                onPress={() => onBuySpins(b)}
                t={t}
              />
            )
          })}
        </View>

        <View style={styles.sectionHead}>
          <FontAwesome name="bitcoin" size={16} color={t.primary} />
          <Text style={[styles.h3, { color: t.foreground }]}>Coin packs</Text>
        </View>
        <View style={styles.packGrid}>
          {COIN_PACKS.map((p) => (
            <View
              key={p.id}
              style={[
                styles.packCard,
                {
                  borderColor: p.popular ? t.primary : t.border,
                  backgroundColor: t.card,
                },
              ]}
            >
              {p.popular ? (
                <View style={[styles.popTag, { backgroundColor: t.primary }]}>
                  <Text style={[styles.popTagTxt, { color: t.primaryForeground }]}>BEST VALUE</Text>
                </View>
              ) : null}
              <FontAwesome
                name="money"
                size={22}
                color={t.primary}
                style={{ alignSelf: 'center', marginTop: 8 }}
              />
              <Text style={[styles.packAmt, { color: t.foreground }]}>
                {p.coins >= 1000 ? `${Math.round(p.coins / 1000)}k` : p.coins}
              </Text>
              {p.bonus > 0 ? (
                <Text style={[styles.packBonus, { color: t.win }]}>
                  +{p.bonus >= 1000 ? `${p.bonus / 1000}k` : p.bonus}
                </Text>
              ) : null}
              <AppButton
                size="sm"
                label={p.priceLabel}
                variant={p.popular ? 'primary' : 'outline'}
                onPress={() => onCoinPack(p)}
                style={{ marginTop: 8 }}
              />
            </View>
          ))}
        </View>

        <Text style={[styles.h3, { color: t.foreground }]}>Base theme</Text>
        <View style={[styles.card, { borderColor: t.border, backgroundColor: t.card }]}>
          <Text style={[styles.title, { color: t.foreground }]}>{THEME_CONFIGS.vegas.name}</Text>
          <Text style={[styles.muted, { color: t.mutedForeground }]}>{THEME_CONFIGS.vegas.description}</Text>
          <Text style={[styles.muted, { color: t.mutedForeground, fontSize: 11, marginTop: 6 }]}>
            Always free — your default casino look.
          </Text>
          <AppButton
            label={currentTheme === 'vegas' ? 'Active' : 'Use Vegas'}
            variant={currentTheme === 'vegas' ? 'primary' : 'outline'}
            onPress={() => onBuyTheme('vegas')}
            style={{ marginTop: 8 }}
          />
        </View>

        <ThemeUnlockCards onMessage={msg} />
        <CosmeticChest onMessage={msg} />

        <View style={styles.sectionHead}>
          <FontAwesome name="star" size={16} color={t.primary} />
          <Text style={[styles.h3, { color: t.foreground }]}>Vanity store</Text>
        </View>
        <Text style={[styles.muted, { color: t.mutedForeground, marginTop: -6 }]}>
          {ALL_VANITY_ITEMS.length} items — buy, equip, and feature your favorites.
        </Text>
        <View style={styles.tabWrap}>
          {VANITY_TABS.map((c) => (
            <AppButton
              key={c.id}
              size="sm"
              variant={tab === c.id ? 'primary' : 'ghost'}
              label={c.label}
              onPress={() => setTab(c.id)}
              style={styles.tabChip}
            />
          ))}
        </View>

        {items.map((item) => {
          const owned = userVanity.ownedItemIds.includes(item.id)
          const canBuy = !owned && coins >= item.priceCoins
          const rarity = RARITY_COLORS[item.rarity]
          return (
            <View
              key={item.id}
              style={[
                styles.vanityCard,
                {
                  borderColor: rarity.border,
                  backgroundColor: t.card,
                },
              ]}
            >
              <View style={styles.vanityTop}>
                <View style={[styles.previewWrap, { borderColor: rarity.border, backgroundColor: rarity.bg }]}>
                  <ItemPreview item={item} size="sm" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.title, { color: t.foreground }]}>{item.name}</Text>
                  <Text style={[styles.rarityLbl, { color: rarity.text }]}>
                    {RARITY_LABELS[item.rarity]}
                  </Text>
                  <Text style={[styles.muted, { color: t.mutedForeground }]}>{item.description}</Text>
                </View>
              </View>
              <View style={styles.rowBtns}>
                <AppButton
                  size="sm"
                  variant="outline"
                  label={owned ? 'Owned' : `${item.priceCoins.toLocaleString()} coins`}
                  disabled={owned || !canBuy}
                  onPress={() => {
                    if (buyVanityItem(item.id, item.priceCoins)) msg(`Bought ${item.name}`)
                    else msg('Not enough coins')
                  }}
                />
                {owned && item.category !== 'badge' ? (
                  <AppButton
                    size="sm"
                    label={item.category === 'room' || item.category === 'car' ? 'Feature' : 'Equip'}
                    onPress={() => equipVanityItem(item.category, item.id)}
                  />
                ) : null}
              </View>
            </View>
          )
        })}
      </ScrollView>

      <View
        style={[
          styles.stickyBalance,
          {
            bottom: stickyBottom,
            borderColor: t.border,
            backgroundColor: `${t.card}f2`,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.balanceItem}>
          <FontAwesome name="bitcoin" size={14} color={t.primary} />
          <Text style={[styles.balanceTxt, { color: t.foreground }]}>{coins.toLocaleString()}</Text>
        </View>
        <View style={[styles.balanceDivider, { backgroundColor: t.border }]} />
        <View style={styles.balanceItem}>
          <FontAwesome name="star" size={14} color={t.primary} />
          <Text style={[styles.balanceTxt, { color: t.foreground }]}>{freeSpins}</Text>
        </View>
      </View>
    </View>
  )
}

function PressableBundle({
  spins,
  price,
  disabled,
  onPress,
  t,
}: {
  spins: number
  price: number
  disabled: boolean
  onPress: () => void
  t: ReturnType<typeof useCasinoTheme>
}) {
  return (
    <AppButton
      variant="outline"
      disabled={disabled}
      onPress={onPress}
      style={[styles.bundleCard, { borderColor: disabled ? t.border : `${t.primary}88` }]}
      accessibilityLabel={`${spins} spins for ${price} coins`}
    >
      <FontAwesome name="bolt" size={20} color={t.primary} />
      <Text style={[styles.bundleSpins, { color: t.foreground }]}>{spins}</Text>
      <Text style={[styles.bundleLbl, { color: t.mutedForeground }]}>spins</Text>
      <View style={styles.bundlePrice}>
        <FontAwesome name="bitcoin" size={11} color={t.primary} />
        <Text style={[styles.bundlePriceTxt, { color: t.foreground }]}>{price.toLocaleString()}</Text>
      </View>
    </AppButton>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  pad: { gap: 14, paddingTop: 8 },
  lead: { fontSize: 14, fontWeight: '600' },
  starter: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    overflow: 'hidden',
  },
  starterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  starterBadgeTxt: { fontSize: 10, fontWeight: '900' },
  starterRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  starterIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterTitle: { fontSize: 18, fontWeight: '900' },
  starterSub: { fontSize: 13, marginTop: 4 },
  starterHint: { fontSize: 11, marginTop: 6, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  h3: { fontSize: 17, fontWeight: '800' },
  bundleRow: { flexDirection: 'row', gap: 10 },
  bundleCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  bundleSpins: { fontSize: 18, fontWeight: '900' },
  bundleLbl: { fontSize: 11 },
  bundlePrice: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  bundlePriceTxt: { fontSize: 13, fontWeight: '800' },
  packGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  packCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  popTag: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  popTagTxt: { fontSize: 9, fontWeight: '900' },
  packAmt: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  packBonus: { fontSize: 12, fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  vanityCard: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  vanityTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  previewWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '800', fontSize: 16 },
  rarityLbl: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
  muted: { fontSize: 13, marginTop: 4 },
  tabWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabChip: { marginBottom: 0 },
  rowBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  stickyBalance: {
    position: 'absolute',
    left: SCREEN_PAD_H,
    right: SCREEN_PAD_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    zIndex: 20,
  },
  balanceItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceDivider: { width: 1, height: 18 },
  balanceTxt: { fontWeight: '900', fontSize: 15 },
})
