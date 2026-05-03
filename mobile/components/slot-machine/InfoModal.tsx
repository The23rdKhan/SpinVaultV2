import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { SYMBOLS } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppButton } from '@/components/ui/AppButton'

interface Props {
  open: boolean
  onClose: () => void
}

export function InfoModal({ open, onClose }: Props) {
  const t = useCasinoTheme()
  const regular = SYMBOLS.filter((s) => !s.isWild && !s.isScatter)

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView
        intensity={45}
        tint="dark"
        blurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: t.foreground }]}>Paytable</Text>
          <ScrollView style={styles.scroll}>
            {regular.map((s) => (
              <View key={s.id} style={styles.row}>
                <Text style={[styles.emoji, { color: t.foreground }]}>{s.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: t.foreground }]}>{s.name}</Text>
                  <Text style={[styles.meta, { color: t.mutedForeground }]}>Value × bet</Text>
                </View>
                <Text style={[styles.val, { color: t.primary }]}>{s.value}</Text>
              </View>
            ))}
            <Text style={[styles.section, { color: t.primary }]}>Special</Text>
            <Text style={[styles.body, { color: t.mutedForeground }]}>
              Wild substitutes for any regular symbol. Scatter pays anywhere; 3+ trigger 10 free spins.
            </Text>
          </ScrollView>
          <AppButton label="Close" onPress={onClose} style={{ marginTop: 12 }} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    maxHeight: '85%',
  },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 12 },
  scroll: { maxHeight: 400 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  emoji: { fontSize: 28, width: 40 },
  name: { fontWeight: '700' },
  meta: { fontSize: 12 },
  val: { fontWeight: '900', fontSize: 16 },
  section: { marginTop: 16, fontWeight: '800', fontSize: 16 },
  body: { marginTop: 8, lineHeight: 20 },
})
