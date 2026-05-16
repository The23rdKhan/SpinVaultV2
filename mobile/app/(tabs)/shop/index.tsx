import { useCallback, useState } from 'react'
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Toast from 'react-native-toast-message'
import { useFocusEffect } from 'expo-router'
import { CosmeticChest } from '@/components/shop/CosmeticChest'
import { ItemPreview } from '@/components/shop/ItemPreview'
import { ThemeUnlockCards } from '@/components/shop/ThemeUnlockCards'
import { StorePackCard } from '@/components/brand/asset-components'
import { AppButton } from '@/components/ui/AppButton'
import { AppScrollView } from '@/components/ui/AppScrollView'
import { useGame, type Theme } from '@/lib/game-context'
import { SCREEN_PAD_H } from '@/lib/screen-edge'
import { THEME_CONFIGS } from '@/lib/theme-config'
import {
  ALL_VANITY_ITEMS,
  getItemsByCategory,
  RARITY_LABELS,
  type VanityCategory,
} from '@/lib/vanity-data'
import { rarityPresentation } from '@/lib/rarity-from-theme'
import { track } from '@/lib/analytics/track'
import { isReachable } from '@/lib/reachability'
import { purchaseConsumableSku, PURCHASE_ERR_REVENUECAT_NOT_READY } from '@/lib/revenuecat'
import { useShopLocalizedPrices } from '@/lib/use-shop-localized-prices'
import {
  SHOP_COIN_PACKS,
  STARTER_BUNDLE_ARTWORK,
  STARTER_BUNDLE_DETAILS,
  STARTER_BUNDLE_GRANT,
  STARTER_BUNDLE_PRICE_FALLBACK,
  STARTER_BUNDLE_SKU,
  type ShopCoinPackRow,
} from '@/lib/shop-iap-catalog'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'
import { AnalyticsEvents } from '@shared/analytics/event-names'

const FREE_SPIN_BUNDLES = [
  { id: 'mini', spins: 5, price: 500 },
  { id: 'standard', spins: 15, price: 1200 },
  { id: 'mega', spins: 50, price: 3500 },
]

