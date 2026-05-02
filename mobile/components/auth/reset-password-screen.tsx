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

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.block}>
          <Text style={[styles.hero, { color: t.primary }]}>Set new password</Text>
          <Text style={[styles.sub, { color: t.mutedForeground }]}>
            Choose a new password for your account.
          </Text>

          <TextInput
            placeholder="New password"
            placeholderTextColor={t.mutedForeground}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { color: t.foreground, borderColor: t.border }]}
          />
          <TextInput
            placeholder="Confirm password"
            placeholderTextColor={t.mutedForeground}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={confirm}
            onChangeText={setConfirm}
            style={[styles.input, { color: t.foreground, borderColor: t.border }]}
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
  block: { gap: 14 },
  hero: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  sub: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 8 },
  btn: { alignSelf: 'stretch' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { fontSize: 14, lineHeight: 20 },
})
