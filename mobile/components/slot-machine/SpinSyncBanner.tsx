import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { useGame } from '@/lib/game-context'
import { isServerSpinEnabled } from '@/lib/server-spin'
import { hexWithAlpha } from '@/theme/tokens'
import { useCasinoTheme } from '@/lib/use-casino-theme'

export function SpinSyncBanner() {
  const t = useCasinoTheme()
  const { spinSyncDeferred, resyncWalletFromServer } = useGame()
  const [busy, setBusy] = useState(false)

  const onSync = useCallback(async () => {
    if (busy) return
    setBusy(true)
    const ok = await resyncWalletFromServer()
    setBusy(false)
    if (ok) {
      Toast.show({
        type: 'success',
        text1: 'Synced',
        text2: 'Virtual coin balance matches the server.',
      })
    } else {
      Toast.show({
        type: 'error',
        text1: 'Sync failed',
        text2: 'Check connection and try again.',
      })
    }
  }, [busy, resyncWalletFromServer])

  if (!isServerSpinEnabled() || !spinSyncDeferred) return null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sync vault balance with server"
      onPress={onSync}
      style={[styles.wrap, { borderColor: t.primary, backgroundColor: hexWithAlpha(t.primary, '18') }]}
    >
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: t.textPrimary }]}>Device-only spins</Text>
        <Text style={[styles.body, { color: t.textSecondary }]}>
          Coin balance may differ until synced with the server.
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator color={t.primary} />
      ) : (
        <Text style={[styles.cta, { color: t.primary }]}>Sync</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  textCol: { flex: 1, gap: 2 },
  title: { fontWeight: '800', fontSize: 13 },
  body: { fontSize: 11, fontWeight: '600', lineHeight: 15 },
  cta: { fontWeight: '900', fontSize: 14 },
})
