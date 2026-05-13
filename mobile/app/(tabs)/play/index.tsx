import { Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SlotMachine } from '@/components/slot-machine/SlotMachine'
import { RecentSpinsRow } from '@/components/slot-machine/RecentSpinsRow'
import { useGame } from '@/lib/game-context'
import { SCREEN_PAD_H } from '@/lib/screen-edge'
import { useCasinoTheme } from '@/lib/use-casino-theme'

export default function PlayScreen() {
  const t = useCasinoTheme()
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 12) + 24
  const { spinAudit } = useGame()

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: t.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad, paddingHorizontal: SCREEN_PAD_H }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      alwaysBounceVertical={false}
      bounces={false}
      {...(Platform.OS === 'android' ? { overScrollMode: 'never' as const } : {})}
    >
      <View
        collapsable={false}
        style={[styles.playSurface, { backgroundColor: t.surface, borderColor: t.border }]}
      >
        <SlotMachine />
      </View>

      <RecentSpinsRow spinAudit={spinAudit} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingTop: 8 },
  playSurface: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
})
