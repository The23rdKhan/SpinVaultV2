import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { routes } from '@/lib/app-routes'
import { useAuth } from '@/lib/auth-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppButton } from '@/components/ui/AppButton'
import { AppScrollView } from '@/components/ui/AppScrollView'
import { APP_NAME } from '@shared/brand'

export function ForgotPasswordScreen() {
  const t = useCasinoTheme()
  const { sendPasswordResetEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const onSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await sendPasswordResetEmail(email)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = [
    styles.input,
    {
      color: t.textPrimary,
      backgroundColor: t.inputBackground,
      borderColor: t.border,
    },
  ]

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.brandKicker, { color: t.textMuted }]}>{APP_NAME}</Text>
          <Text style={[styles.hero, { color: t.textPrimary }]} accessibilityRole="header">
            Forgot password
          </Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>
            {sent
              ? 'If an account exists for that email, we sent a link to reset your password. Open it on this device.'
              : 'Enter your email and we’ll send reset instructions.'}
          </Text>

          {!sent ? (
            <>
              <TextInput
                placeholder="Email"
                placeholderTextColor={t.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                style={inputStyle}
                accessibilityLabel="Email"
              />
              {error ? (
                <Text style={[styles.error, { color: t.destructive }]} accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}
              <AppButton
                label="Send reset link"
                loading={loading}
                onPress={() => void onSubmit()}
                style={styles.btn}
              />
            </>
          ) : null}

          <AppButton
            variant="ghost"
            label="Back to sign in"
            onPress={() => router.replace(routes.login)}
          />
        </View>
      </AppScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 14,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  brandKicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  hero: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: 4 },
  btn: { alignSelf: 'stretch', minHeight: 48 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    minHeight: 48,
  },
  error: { fontSize: 15, lineHeight: 22 },
})
