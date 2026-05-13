import { useCallback, useState } from 'react'
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Toast from 'react-native-toast-message'
import { useFocusEffect } from 'expo-router'
import { CosmeticChest } from '@/components/shop/CosmeticChest'
import { ItemPreview } from '@/components/shop/ItemPreview'
import { ThemeUnlockCards } from '@/components/shop/ThemeUnlockCards'
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
import { hasRevenueCatPlatformApiKey, purchaseConsumableSku, PURCHASE_ERR_REVENUECAT_NOT_READY } from '@/lib/revenuecat'
import { useShopLocalizedPrices } from '@/lib/use-shop-localized-prices'
import {
  SHOP_COIN_PACKS,
  STARTER_BUNDLE_ARTWORK,
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
  const { width: windowWidth } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  /** Narrow phones: stack starter image above copy so the hero does not dominate width. */
  const starterStackVertical = windowWidth < 400
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
        `You are about to purchase ${pack.title} for ${displayPrice}.\n\nVirtual coins have no cash value and cannot be refunded.`,
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
          text2: 'Reconnect to the internet to purchase virtual coin packs.',
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
            label: `Coin pack (${pack.id})`,
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
              ? `Added ${pack.coins.toLocaleString()} virtual coins + ${pack.freeSpins} free spins`
              : pack.coins > 0
                ? `Added ${pack.coins.toLocaleString()} virtual coins`
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
      msg('Not enough virtual coins')
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
            `Starter pack — ${STARTER_BUNDLE_GRANT.coins.toLocaleString()} virtual coins + ${STARTER_BUNDLE_GRANT.freeSpins} free spins + frame`,
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
        msg('Not enough virtual coins')
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
        <Text style={[styles.lead, { color: t.textSecondary }]}>
          Buy virtual coin packs through your app store. Your SpinVault vault updates automatically.
        </Text>

        <LinearGradient
          colors={[hexWithAlpha(t.primary, '44'), t.card, hexWithAlpha(t.primary, '33')]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.starter, { borderColor: t.primary }]}
        >
          <View style={[styles.starterBadge, { backgroundColor: t.primary }]}>
            <Text style={[styles.starterBadgeTxt, { color: t.primaryForeground }]}>STARTER OFFER</Text>
          </View>
          <View style={[styles.starterRow, starterStackVertical && styles.starterRowStacked]}>
            <Pressable
              onPress={() => setStarterPreviewOpen(true)}
              onLongPress={() => setStarterPreviewOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Starter Bundle — preview details"
              style={[
                styles.starterArtPressable,
                starterStackVertical && styles.starterArtPressableStacked,
              ]}
            >
              <View
                style={[
                  styles.starterArtWrap,
                  { borderColor: hexWithAlpha(t.primary, '44'), backgroundColor: hexWithAlpha(t.primary, '10') },
                  starterStackVertical && styles.starterArtWrapStacked,
                ]}
              >
                <Image
                  source={STARTER_BUNDLE_ARTWORK}
                  resizeMode="contain"
                  style={styles.starterArtworkInner}
                />
              </View>
            </Pressable>
            <View style={styles.starterCopy}>
              <Text style={[styles.starterTitle, { color: t.textPrimary }]}>Starter Bundle</Text>
              <Text style={[styles.starterSub, { color: t.textSecondary }]}>
                One-time offer with virtual coins, free spins, and the Golden Ring frame.
              </Text>
              <Text style={[styles.starterHint, { color: t.win }]}>
                Best entry offer in the store
              </Text>
              <AppButton
                label={priceLabelForSku(STARTER_BUNDLE_SKU, STARTER_BUNDLE_PRICE_FALLBACK)}
                onPress={onStarterPack}
                disabled={iapLocked}
                style={styles.starterButton}
              />
            </View>
          </View>
        </LinearGradient>

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
          <Text style={[styles.h3, { color: t.textPrimary }]}>Virtual coin packs</Text>
        </View>
        <Text style={[styles.storeHint, { color: t.textMuted }]}>
          Tap artwork for a larger preview. Use the price button to complete checkout.
        </Text>
        <View style={styles.packGrid}>
          {SHOP_COIN_PACKS.map((p) => (
            <View
              key={p.id}
              style={[
                styles.packCard,
                p.featured && {
                  borderWidth: 2,
                  shadowColor: t.gold,
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 8,
                },
                {
                  borderColor: p.featured ? t.gold : p.popular ? t.primary : t.border,
                  backgroundColor: p.featured
                    ? hexWithAlpha(t.gold, '0C')
                    : t.surfaceElevated,
                },
              ]}
            >
              {p.featured ? (
                <View style={[styles.popTag, { backgroundColor: t.gold }]}>
                  <Text style={[styles.popTagTxt, { color: '#1A1200' }]}>HIGH ROLLER</Text>
                </View>
              ) : p.popular ? (
                <View style={[styles.popTag, { backgroundColor: t.primary }]}>
                  <Text style={[styles.popTagTxt, { color: t.primaryForeground }]}>BEST VALUE</Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => setPackPreview(p)}
                onLongPress={() => setPackPreview(p)}
                accessibilityRole="button"
                accessibilityLabel={`${p.title}, preview pack`}
              >
                <View
                  style={[
                    styles.packArtWrap,
                    {
                      borderColor: p.featured
                        ? hexWithAlpha(t.gold, '55')
                        : hexWithAlpha(t.primary, '33'),
                      backgroundColor: p.featured
                        ? hexWithAlpha(t.gold, '18')
                        : hexWithAlpha(t.primary, '12'),
                    },
                  ]}
                >
                  <Image
                    source={p.artwork}
                    resizeMode="contain"
                    style={styles.packArtwork}
                    accessibilityIgnoresInvertColors
                  />
                </View>
              </Pressable>
              <Text
                style={[
                  styles.packTitle,
                  { color: p.featured ? t.gold : t.textPrimary },
                ]}
                numberOfLines={2}
              >
                {p.title}
              </Text>
              <Text style={[styles.packCaption, { color: t.textSecondary }]} numberOfLines={2}>
                {p.subtitle}
              </Text>
              {p.unlockHint ? (
                <Text style={[styles.packUnlockHint, { color: p.featured ? t.gold : t.textMuted }]} numberOfLines={1}>
                  🔓 {p.unlockHint}
                </Text>
              ) : null}
              <AppButton
                size="sm"
                label={priceLabelForSku(p.id, p.priceLabelFallback)}
                variant={p.featured || p.popular ? 'primary' : 'outline'}
                disabled={iapLocked}
                onPress={() => onCoinPack(p)}
                style={[
                  styles.packButton,
                  p.featured && { backgroundColor: t.gold, borderColor: t.gold },
                ]}
              />
            </View>
          ))}
        </View>

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
          {ALL_VANITY_ITEMS.length} items — unlock with virtual coins, equip, and feature your favorites.
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
                  label={owned ? 'Owned' : `${item.priceCoins.toLocaleString()} virtual coins`}
                  disabled={owned || !canBuy}
                  onPress={() => {
                    if (buyVanityItem(item.id, item.priceCoins)) msg(`Unlocked ${item.name}`)
                    else msg('Not enough virtual coins')
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
                  ? `${packPreview.coins.toLocaleString()} virtual coins · ${packPreview.freeSpins} free spins`
                  : packPreview.coins > 0
                    ? `${packPreview.coins.toLocaleString()} virtual coins`
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
              One-time offer with virtual coins, free spins, and the Golden Ring frame.
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
              {`${STARTER_BUNDLE_GRANT.coins.toLocaleString()} virtual coins · ${STARTER_BUNDLE_GRANT.freeSpins} free spins · Golden Ring frame`}
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
      accessibilityLabel={`${spins} spins for ${price.toLocaleString()} virtual coins`}
    >
      <FontAwesome name="bolt" size={20} color={t.primary} />
      <Text style={[styles.bundleSpins, { color: t.textPrimary }]}>{spins}</Text>
      <Text style={[styles.bundleLbl, { color: t.textMuted }]}>spins</Text>
      <View style={styles.bundlePrice}>
        <FontAwesome name="circle" size={11} color={t.gold} />
        <Text style={[styles.bundlePriceTxt, { color: t.textPrimary }]}>{price.toLocaleString()}</Text>
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
    padding: 12,
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
  starterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  starterRowStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  starterArtPressable: { alignSelf: 'flex-start' },
  starterArtPressableStacked: { alignSelf: 'center', width: '100%' },
  starterArtWrap: {
    width: 96,
    height: 96,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterArtWrapStacked: {
    width: '100%',
    maxWidth: 220,
    height: 120,
    alignSelf: 'center',
  },
  starterArtworkInner: {
    width: '100%',
    height: '100%',
  },
  starterCopy: { flex: 1, minWidth: 0 },
  starterTitle: { fontSize: 17, fontWeight: '900' },
  starterSub: { fontSize: 13, marginTop: 4 },
  starterHint: { fontSize: 11, marginTop: 6, fontWeight: '700' },
  starterButton: { marginTop: 12, alignSelf: 'flex-start' },
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
  packGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  packCard: {
    flexBasis: '48%',
    flexGrow: 0,
    maxWidth: '48%',
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  popTag: {
    position: 'absolute',
    top: 8,
    zIndex: 2,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  popTagTxt: { fontSize: 9, fontWeight: '900' },
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
  packTitle: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
  packCaption: { fontSize: 11, fontWeight: '700', textAlign: 'center', opacity: 0.92 },
  packUnlockHint: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  packButton: { width: '100%' },
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
