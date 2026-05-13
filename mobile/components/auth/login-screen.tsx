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
import { APP_NAME } from '@shared/brand'
import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { GoogleSignInButton } from '@/components/social-auth-buttons/google/google-sign-in-button'
import { AppButton } from '@/components/ui/AppButton'
import { AppScrollView } from '@/components/ui/AppScrollView'

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

  const onGuest = async () => {
    setError(null)
    const ok = await signInAsGuest()
    if (!ok) {
      setError('Could not continue as guest. Please try again.')
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
        <View
          style={[
            styles.card,
            { backgroundColor: t.card, borderColor: t.border },
          ]}
        >
          <Text style={[styles.brandKicker, { color: t.textMuted }]} accessibilityRole="text">
            {APP_NAME}
          </Text>
          <Text style={[styles.hero, { color: t.textPrimary }]} accessibilityRole="header">
            Welcome back
          </Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>
            Sign in to sync your collection and rewards.
          </Text>

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
          <TextInput
            placeholder="Password"
            placeholderTextColor={t.textMuted}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            style={inputStyle}
            accessibilityLabel="Password"
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

          <AppButton
            variant="outline"
            label="Continue as guest"
            onPress={() => void onGuest()}
            style={styles.btn}
          />

          <AppButton
            variant="ghost"
            label="Create an account"
            style={styles.btn}
            onPress={() => router.push(routes.register)}
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
