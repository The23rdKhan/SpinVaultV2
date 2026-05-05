import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Toast from 'react-native-toast-message'
import { AppButton } from '@/components/ui/AppButton'
import { useAppearance } from '@/lib/appearance-context'
import { useNativeSemanticColors } from '@/lib/native-semantic-colors'
import { track } from '@/lib/analytics/track'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AnalyticsEvents } from '@shared/analytics/event-names'
import { submitFeedbackRow, submitSupportTicketRow } from '@/lib/feedback-support-submit'

const EMOJIS = ['😡', '😕', '😐', '🙂', '😍']
const EMOJI_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']

export function HelpFeedback() {
  const t = useCasinoTheme()
  const { mode } = useAppearance()
  const native = useNativeSemanticColors(mode)
  const inputFg = native?.label ?? t.textPrimary
  const placeholder = native?.placeholderText ?? t.textMuted
  const inputBorder = native?.separator ?? t.border

  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'feedback' | 'bug' | 'feature'>('feedback')
  const [rating, setRating] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const onEmoji = (idx: number) => {
    setRating(idx + 1)
    Toast.show({ type: 'success', text1: EMOJI_LABELS[idx] ?? 'Thanks!' })
    setTimeout(() => setRating(null), 600)
  }

  const submitForm = () => {
    void (async () => {
      if (!message.trim()) {
        Toast.show({ type: 'error', text1: 'Add a message first' })
        return
      }
      setSubmitting(true)
      const okFeedback = await submitFeedbackRow({
        formType,
        message: message.trim(),
        email: email.trim() || undefined,
        rating,
        screen: 'profile_help',
      })
      let okTicket = true
      if (formType === 'bug') {
        okTicket = await submitSupportTicketRow({
          subject: 'Bug report (mobile)',
          message: message.trim(),
          email: email.trim() || undefined,
          category: 'bug',
        })
      }
      setSubmitting(false)
      track(AnalyticsEvents.FEEDBACK_SUBMITTED, {
        form_type: formType,
        has_email: Boolean(email.trim()),
        saved_feedback: okFeedback,
        saved_ticket: okTicket,
      })
      if (okFeedback || (formType === 'bug' && okTicket)) {
        setSubmitted(true)
        Toast.show({
          type: 'success',
          text1: okFeedback ? 'Thanks — sent!' : 'Ticket logged',
        })
        setTimeout(() => {
          setShowForm(false)
          setSubmitted(false)
          setMessage('')
          setEmail('')
        }, 1200)
      } else {
        Toast.show({
          type: 'error',
          text1: 'Could not send',
          text2: 'Sign in and check connection, then try again.',
        })
      }
    })()
  }

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <FontAwesome name="question-circle" size={16} color={t.primary} />
        <Text style={[styles.h3, { color: t.textPrimary }]}>Help & Feedback</Text>
      </View>

      <View style={[styles.card, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}>
        {!showForm ? (
          <View style={styles.block}>
            <Text style={[styles.prompt, { color: t.textPrimary }]}>How are you enjoying SpinVault?</Text>
            <View style={styles.emojiRow}>
              {EMOJIS.map((e, i) => (
                <AppButton
                  key={i}
                  variant="ghost"
                  size="sm"
                  label={e}
                  onPress={() => onEmoji(i)}
                  style={styles.emojiBtn}
                  accessibilityLabel={EMOJI_LABELS[i]}
                />
              ))}
            </View>
            {rating ? (
              <Text style={[styles.hint, { color: t.textMuted }]}>
                {EMOJI_LABELS[rating - 1]} — thanks!
              </Text>
            ) : null}
            <View style={styles.linkRow}>
              <AppButton
                size="sm"
                variant="outline"
                label="Feedback"
                onPress={() => {
                  setFormType('feedback')
                  setShowForm(true)
                }}
                style={styles.flexBtn}
              />
              <AppButton
                size="sm"
                variant="outline"
                label="Bug"
                onPress={() => {
                  setFormType('bug')
                  setShowForm(true)
                }}
                style={styles.flexBtn}
              />
              <AppButton
                size="sm"
                variant="outline"
                label="Idea"
                onPress={() => {
                  setFormType('feature')
                  setShowForm(true)
                }}
                style={styles.flexBtn}
              />
            </View>
          </View>
        ) : (
          <View style={styles.block}>
            <Text style={[styles.prompt, { color: t.textPrimary }]}>
              {formType === 'bug' ? 'Bug report' : formType === 'feature' ? 'Feature request' : 'Feedback'}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email (optional)"
              placeholderTextColor={placeholder}
              style={[styles.input, { color: inputFg, borderColor: inputBorder, backgroundColor: t.input }]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Your message"
              placeholderTextColor={placeholder}
              multiline
              style={[styles.area, { color: inputFg, borderColor: inputBorder, backgroundColor: t.input }]}
            />
            <AppButton
              label={submitted ? 'Sent!' : submitting ? 'Sending…' : 'Submit'}
              disabled={submitted || submitting}
              onPress={submitForm}
            />
            {submitting ? (
              <ActivityIndicator style={{ marginTop: 8 }} color={t.primary} />
            ) : null}
            <AppButton
              variant="ghost"
              label="Back"
              onPress={() => setShowForm(false)}
              style={{ marginTop: 8 }}
            />
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  h3: { fontSize: 17, fontWeight: '800' },
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  block: { gap: 12 },
  prompt: { fontSize: 14, fontWeight: '600' },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiBtn: { minWidth: 48 },
  hint: { textAlign: 'center', fontSize: 12 },
  linkRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  flexBtn: { flex: 1, minWidth: 96 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  area: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
  },
})
