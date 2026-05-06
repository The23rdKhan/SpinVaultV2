import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { APP_NAME } from '@shared/brand'

export function ResetPasswordScreen() {
  const t = useCasinoTheme()
  const { completePasswordReset, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const result = await completePasswordReset(password)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.replace(routes.tabsIndex)
    } finally {
      setLoading(false)
    }
  }

  const onCancel = async () => {
    await signOut()
    router.replace(routes.login)
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.brandKicker, { color: t.textMuted }]}>{APP_NAME}</Text>
          <Text style={[styles.hero, { color: t.textPrimary }]} accessibilityRole="header">
            Set new password
          </Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>
            Choose a new password for your account.
          </Text>

          <TextInput
            placeholder="New password"
            placeholderTextColor={t.textMuted}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
            style={inputStyle}
            accessibilityLabel="New password"
          />
          <TextInput
            placeholder="Confirm password"
            placeholderTextColor={t.textMuted}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={confirm}
            onChangeText={setConfirm}
            style={inputStyle}
            accessibilityLabel="Confirm password"
          />

          {error ? (
            <Text style={[styles.error, { color: t.destructive }]} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <AppButton
            label="Update password"
            loading={loading}
            onPress={() => void onSubmit()}
            style={styles.btn}
          />
          <AppButton variant="ghost" label="Cancel" onPress={() => void onCancel()} />
        </View>
      </ScrollView>
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
