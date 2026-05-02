import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SlotMachine } from '@/components/slot-machine/SlotMachine'
import { SCREEN_PAD_H } from '@/lib/screen-edge'
import { useCasinoTheme } from '@/lib/use-casino-theme'

export default function PlayScreen() {
  const t = useCasinoTheme()
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 12) + 24

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: t.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad, paddingHorizontal: SCREEN_PAD_H }]}
      keyboardShouldPersistTaps="handled"
    >
      <View collapsable={false}>
        <SlotMachine />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingTop: 8 },
})
