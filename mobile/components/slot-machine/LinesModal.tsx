import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppButton } from '@/components/ui/AppButton'

interface Props {
  open: boolean
  onClose: () => void
}

const LINES = [
  'Middle row — straight line',
  'Top row',
  'Bottom row',
  'V shape',
  'Inverted V',
  'Diagonal down',
  'Diagonal up',
  'Top bump',
  'Bottom bump',
]

export function LinesModal({ open, onClose }: Props) {
  const t = useCasinoTheme()

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: t.foreground }]}>9 paylines</Text>
          <Text style={[styles.sub, { color: t.mutedForeground }]}>
            Wins count left-to-right on active lines. Wild helps complete matches.
          </Text>
          <ScrollView style={styles.scroll}>
            {LINES.map((line, i) => (
              <Text key={i} style={[styles.line, { color: t.foreground }]}>
                {i + 1}. {line}
              </Text>
            ))}
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    maxHeight: '80%',
  },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { marginTop: 8, marginBottom: 12, lineHeight: 20 },
  scroll: { maxHeight: 320 },
  line: { paddingVertical: 6, fontWeight: '600' },
})
