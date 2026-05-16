import { useState } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native'
import { router } from 'expo-router'
import { routes } from '@/lib/app-routes'
import { useAuth } from '@/lib/auth-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { APP_NAME } from '@shared/brand'
import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { GoogleSignInButton } from '@/components/social-auth-buttons/google/google-sign-in-button'
import { AuthBackgroundLayout, OnboardingHeroImage } from '@/components/brand/asset-components'
import { AppButton } from '@/components/ui/AppButton'
import { AppScrollView } from '@/components/ui/AppScrollView'
import { SPINVAULT_LOGO_HORIZONTAL_PNG } from '@/lib/brand-assets'

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
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthBackgroundLayout>
        <AppScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Image
            source={SPINVAULT_LOGO_HORIZONTAL_PNG}
            resizeMode="contain"
            style={styles.logo}
            accessibilityLabel={`${APP_NAME} logo`}
            accessibilityRole="image"
          />
          <OnboardingHeroImage
            source={require('@/assets/icons/cloud-sync.png')}
            compact
            accessibilityLabel="Cloud sync vault icon"
          />
          <Text style={[styles.hero, { color: t.textPrimary }]} accessibilityRole="header">
            Welcome Back
          </Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>
            Log in to access your vault on this device.
          </Text>

          <TextInput
            placeholder="Email or Username"
            placeholderTextColor={t.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            style={inputStyle}
            accessibilityLabel="Email or Username"
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

          <AppButton label="Log In" loading={loading} onPress={() => void onSubmit()} style={styles.btn} />

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
            label="Don’t have an account? Sign up"
            style={styles.btn}
            onPress={() => router.push(routes.register)}
          />
        </AppScrollView>
      </AuthBackgroundLayout>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 14,
  },
  logo: {
    width: '100%',
    height: 52,
    alignSelf: 'center',
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
