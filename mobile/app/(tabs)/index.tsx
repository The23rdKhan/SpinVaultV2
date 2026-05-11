import { ScrollView, StyleSheet } from 'react-native'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { SlotMachine } from '@/components/slot-machine/SlotMachine'

export default function PlayScreen() {
  const t = useCasinoTheme()
  return (
    <ScrollView style={[styles.scroll, { backgroundColor: t.background }]} contentContainerStyle={styles.content}>
      <SlotMachine />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 32 },
})
