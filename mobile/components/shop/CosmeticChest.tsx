import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { LinearGradient } from 'expo-linear-gradient'
import { AppButton } from '@/components/ui/AppButton'
import { ItemPreview } from '@/components/shop/ItemPreview'
import { useGame } from '@/lib/game-context'
import {
  ALL_VANITY_ITEMS,
  RARITY_LABELS,
  type VanityItem,
  type VanityRarity,
} from '@/lib/vanity-data'
import { rarityPresentation } from '@/lib/rarity-from-theme'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'

const CHEST_PRICE = 500

const RARITY_ODDS: Record<VanityRarity, number> = {
  common: 0.7,
  rare: 0.2,
  epic: 0.08,
  legendary: 0.02,
  mythic: 0,
}

function rollRarity(): VanityRarity {
  const roll = Math.random()
  let c = 0
  if (roll < (c += RARITY_ODDS.common)) return 'common'
  if (roll < (c += RARITY_ODDS.rare)) return 'rare'
  if (roll < (c += RARITY_ODDS.epic)) return 'epic'
  return 'legendary'
}

export function CosmeticChest({ onMessage }: { onMessage: (msg: string) => void }) {
  const t = useCasinoTheme()
  const { coins, subtractCoins, addCoins, buyVanityItem, userVanity } = useGame()
  const vanityRef = useRef(userVanity)
  useEffect(() => {
    vanityRef.current = userVanity
  }, [userVanity])
  const [opening, setOpening] = useState(false)
  const [wonItem, setWonItem] = useState<VanityItem | null>(null)
  const [showOdds, setShowOdds] = useState(false)

  const canAfford = coins >= CHEST_PRICE

  const pickUnowned = (rarity: VanityRarity, owned: string[]): VanityItem | null => {
    const pool = ALL_VANITY_ITEMS.filter((i) => i.rarity === rarity && !owned.includes(i.id))
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)]
    const anyPool = ALL_VANITY_ITEMS.filter((i) => !owned.includes(i.id))
    return anyPool.length > 0 ? anyPool[Math.floor(Math.random() * anyPool.length)] : null
  }

  const openChest = () => {
    if (!canAfford || opening) return
    setOpening(true)

    setTimeout(() => {
      const ownedIds = vanityRef.current.ownedItemIds
      const spent = subtractCoins(CHEST_PRICE, {
        reason: 'cosmetic_chest',
        label: 'Cosmetic chest',
      })
      if (!spent) {
        setOpening(false)
        onMessage('Not enough Vault Coins')
        return
      }

      const rarity = rollRarity()
      const pick = pickUnowned(rarity, ownedIds)

      if (!pick) {
        addCoins(CHEST_PRICE + 250, {
          reason: 'cosmetic_chest',
          label: 'Chest refund + bonus (collection complete)',
        })
        setOpening(false)
        onMessage('Collection complete — bonus Vault Coins!')
        return
      }

      const ok = buyVanityItem(pick.id, 0)
      if (!ok) {
        addCoins(CHEST_PRICE, {
          reason: 'cosmetic_chest',
          label: 'Chest refund',
        })
        setOpening(false)
        onMessage('Could not grant item — refunded')
        return
      }

      setWonItem(pick)
      setOpening(false)
      onMessage(`You unlocked: ${pick.name}`)
    }, 1500)
  }

  return (
    <>
      <View style={styles.headRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FontAwesome name="gift" size={16} color={t.primary} />
          <Text style={[styles.h3, { color: t.textPrimary }]}>Cosmetic Chest</Text>
        </View>
        <Pressable onPress={() => setShowOdds((v) => !v)}>
          <Text style={[styles.oddsToggle, { color: t.textMuted }]}>
            {showOdds ? 'Hide' : 'Show'} Odds
          </Text>
        </Pressable>
      </View>

      {showOdds ? (
        <View style={[styles.oddsCard, { borderColor: t.border, backgroundColor: t.cardSoft }]}>
          <Text style={[styles.oddsTitle, { color: t.textPrimary }]}>Drop rates</Text>
          {(
            [
              ['common', 70],
              ['rare', 20],
              ['epic', 8],
              ['legendary', 2],
            ] as const
          ).map(([rarity, pct]) => {
            const rp = rarityPresentation(t, rarity)
            return (
            <View key={rarity} style={styles.oddsRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: rp.bg,
                      borderColor: rp.border,
                    },
                  ]}
                />
                <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                  {RARITY_LABELS[rarity]}
                </Text>
              </View>
              <Text style={{ color: t.textMuted, fontSize: 12, fontWeight: '800' }}>{pct}%</Text>
            </View>
            )
          })}
        </View>
      ) : null}

      <LinearGradient
        colors={canAfford ? [hexWithAlpha(t.primary, '22'), 'transparent'] : [hexWithAlpha(t.muted, '22'), 'transparent']}
        style={[
          styles.chestCard,
          {
            borderColor: canAfford ? hexWithAlpha(t.primary, '88') : t.border,
            opacity: canAfford ? 1 : 0.65,
          },
        ]}
      >
        {opening ? (
          <View style={[styles.openingOverlay, { backgroundColor: hexWithAlpha(t.overlay, 'AA') }]}>
            <ActivityIndicator size="large" color={t.primary} />
          </View>
        ) : null}
        <View style={styles.chestInner}>
          <Text style={styles.chestEmoji}>{opening ? '✨' : '🎁'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.chestTitle, { color: t.textPrimary }]}>Mystery Chest</Text>
            <Text style={[styles.chestSub, { color: t.textSecondary }]}>
              Random cosmetic by rarity — paid with Vault Coins only.
            </Text>
          </View>
          <AppButton
            label={opening ? 'Opening…' : `${CHEST_PRICE.toLocaleString()} Vault Coins`}
            disabled={!canAfford || opening}
            onPress={openChest}
          />
        </View>
        {!canAfford ? (
          <Text style={[styles.needMore, { color: t.destructive }]}>
            Need {(CHEST_PRICE - coins).toLocaleString()} more Vault Coins
          </Text>
        ) : null}
      </LinearGradient>

      {wonItem != null ? (
        <Modal visible transparent animationType="fade">
          <View style={[styles.winBackdrop, { backgroundColor: t.overlay }]}>
            <View style={[styles.winCard, { borderColor: t.primary, backgroundColor: t.surfaceElevated }]}>
              <Pressable style={styles.winClose} onPress={() => setWonItem(null)}>
                <FontAwesome name="times" size={20} color={t.textMuted} />
              </Pressable>
              <Text style={[styles.winLbl, { color: t.textSecondary }]}>You unlocked!</Text>
              <Text style={[styles.winName, { color: rarityPresentation(t, wonItem.rarity).text }]}>
                {wonItem.name}
              </Text>
              <Text style={[styles.winRarity, { color: rarityPresentation(t, wonItem.rarity).text }]}>
                {RARITY_LABELS[wonItem.rarity]}
              </Text>
              <View
                style={[
                  styles.winPreviewBox,
                  {
                    borderColor: rarityPresentation(t, wonItem.rarity).border,
                    backgroundColor: rarityPresentation(t, wonItem.rarity).bg,
                  },
                ]}
              >
                <ItemPreview item={wonItem} size="md" />
              </View>
              <Text style={[styles.winDesc, { color: t.textSecondary }]}>{wonItem.description}</Text>
              <AppButton label="Continue" onPress={() => setWonItem(null)} />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  h3: { fontSize: 17, fontWeight: '800' },
  oddsToggle: { fontSize: 12, fontWeight: '600' },
  oddsCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  oddsTitle: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  oddsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 3, borderWidth: 1 },
  chestCard: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  openingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  chestInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chestEmoji: { fontSize: 40 },
  chestTitle: { fontSize: 16, fontWeight: '900' },
  chestSub: { fontSize: 12, marginTop: 4 },
  needMore: { fontSize: 11, marginTop: 10, textAlign: 'center', fontWeight: '700' },
  winBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  winCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  winClose: { position: 'absolute', top: 12, right: 12, zIndex: 3, padding: 4 },
  winLbl: { fontSize: 13 },
  winName: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  winRarity: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  winPreviewBox: {
    width: 96,
    height: 96,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  winDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 8 },
})