/** `iapBusyKey` sentinel while starter IAP is in flight (distinct from product IDs). */
const IAP_BUSY_STARTER = '__starter_bundle__' as const
const SHOP_HEADER_BANNER = require('@/assets/store/shop-header-banner.png')

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
  const { priceLabelForSku } = useShopLocalizedPrices()
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
    resyncWalletFromServer,
    recordIapSpend,
  } = useGame()
  const [tab, setTab] = useState<VanityCategory>('avatar')
  /** Which IAP row is running (`product id` or starter sentinel); blocks parallel StoreKit flows. */
  const [iapBusyKey, setIapBusyKey] = useState<string | null>(null)
  /** Coin pack detail sheet; starter bundle uses separate shape. */
  const [packPreview, setPackPreview] = useState<ShopCoinPackRow | null>(null)
  const [starterPreviewOpen, setStarterPreviewOpen] = useState(false)

  useFocusEffect(
    useCallback(() => {
      track(AnalyticsEvents.SHOP_OPENED)
    }, []),
  )

  const msg = (m: string) => Toast.show({ type: 'success', text1: m })

  /** IAP vanity not in wallet RPC yet — grant Golden Ring after successful `STARTER_BUNDLE_SKU` purchase. */
  const grantStarterBundleCosmetics = useCallback(() => {
    buyVanityItem(STARTER_BUNDLE_GRANT.frameVanityId, 0)
    requestAnimationFrame(() => {
      equipVanityItem('frame', STARTER_BUNDLE_GRANT.frameVanityId)
    })
  }, [buyVanityItem, equipVanityItem])

  const onCoinPack = (pack: ShopCoinPackRow) => {
    if (iapBusyKey) return
    // Show a confirmation dialog for higher-value packs before invoking the store purchase sheet.
    if (pack.priceUsd > 4.99) {
      const displayPrice = priceLabelForSku(pack.id, pack.priceLabelFallback)
      Alert.alert(
        'Confirm purchase',
        `You are about to purchase ${pack.title} for ${displayPrice}.\n\nVault Coins have no cash value and cannot be refunded.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: `Buy — ${displayPrice}`, onPress: () => doCoinPackPurchase(pack) },
        ],
      )
      return
    }
    doCoinPackPurchase(pack)
  }

  const doCoinPackPurchase = (pack: ShopCoinPackRow) => {
    void (async () => {
      if (!(await isReachable())) {
        Toast.show({
          type: 'error',
          text1: 'No connection',
          text2: 'Reconnect to the internet to purchase Vault Coin packs.',
        })
        return
      }
      setIapBusyKey(pack.id)
      try {
        track(AnalyticsEvents.PURCHASE_STARTED, {
          product_id: pack.id,
          kind: pack.kind,
        })
        const r = await purchaseConsumableSku(pack.id)
        if (r.ok) {
          await resyncWalletFromServer()
          recordIapSpend(pack.priceUsd)
          track(AnalyticsEvents.PURCHASE_COMPLETED, {
            product_id: pack.id,
            kind: pack.kind,
            coins_granted: pack.coins,
            free_spins_granted: pack.freeSpins,
          })
          msg('Purchase complete — balance updated')
          return
        }
        if (r.cancelled) return
        if (r.message === PURCHASE_ERR_REVENUECAT_NOT_READY) {
          addCoins(pack.coins, {
            reason: 'iap_grant',
            label: `Vault Coin pack (${pack.id})`,
          })
          if (pack.freeSpins > 0) {
            addFreeSpins(pack.freeSpins)
          }
          recordIapSpend(pack.priceUsd)
          track(AnalyticsEvents.PURCHASE_COMPLETED, {
            product_id: pack.id,
            kind: pack.kind,
            coins_granted: pack.coins,
            free_spins_granted: pack.freeSpins,
          })
          msg(
            pack.coins > 0 && pack.freeSpins > 0
              ? `Added ${pack.coins.toLocaleString()} Vault Coins + ${pack.freeSpins} free spins`
              : pack.coins > 0
                ? `Added ${pack.coins.toLocaleString()} Vault Coins`
                : `Added ${pack.freeSpins} free spins`,
          )
          return
        }
        Toast.show({
          type: 'error',
          text1: 'Purchase failed',
          text2: r.message ?? 'Check App Store / Play products and try again.',
        })
      } finally {
        setIapBusyKey(null)
      }
    })()
  }

  const onBuySpins = (bundle: (typeof FREE_SPIN_BUNDLES)[0]) => {
    if (buyFreeSpinsWithCoins(bundle.price, bundle.spins)) {
      msg(`+${bundle.spins} free spins`)
    } else {
      msg('Not enough Vault Coins')
    }
  }

  const onStarterPack = () => {
    if (iapBusyKey) return
    void (async () => {
      if (!(await isReachable())) {
        Toast.show({
          type: 'error',
          text1: 'No connection',
          text2: 'Reconnect to the internet to purchase the starter pack.',
        })
        return
      }
      setIapBusyKey(IAP_BUSY_STARTER)
      try {
        track(AnalyticsEvents.PURCHASE_STARTED, {
          product_id: STARTER_BUNDLE_SKU,
          kind: 'starter_pack',
        })
        const r = await purchaseConsumableSku(STARTER_BUNDLE_SKU)
        if (r.ok) {
          await resyncWalletFromServer()
          recordIapSpend(parseFloat(STARTER_BUNDLE_PRICE_FALLBACK.replace('$', '')))
          grantStarterBundleCosmetics()
          track(AnalyticsEvents.PURCHASE_COMPLETED, {
            product_id: STARTER_BUNDLE_SKU,
            kind: 'starter_pack',
            coins_granted: STARTER_BUNDLE_GRANT.coins,
            free_spins_granted: STARTER_BUNDLE_GRANT.freeSpins,
          })
          msg('Starter pack unlocked — balance updated + Golden Ring frame')
          return
        }
        if (r.cancelled) return
        if (r.message === PURCHASE_ERR_REVENUECAT_NOT_READY) {
          addCoins(STARTER_BUNDLE_GRANT.coins, {
            reason: 'starter_pack',
            label: 'Starter pack',
          })
          addFreeSpins(STARTER_BUNDLE_GRANT.freeSpins)
          recordIapSpend(parseFloat(STARTER_BUNDLE_PRICE_FALLBACK.replace('$', '')))
          grantStarterBundleCosmetics()
          track(AnalyticsEvents.PURCHASE_COMPLETED, {
            product_id: STARTER_BUNDLE_SKU,
            kind: 'starter_pack',
            coins_granted: STARTER_BUNDLE_GRANT.coins,
            free_spins_granted: STARTER_BUNDLE_GRANT.freeSpins,
          })
          msg(
            `Starter pack — ${STARTER_BUNDLE_GRANT.coins.toLocaleString()} Vault Coins + ${STARTER_BUNDLE_GRANT.freeSpins} free spins + frame`,
          )
          return
        }
        Toast.show({
          type: 'error',
          text1: 'Purchase failed',
          text2: r.message ?? 'Check store setup and try again.',
        })
      } finally {
        setIapBusyKey(null)
      }
    })()
  }

  const onBuyTheme = (theme: Theme) => {
    void (async () => {
      const price = THEME_CONFIGS[theme].price
      if (ownedThemes.includes(theme)) {
        setTheme(theme)
        msg(`${THEME_CONFIGS[theme].name} equipped`)
        return
      }
      const ok = await buyTheme(theme, price)
      if (ok) {
        setTheme(theme)
        msg(`${THEME_CONFIGS[theme].name} unlocked`)
      } else {
        msg('Not enough Vault Coins')
      }
    })()
  }

  const items = getItemsByCategory(tab)
  const bottomPad = Math.max(insets.bottom, 12) + 24
  const iapLocked = iapBusyKey !== null

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <AppScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.pad,
          { paddingHorizontal: SCREEN_PAD_H, paddingBottom: bottomPad },
        ]}
      >
        <Image
          source={SHOP_HEADER_BANNER}
          resizeMode="cover"
          style={styles.shopHeader}
          accessibilityLabel="Spin Vault shop banner"
          accessibilityRole="image"
        />
        <Text style={[styles.lead, { color: t.textSecondary }]}>
          Add Vault Coins through your app store. Your Spin Vault vault updates automatically.
        </Text>

        <StorePackCard
          artwork={STARTER_BUNDLE_ARTWORK}
          title="Starter Bundle"
          details={[...STARTER_BUNDLE_DETAILS]}
          priceLabel={priceLabelForSku(STARTER_BUNDLE_SKU, STARTER_BUNDLE_PRICE_FALLBACK)}
          badge="STARTER OFFER"
          disabled={iapLocked}
          onPress={onStarterPack}
          onPreview={() => setStarterPreviewOpen(true)}
          style={styles.starterStoreCard}
        />

        <View style={styles.sectionHead}>
          <FontAwesome name="bolt" size={16} color={t.primary} />
          <Text style={[styles.h3, { color: t.textPrimary }]}>Free spin bundles</Text>
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
          <FontAwesome name="gift" size={16} color={t.primary} />
          <Text style={[styles.h3, { color: t.textPrimary }]}>Vault Coin packs</Text>
        </View>
        <Text style={[styles.storeHint, { color: t.textMuted }]}>
          Tap artwork for a larger preview. Use the price button to complete checkout.
        </Text>
        <View style={styles.packGrid}>
          {SHOP_COIN_PACKS.map((p) => (
            <StorePackCard
              key={p.id}
              artwork={p.artwork}
              title={p.title}
              details={p.displayDetails}
              priceLabel={priceLabelForSku(p.id, p.priceLabelFallback)}
              badge={p.featured ? 'VIP BONUS' : p.popular ? 'BEST VALUE' : undefined}
              featured={p.featured}
              disabled={iapLocked}
              onPress={() => onCoinPack(p)}
              onPreview={() => setPackPreview(p)}
            />
          ))}
        </View>
        {SHOP_COIN_PACKS.some((p) => p.unlockHint) ? (
          <Text style={[styles.storeHint, { color: t.textMuted }]}>
            Larger packs can unlock higher line bets. Prices are rendered by the app store checkout.
          </Text>
        ) : null}

        <Text style={[styles.h3, { color: t.textPrimary }]}>Base theme</Text>
        <View style={[styles.card, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}>
          <Text style={[styles.title, { color: t.textPrimary }]}>{THEME_CONFIGS.vegas.name}</Text>
          <Text style={[styles.muted, { color: t.textSecondary }]}>{THEME_CONFIGS.vegas.description}</Text>
          <Text style={[styles.muted, { color: t.textMuted, fontSize: 11, marginTop: 6 }]}>
            Always free — your default machine style.
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
          <Text style={[styles.h3, { color: t.textPrimary }]}>Collectibles</Text>
        </View>
        <Text style={[styles.muted, { color: t.textSecondary, marginTop: -6 }]}>
          {ALL_VANITY_ITEMS.length} items — unlock with Vault Coins, equip, and feature your favorites.
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
          const rarity = rarityPresentation(t, item.rarity)
          return (
            <View
              key={item.id}
              style={[
                styles.vanityCard,
                {
                  borderColor: rarity.border,
                  backgroundColor: t.surfaceElevated,
                },
              ]}
            >
              <View style={styles.vanityTop}>
                <View style={[styles.previewWrap, { borderColor: rarity.border, backgroundColor: rarity.bg }]}>
                  <ItemPreview item={item} size="sm" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.title, { color: t.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.rarityLbl, { color: rarity.text }]}>
                    {RARITY_LABELS[item.rarity]}
                  </Text>
                  <Text style={[styles.muted, { color: t.textSecondary }]}>{item.description}</Text>
                </View>
              </View>
              <View style={styles.rowBtns}>
                <AppButton
                  size="sm"
                  variant="outline"
                label={owned ? 'Owned' : `${item.priceCoins.toLocaleString()} Vault Coins`}
                  disabled={owned || !canBuy}
                  onPress={() => {
                    if (buyVanityItem(item.id, item.priceCoins)) msg(`Unlocked ${item.name}`)
                    else msg('Not enough Vault Coins')
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
      </AppScrollView>

      <Modal
        visible={packPreview !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPackPreview(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: t.overlay }]}
            onPress={() => setPackPreview(null)}
            accessibilityLabel="Close preview"
          />
          {packPreview ? (
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: t.surfaceElevated,
                  borderColor: t.border,
                  shadowColor: t.shadow,
                },
              ]}
              accessibilityViewIsModal
            >
              <Text style={[styles.modalTitle, { color: t.textPrimary }]}>{packPreview.title}</Text>
              {packPreview.subtitle.trim() !== packPreview.title.trim() ? (
                <Text style={[styles.modalSub, { color: t.textSecondary }]}>{packPreview.subtitle}</Text>
              ) : null}
              <Text style={[styles.modalPrice, { color: t.primary }]}>
                {priceLabelForSku(packPreview.id, packPreview.priceLabelFallback)}
              </Text>
              <View style={[styles.packArtWrap, styles.modalArt, { borderColor: hexWithAlpha(t.primary, '33') }]}>
                <Image
                  source={packPreview.artwork}
                  resizeMode="contain"
                  style={styles.packArtwork}
                />
              </View>
              <Text style={[styles.modalBody, { color: t.textPrimary }]}>
                {packPreview.coins > 0 && packPreview.freeSpins > 0
                  ? `${packPreview.coins.toLocaleString()} Vault Coins · ${packPreview.freeSpins} free spins`
                  : packPreview.coins > 0
                    ? `${packPreview.coins.toLocaleString()} Vault Coins`
                    : `${packPreview.freeSpins} free spins`}
              </Text>
              <Text style={[styles.modalSku, { color: t.textMuted }]}>{packPreview.id}</Text>
              <AppButton label="Close" variant="outline" onPress={() => setPackPreview(null)} />
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={starterPreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStarterPreviewOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: t.overlay }]}
            onPress={() => setStarterPreviewOpen(false)}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: t.surfaceElevated,
                borderColor: t.border,
                shadowColor: t.shadow,
              },
            ]}
            accessibilityViewIsModal
          >
            <Text style={[styles.modalTitle, { color: t.textPrimary }]}>Starter Bundle</Text>
            <Text style={[styles.modalSub, { color: t.textSecondary }]}>
              One-time offer with Vault Coins, free spins, and the Golden Ring frame.
            </Text>
            <Text style={[styles.modalPrice, { color: t.primary }]}>
              {priceLabelForSku(STARTER_BUNDLE_SKU, STARTER_BUNDLE_PRICE_FALLBACK)}
            </Text>
            <View style={[styles.packArtWrap, styles.modalArt, { borderColor: hexWithAlpha(t.primary, '33') }]}>
              <Image
                source={STARTER_BUNDLE_ARTWORK}
                resizeMode="contain"
                style={styles.packArtwork}
              />
            </View>
            <Text style={[styles.modalBody, { color: t.textPrimary }]}>
              {`${STARTER_BUNDLE_GRANT.coins.toLocaleString()} Vault Coins · ${STARTER_BUNDLE_GRANT.freeSpins} free spins · Golden Ring frame`}
            </Text>
            <Text style={[styles.modalSku, { color: t.textMuted }]}>{STARTER_BUNDLE_SKU}</Text>
            <AppButton label="Close" variant="outline" onPress={() => setStarterPreviewOpen(false)} />
          </View>
        </View>
      </Modal>
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
      style={[styles.bundleCard, { borderColor: disabled ? t.border : hexWithAlpha(t.primary, '88') }]}
      accessibilityLabel={`${spins} spins for ${price.toLocaleString()} Vault Coins`}
    >
      <FontAwesome name="bolt" size={20} color={t.primary} />
      <Text style={[styles.bundleSpins, { color: t.textPrimary }]}>{spins}</Text>
      <Text style={[styles.bundleLbl, { color: t.textMuted }]}>spins</Text>
      <View style={styles.bundlePrice}>
        <FontAwesome name="circle" size={11} color={t.gold} />
        <Text style={[styles.bundlePriceTxt, { color: t.textPrimary }]}>{price.toLocaleString()}</Text>
        <Text style={[styles.bundlePriceUnit, { color: t.textMuted }]}>VC</Text>
      </View>
    </AppButton>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  pad: { gap: 14, paddingTop: 8 },
  lead: { fontSize: 14, fontWeight: '600' },
  shopHeader: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  starterStoreCard: {
    width: '100%',
    maxWidth: '100%',
    flexBasis: '100%',
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  storeHint: { fontSize: 12, fontWeight: '600', marginTop: -4, lineHeight: 16 },
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
  bundlePriceUnit: { fontSize: 10, fontWeight: '900' },
  packGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  packArtWrap: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packArtwork: {
    width: '100%',
    height: '100%',
  },
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
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PAD_H,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    zIndex: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalSub: { fontSize: 14, marginTop: -4 },
  modalPrice: { fontSize: 18, fontWeight: '900' },
  modalArt: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 260,
    marginTop: 4,
  },
  modalBody: { fontSize: 15, fontWeight: '700' },
  modalSku: { fontSize: 11 },
})
