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

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: t.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {step === 'welcome' ? (
          <View style={styles.block}>
            <Text style={[styles.hero, { color: t.primary }]}>Lucky Slots</Text>
            <Text style={[styles.sub, { color: t.mutedForeground }]}>
              Spin, win jackpots, and collect daily rewards.
            </Text>
            <AppButton label="Continue" onPress={() => setStep('age')} style={styles.btn} />
          </View>
        ) : null}

        {step === 'age' ? (
          <View style={styles.block}>
            <Text style={[styles.title, { color: t.foreground }]}>Age verification</Text>
            <Text style={[styles.sub, { color: t.mutedForeground }]}>
              You must be 18+ to play simulated casino games.
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
            <Text style={[styles.title, { color: t.foreground }]}>Save progress</Text>
            <TextInput
              placeholder="Username"
              placeholderTextColor={t.mutedForeground}
              value={username}
              onChangeText={setUsername}
              style={[styles.input, { color: t.foreground, borderColor: t.border }]}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor={t.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={[styles.input, { color: t.foreground, borderColor: t.border }]}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={t.mutedForeground}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={[styles.input, { color: t.foreground, borderColor: t.border }]}
            />
            {formError ? (
              <Text style={[styles.error, { color: t.destructive }]} accessibilityLiveRegion="polite">
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
              label="Play as guest"
              loading={guestBusy}
              disabled={loading || guestBusy}
              onPress={() => void onGuest()}
              style={styles.btn}
            />
            <AppButton variant="ghost" label="Back" onPress={() => setStep('age')} />
          </View>
        ) : null}
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
  hero: { fontSize: 36, fontWeight: '900', textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 15, lineHeight: 22 },
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
