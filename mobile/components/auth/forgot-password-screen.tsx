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
import { AuthBackgroundLayout, OnboardingHeroImage } from '@/components/brand/asset-components'
import { AppButton } from '@/components/ui/AppButton'
import { AppScrollView } from '@/components/ui/AppScrollView'
import { APP_NAME } from '@shared/brand'
import { SPINVAULT_LOGO_HORIZONTAL_PNG } from '@/lib/brand-assets'

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
            Reset Your Password
          </Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>
            {sent
              ? 'If an account exists for that email, we sent a link to reset your password. Open it on this device.'
              : 'Enter your email and we’ll help you get back into your vault.'}
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
                label="Send Reset Link"
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
