import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useAuth } from '@/lib/auth-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { GoogleSignInButton } from '@/components/social-auth-buttons/google/google-sign-in-button'
import { AppButton } from '@/components/ui/AppButton'
import { track } from '@/lib/analytics/track'
import { AnalyticsEvents } from '@shared/analytics/event-names'

type Step = 'welcome' | 'age' | 'signup'

export function OnboardingScreen() {
  const t = useCasinoTheme()
  const { signInAsGuest, signUp, completeOnboarding } = useAuth()
  const [step, setStep] = useState<Step>('welcome')
  const [ageOk, setAgeOk] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestBusy, setGuestBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    track(AnalyticsEvents.ONBOARDING_STARTED)
  }, [])

  const onGuest = async () => {
    setFormError(null)
    setGuestBusy(true)
    try {
      const ok = await signInAsGuest()
      if (!ok) {
        setFormError('Could not start a guest session. Please try again.')
        return
      }
      completeOnboarding()
      track(AnalyticsEvents.ONBOARDING_COMPLETED, { path: 'guest' })
    } finally {
      setGuestBusy(false)
    }
  }

  const onEmailSignup = async () => {
    if (!email.trim() || !password || !username.trim()) return
    setFormError(null)
    setLoading(true)
    try {
      const result = await signUp(email.trim(), password, username.trim())
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      completeOnboarding()
      track(AnalyticsEvents.ONBOARDING_COMPLETED, { path: 'email_signup' })
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.card,
            {
              backgroundColor: t.card,
              borderColor: t.border,
            },
          ]}
        >
          {step === 'welcome' ? (
            <View style={styles.block}>
              <Text style={[styles.kicker, { color: t.accent }]}>Collect · Rewards · Themes</Text>
              <Text style={[styles.hero, { color: t.textPrimary }]} accessibilityRole="header">
                Welcome to SpinVault
              </Text>
              <Text style={[styles.subtitleBrand, { color: t.gold }]}>Lucky Slots</Text>
              <Text style={[styles.sub, { color: t.textSecondary }]}>
                Virtual coins, daily rewards, and collectible themes — entertainment only.
              </Text>
              <Text style={[styles.disclosure, { color: t.textMuted }]}>
                Coins are for in-game entertainment only and have no cash value.
              </Text>
              <AppButton label="Start Spinning" onPress={() => setStep('age')} style={styles.btn} />
            </View>
          ) : null}

          {step === 'age' ? (
            <View style={styles.block}>
              <Text style={[styles.title, { color: t.textPrimary }]}>Before you continue</Text>
              <Text style={[styles.sub, { color: t.textSecondary }]}>
                SpinVault is for adults (18+). Virtual coins and rewards are for entertainment only — no cash value.
                SpinVault does not offer real-money gambling or cash prizes.
              </Text>
              <AppButton
                variant={ageOk ? 'primary' : 'outline'}
                label={ageOk ? 'I am 18 or older ✓' : 'I am 18 or older'}
                onPress={() => setAgeOk((v) => !v)}
                style={styles.btn}
              />
              <AppButton
                label="Continue"
                disabled={!ageOk}
                onPress={() => setStep('signup')}
                style={styles.btn}
              />
              <AppButton variant="ghost" label="Back" onPress={() => setStep('welcome')} />
            </View>
          ) : null}

          {step === 'signup' ? (
            <View style={styles.block}>
              <Text style={[styles.title, { color: t.textPrimary }]}>Create your profile</Text>
              <Text style={[styles.sub, { color: t.textSecondary }]}>
                Save progress across devices. Or continue as a guest anytime.
              </Text>
              <TextInput
                placeholder="Username"
                placeholderTextColor={t.textMuted}
                value={username}
                onChangeText={setUsername}
                style={inputStyle}
                accessibilityLabel="Username"
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor={t.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={inputStyle}
                accessibilityLabel="Email"
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor={t.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={inputStyle}
                accessibilityLabel="Password"
              />
              {formError ? (
                <Text
                  style={[styles.error, { color: t.destructive }]}
                  accessibilityLiveRegion="polite"
                >
                  {formError}
                </Text>
              ) : null}
              <AppButton
                label="Create account"
                loading={loading}
                onPress={onEmailSignup}
                style={styles.btn}
              />
              <AppleSignInButton
                navigateToTabs={false}
                onSuccess={() => {
                  completeOnboarding()
                  track(AnalyticsEvents.ONBOARDING_COMPLETED, { path: 'apple' })
                }}
              />
              <GoogleSignInButton
                navigateToTabs={false}
                onSuccess={() => {
                  completeOnboarding()
                  track(AnalyticsEvents.ONBOARDING_COMPLETED, { path: 'google' })
                }}
              />
              <AppButton
                variant="outline"
                label="Continue as Guest"
                loading={guestBusy}
                disabled={loading || guestBusy}
                onPress={() => void onGuest()}
                style={styles.btn}
              />
              <AppButton variant="ghost" label="Back" onPress={() => setStep('age')} />
            </View>
          ) : null}
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
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  block: { gap: 14 },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  hero: { fontSize: 28, fontWeight: '700', textAlign: 'center', lineHeight: 34 },
  subtitleBrand: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { fontSize: 16, lineHeight: 24 },
  disclosure: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 },
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
