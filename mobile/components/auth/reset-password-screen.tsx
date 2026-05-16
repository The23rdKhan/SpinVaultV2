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
            source={require('@/assets/icons/save-vault-shield.png')}
            compact
            accessibilityLabel="Save your vault shield"
          />
          <Text style={[styles.hero, { color: t.textPrimary }]} accessibilityRole="header">
            Reset Your Password
          </Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>
            Choose a new password to get back into your vault.
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
