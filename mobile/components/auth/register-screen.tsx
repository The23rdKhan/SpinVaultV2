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

export function RegisterScreen() {
  const t = useCasinoTheme()
  const { signUp } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await signUp(email.trim(), password, username.trim())
      if (!result.ok) {
        setError(result.error)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.block}>
          <Text style={[styles.hero, { color: t.primary }]}>Create account</Text>
          <Text style={[styles.sub, { color: t.mutedForeground }]}>
            Sign up with email. To use Apple or Google, go back and choose those options on the sign-in screen.
          </Text>

          <TextInput
            placeholder="Username"
            placeholderTextColor={t.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            style={[styles.input, { color: t.foreground, borderColor: t.border }]}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor={t.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { color: t.foreground, borderColor: t.border }]}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={t.mutedForeground}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { color: t.foreground, borderColor: t.border }]}
          />

          {error ? (
            <Text style={[styles.error, { color: t.destructive }]} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <AppButton
            label="Create account"
            loading={loading}
            onPress={() => void onSubmit()}
            style={styles.btn}
          />

          <AppButton
            variant="ghost"
            label="Back to sign in"
            onPress={() => router.replace(routes.login)}
          />
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
