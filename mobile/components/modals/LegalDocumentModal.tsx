import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppButton } from '@/components/ui/AppButton'
import { getLegalDocument, type LegalDocType } from '@shared/legal-documents'

interface Props {
  visible: boolean
  type: LegalDocType
  onClose: () => void
}

/**
 * Full-screen bottom-sheet modal that displays Privacy Policy or Terms of Service
 * in-app using native React Native text — no WebView or external browser required.
 *
 * ⚠️ Content in shared/legal-documents.ts is DRAFT copy pending legal review.
 */
export function LegalDocumentModal({ visible, type, onClose }: Props) {
  const t = useCasinoTheme()
  const doc = getLegalDocument(type)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop blur */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}>
        <BlurView
          intensity={45}
          tint="dark"
          blurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Tap outside to dismiss */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/*
          Plain View — not Pressable — so the inner ScrollView's pan gesture
          is never swallowed by the backdrop tap handler.
        */}
        <View
          style={[styles.sheet, { backgroundColor: t.surfaceElevated, borderColor: t.border }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: t.border }]}>
            <Text style={[styles.title, { color: t.textPrimary }]}>{doc.title}</Text>
            <Text style={[styles.effectiveDate, { color: t.textMuted }]}>
              Effective {doc.effectiveDate}
            </Text>
          </View>

          {/* Scrollable content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            bounces
          >
            {/* ⚠️ Draft banner — fixed amber colors, intentionally not theme-aware */}
            <View style={styles.draftBanner}>
              <Text style={styles.draftBannerText}>
                ⚠️  DRAFT — pending legal review. Not final.
              </Text>
            </View>

            {/* Intro */}
            <Text style={[styles.intro, { color: t.textSecondary }]}>{doc.intro}</Text>

            {/* Sections */}
            {doc.sections.map((section, i) => (
              <View key={i} style={styles.section}>
                <Text style={[styles.sectionHeading, { color: t.textPrimary }]}>
                  {section.heading}
                </Text>
                <Text style={[styles.sectionBody, { color: t.textSecondary }]}>
                  {section.body}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Close button */}
          <View style={[styles.footer, { borderTopColor: t.border }]}>
            <AppButton label="Close" onPress={onClose} style={styles.closeBtn} />
          </View>
        </View>
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
    paddingTop: 20,
    borderWidth: 1,
    // Concrete height — lets the flex:1 ScrollView resolve its size.
    height: '88%',
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  effectiveDate: {
    fontSize: 12,
    fontWeight: '400',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 20,
  },
  draftBanner: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    // Amber warning — hardcoded intentionally; not a theme token.
    backgroundColor: '#7c3b00',
    borderColor: '#f5a623',
  },
  draftBannerText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    color: '#fff',
  },
  intro: {
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    gap: 6,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 21,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  closeBtn: {
    alignSelf: 'stretch',
    minHeight: 48,
  },
})
