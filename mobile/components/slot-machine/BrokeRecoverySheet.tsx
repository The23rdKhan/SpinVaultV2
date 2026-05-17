import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAppearance } from '@/lib/appearance-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'

export interface BrokeRecoverySheetProps {
  open: boolean
  onClose: () => void
  onPressRewards: () => void
  onPressShop: () => void
  /** When true, show a row that runs rewarded video via parent (same limits as Rewards tab). */
  showWatchVideo: boolean
  onWatchVideo: () => Promise<void>
  watchVideoBusy: boolean
}

/**
 * Bottom sheet listing recovery paths when the player is short on coins.
 * Premium social-slot tone — helpful, not pushy.
 */
export function BrokeRecoverySheet({
  open,
  onClose,
  onPressRewards,
  onPressShop,
  showWatchVideo,
  onWatchVideo,
  watchVideoBusy,
}: BrokeRecoverySheetProps) {
  const t = useCasinoTheme()
  const insets = useSafeAreaInsets()
  const { resolvedMode } = useAppearance()
  const blurTint = resolvedMode === 'dark' ? 'dark' : 'light'

  const handleRewards = () => {
    onClose()
    onPressRewards()
  }

  const handleShop = () => {
    onClose()
    onPressShop()
  }

  const handleWatch = async () => {
    await onWatchVideo()
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}>
        <BlurView
          intensity={40}
          tint={blurTint}
          blurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      </View>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss">
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: t.surfaceElevated,
              borderColor: t.border,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
        >
          <View style={[styles.handle, { backgroundColor: t.muted }]} />
          <Text style={[styles.title, { color: t.textPrimary }]}>Get Vault Coins</Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>
            Pick a path — rewards include daily login and optional video bonuses.
          </Text>

          {showWatchVideo ? (
            <Pressable
              style={({ pressed }) => [
                styles.row,
                {
                  borderColor: t.border,
                  backgroundColor: pressed ? hexWithAlpha(t.freeSpin, '14') : t.card,
                  opacity: watchVideoBusy ? 0.85 : 1,
                },
              ]}
              onPress={() => void handleWatch()}
              disabled={watchVideoBusy}
              accessibilityRole="button"
              accessibilityLabel="Watch video for Vault Coins"
              accessibilityState={{ busy: watchVideoBusy }}
            >
              <View style={[styles.rowIcon, { backgroundColor: hexWithAlpha(t.freeSpin, '22') }]}>
                <FontAwesome name="play" size={18} color={t.freeSpin} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Watch video</Text>
                <Text style={[styles.rowMeta, { color: t.textMuted }]}>Quick Vault Coin bonus</Text>
              </View>
              {watchVideoBusy ? (
                <ActivityIndicator color={t.primary} />
              ) : (
                <FontAwesome name="chevron-right" size={14} color={t.textMuted} />
              )}
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.row,
              { borderColor: t.border, backgroundColor: pressed ? hexWithAlpha(t.primary, '12') : t.card },
            ]}
            onPress={handleRewards}
            accessibilityRole="button"
            accessibilityLabel="Rewards and daily bonuses"
          >
            <View style={[styles.rowIcon, { backgroundColor: hexWithAlpha(t.primary, '22') }]}>
              <FontAwesome name="gift" size={20} color={t.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Rewards & daily bonuses</Text>
              <Text style={[styles.rowMeta, { color: t.textMuted }]}>Missions & login streak</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={t.textMuted} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.row,
              styles.rowLast,
              { borderColor: t.border, backgroundColor: pressed ? hexWithAlpha(t.gold, '14') : t.card },
            ]}
            onPress={handleShop}
            accessibilityRole="button"
            accessibilityLabel="Shop Vault Coin packs"
          >
            <View style={[styles.rowIcon, { backgroundColor: hexWithAlpha(t.gold, '28') }]}>
              <FontAwesome name="shopping-bag" size={18} color={t.gold} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Shop</Text>
              <Text style={[styles.rowMeta, { color: t.textMuted }]}>Coin packs</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={t.textMuted} />
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.doneBtn, { opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={[styles.doneLbl, { color: t.primary }]}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const ROW_MIN_H = 52

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '88%',
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  sub: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: ROW_MIN_H,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowLast: { marginBottom: 4 },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '800' },
  rowMeta: { fontSize: 12, fontWeight: '600' },
  doneBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  doneLbl: { fontSize: 16, fontWeight: '800' },
})
