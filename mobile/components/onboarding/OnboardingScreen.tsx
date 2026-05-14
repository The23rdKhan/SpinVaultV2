import { useEffect, useState } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { GoogleSignInButton } from '@/components/social-auth-buttons/google/google-sign-in-button'
import { AppButton } from '@/components/ui/AppButton'
import { AppScrollView } from '@/components/ui/AppScrollView'
import { track } from '@/lib/analytics/track'
import { AnalyticsEvents } from '@shared/analytics/event-names'
import { LegalDocumentModal } from '@/components/modals/LegalDocumentModal'
import type { LegalDocType } from '@shared/legal-documents'
import {
  APP_COMPLIANCE_LINE,
  APP_FULL_NAME,
  APP_NAME,
  APP_SUBTITLE,
  APP_TAGLINE,
  APP_COMPLIANCE_FULL,
} from '@shared/brand'
import { SPINVAULT_LOGO_HORIZONTAL_PNG } from '@/lib/brand-assets'

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
  const [legalModal, setLegalModal] = useState<LegalDocType | null>(null)

  useEffect(() => {
    track(AnalyticsEvents.ONBOARDING_STARTED)
  }, [])

  const onGuest = async () => {
    setFormError(null)
    setGuestBusy(true)
    try {
      const ok = await signInAsGuest()
      if (!ok) {
        setFormError('Could not open a guest vault on this device. Please try again.')
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
      <AppScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
              <Image
                source={SPINVAULT_LOGO_HORIZONTAL_PNG}
                style={styles.stepLogo}
                resizeMode="contain"
                accessibilityLabel={`${APP_FULL_NAME} logo`}
                accessibilityRole="image"
              />
              <Text style={[styles.kicker, { color: t.accent }]}>{APP_TAGLINE}</Text>
              <Text style={[styles.hero, { color: t.textPrimary }]} accessibilityRole="header">
                {APP_NAME}
              </Text>
              <Text style={[styles.subtitleBrand, { color: t.gold }]}>{APP_SUBTITLE}</Text>
              <Text style={[styles.sub, { color: t.textSecondary }]}>
                Your private vault for the reels: spin with Vault Coins, chase daily rewards and missions, and
                unlock machine themes that make the floor feel like yours — all for fun, not for cash.
              </Text>
              <Text style={[styles.disclosure, { color: t.textMuted }]}>{APP_COMPLIANCE_LINE}</Text>
              <AppButton label="Start spinning" onPress={() => setStep('age')} style={styles.btn} />
            </View>
          ) : null}

          {step === 'age' ? (
            <View style={styles.block}>
              <Text style={[styles.title, { color: t.textPrimary }]}>Inside the vault</Text>
              <Text style={[styles.sub, { color: t.textSecondary }]}>
                Before we unlock the reels, we need to know you're old enough to play.{'\n\n'}
                <Text style={{ fontWeight: '600' }}>{APP_NAME}</Text> is for adults (18+). {APP_COMPLIANCE_FULL}
              </Text>
              <AppButton
                variant={ageOk ? 'primary' : 'outline'}
                label={ageOk ? 'I am 18 or older ✓' : 'I am 18 or older'}
                onPress={() => setAgeOk((v) => !v)}
                style={styles.btn}
              />
              <AppButton
                label="Save & continue"
                disabled={!ageOk}
                onPress={() => setStep('signup')}
                style={styles.btn}
              />
              <Text style={[styles.legalLine, { color: t.textMuted }]}>
                By continuing, you agree to our{' '}
                <Text
                  style={[styles.legalLink, { color: t.accent }]}
                  onPress={() => setLegalModal('terms')}
                  accessibilityRole="link"
                  accessibilityLabel="Terms of Service"
                >
                  Terms of Service
                </Text>
                {' '}and acknowledge the{' '}
                <Text
                  style={[styles.legalLink, { color: t.accent }]}
                  onPress={() => setLegalModal('privacy')}
                  accessibilityRole="link"
                  accessibilityLabel="Privacy Policy"
                >
                  Privacy Policy
                </Text>
                .
              </Text>
              <AppButton variant="ghost" label="Back" onPress={() => setStep('welcome')} />
            </View>
          ) : null}

          {step === 'signup' ? (
            <View style={styles.block}>
              <Image
                source={SPINVAULT_LOGO_HORIZONTAL_PNG}
                style={styles.stepLogo}
                resizeMode="contain"
                accessibilityLabel={`${APP_FULL_NAME} logo`}
                accessibilityRole="image"
              />
              <Text style={[styles.title, { color: t.textPrimary }]}>Lock in your vault</Text>
              <Text style={[styles.sub, { color: t.textSecondary }]}>
                Create an account so your Vault Coins, streaks, missions, and themes can follow you across
                devices. Prefer to look around first? Continue as a guest — you can sign up anytime from your
                profile.
              </Text>
              <TextInput
                placeholder="Display name (shown in the vault)"
                placeholderTextColor={t.textMuted}
                value={username}
                onChangeText={setUsername}
                style={inputStyle}
                accessibilityLabel="Display name"
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
                label="Create vault account"
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
                label="Continue as guest"
                loading={guestBusy}
                disabled={loading || guestBusy}
                onPress={() => void onGuest()}
                style={styles.btn}
              />
              <AppButton
                variant="ghost"
                label="Already have an account? Sign in"
                disabled={loading || guestBusy}
                onPress={() => {
                  // Mark onboarding complete so login.tsx does not redirect back to onboarding.
                  completeOnboarding()
                  track(AnalyticsEvents.ONBOARDING_COMPLETED, { path: 'sign_in_existing_account' })
                  router.push('/login')
                }}
                style={styles.btn}
              />
              <AppButton variant="ghost" label="Back" onPress={() => setStep('age')} />
              <Text style={[styles.legalLine, { color: t.textMuted }]}>
                <Text
                  style={[styles.legalLink, { color: t.textMuted }]}
                  onPress={() => setLegalModal('privacy')}
                  accessibilityRole="link"
                  accessibilityLabel="Privacy Policy"
                >
                  Privacy Policy
                </Text>
                {'  ·  '}
                <Text
                  style={[styles.legalLink, { color: t.textMuted }]}
                  onPress={() => setLegalModal('terms')}
                  accessibilityRole="link"
                  accessibilityLabel="Terms of Service"
                >
                  Terms of Service
                </Text>
              </Text>
            </View>
          ) : null}
        </View>
      </AppScrollView>

      {/* Always mounted so the slide-out dismiss animation plays correctly. */}
      <LegalDocumentModal
        visible={legalModal !== null}
        type={legalModal ?? 'terms'}
        onClose={() => setLegalModal(null)}
      />
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
  stepLogo: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 300,
    height: 44,
    marginBottom: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  hero: { fontSize: 34, fontWeight: '900', textAlign: 'center', lineHeight: 40, letterSpacing: 0.5 },
  subtitleBrand: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
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
  legalLine: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 2,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
})
