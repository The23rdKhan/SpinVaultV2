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
import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { GoogleSignInButton } from '@/components/social-auth-buttons/google/google-sign-in-button'
import { AppButton } from '@/components/ui/AppButton'

export function LoginScreen() {
  const t = useCasinoTheme()
  const { signInWithEmail, signInAsGuest } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await signInWithEmail(email, password)
      if (!result.ok) {
        setError(result.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const onGuest = () => {
    signInAsGuest()
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.block}>
          <Text style={[styles.hero, { color: t.primary }]}>Welcome back</Text>
          <Text style={[styles.sub, { color: t.mutedForeground }]}>
            Sign in to sync progress with your account.
          </Text>

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
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { color: t.foreground, borderColor: t.border }]}
          />

          {error ? (
            <Text style={[styles.error, { color: t.destructive }]} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <AppButton label="Sign in" loading={loading} onPress={() => void onSubmit()} style={styles.btn} />

          <AppButton
            variant="ghost"
            label="Forgot password?"
            style={styles.btn}
            onPress={() => router.push(routes.forgotPassword)}
          />

          <AppleSignInButton />
          <GoogleSignInButton />

          <AppButton variant="outline" label="Continue as guest" onPress={onGuest} style={styles.btn} />

          <AppButton
            variant="ghost"
            label="Create an account"
            style={styles.btn}
            onPress={() => router.push(routes.register)}
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
