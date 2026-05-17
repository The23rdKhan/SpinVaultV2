import { useEffect, useMemo, useState } from 'react'
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { AppleSignInButton } from '@/components/apple-sign-in-button'
import { FeatureCard, OnboardingHeroImage, VaultCoinIcon } from '@/components/brand/asset-components'
import { LegalDocumentModal } from '@/components/modals/LegalDocumentModal'
import { GoogleSignInButton } from '@/components/social-auth-buttons/google/google-sign-in-button'
import { AppButton } from '@/components/ui/AppButton'
import { AppScrollView } from '@/components/ui/AppScrollView'
import { track } from '@/lib/analytics/track'
import { useAppearance } from '@/lib/appearance-context'
import { routes } from '@/lib/app-routes'
import { useAuth } from '@/lib/auth-context'
import { SpinVaultImages } from '@/src/constants/assets'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'
import { AnalyticsEvents } from '@shared/analytics/event-names'
import type { LegalDocType } from '@shared/legal-documents'

type Step = 'welcome' | 'how' | 'starter' | 'legal' | 'save'

const STEPS: Step[] = ['welcome', 'how', 'starter', 'legal', 'save']

export function OnboardingScreen() {
  const t = useCasinoTheme()
  const { resolvedMode } = useAppearance()
  const { signInAsGuest, completeOnboarding } = useAuth()
  const [step, setStep] = useState<Step>('welcome')
  const [ageOk, setAgeOk] = useState(false)
  const [guestBusy, setGuestBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [legalModal, setLegalModal] = useState<LegalDocType | null>(null)

  useEffect(() => {
    track(AnalyticsEvents.ONBOARDING_STARTED)
  }, [])

  const stepIndex = STEPS.indexOf(step)
  const progressLabel = useMemo(() => `${stepIndex + 1} of ${STEPS.length}`, [stepIndex])

  const goNext = () => {
    const next = STEPS[stepIndex + 1]
    if (next) setStep(next)
  }

  const goCreateAccount = () => {
    completeOnboarding()
    track(AnalyticsEvents.ONBOARDING_COMPLETED, { path: 'create_account' })
    router.push(routes.register)
  }

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

  const handleSocialSuccess = (path: 'apple' | 'google') => {
    completeOnboarding()
    track(AnalyticsEvents.ONBOARDING_COMPLETED, { path })
  }

  const backgroundSource = resolvedMode === 'dark' ? SpinVaultImages.backgrounds.dark : SpinVaultImages.backgrounds.light

  return (
    <ImageBackground source={backgroundSource} resizeMode="cover" style={styles.background}>
      <View style={[styles.scrim, { backgroundColor: resolvedMode === 'dark' ? '#020409A8' : '#FFF8EACC' }]}>
        <View
          style={[
            styles.shell,
            {
              backgroundColor: hexWithAlpha(t.card, resolvedMode === 'dark' ? 'E6' : 'F2'),
              borderColor: hexWithAlpha(t.border, resolvedMode === 'dark' ? 'AA' : 'DD'),
            },
          ]}
        >
          <AppScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.progressRow} accessibilityLabel={`Onboarding step ${progressLabel}`}>
          {STEPS.map((s) => (
            <View
              key={s}
              style={[
                styles.dot,
                {
                  backgroundColor: STEPS.indexOf(s) <= stepIndex ? t.gold : hexWithAlpha(t.textMuted, '55'),
                },
              ]}
            />
          ))}
        </View>

        {step === 'welcome' ? (
          <View style={styles.block}>
            <OnboardingHeroImage
              source={SpinVaultImages.onboarding.welcomeHero}
              accessibilityLabel="Spin Vault welcome artwork"
            />
            <Text style={[styles.title, { color: t.textPrimary }]}>Welcome to Spin Vault</Text>
            <Text style={[styles.sub, { color: t.textSecondary }]}>
              Spin. Win. Unlock. Enter the vault, collect Vault Coins, and build your lucky streak.
            </Text>
            <Text style={[styles.disclaimer, { color: t.textMuted }]}>Vault Coins only. No cash value.</Text>
            <AppButton label="Start Spinning" onPress={goNext} style={styles.btn} />
          </View>
        ) : null}

        {step === 'how' ? (
          <View style={styles.block}>
            <Image source={SpinVaultImages.icons.logoHorizontal} resizeMode="contain" style={styles.logo} />
            <Text style={[styles.title, { color: t.textPrimary }]}>How Spin Vault Works</Text>
            <Text style={[styles.sub, { color: t.textSecondary }]}>
              Spin the reels, collect Vault Coins, complete missions, and unlock vault rewards.
            </Text>
            <FeatureCard title="Spin" body="Use Vault Coins to play the reels." image={SpinVaultImages.icons.slotReel} />
            <FeatureCard
              title="Collect"
              body="Earn daily rewards, streak bonuses, and mission prizes."
              image={SpinVaultImages.icons.vaultCoin}
            />
            <FeatureCard
              title="Unlock"
              body="Open new themes, rewards, and vault surprises."
              image={SpinVaultImages.icons.rewardChest}
            />
            <AppButton label="Continue" onPress={goNext} style={styles.btn} />
            <AppButton variant="ghost" label="Back" onPress={() => setStep('welcome')} />
          </View>
        ) : null}

        {step === 'starter' ? (
          <View style={styles.block}>
            <OnboardingHeroImage
              source={SpinVaultImages.onboarding.starterCoinsHero}
              accessibilityLabel="Starter Vault Coins artwork"
            />
            <Text style={[styles.title, { color: t.textPrimary }]}>Your Vault Starts With 5,000 Vault Coins</Text>
            <Text style={[styles.sub, { color: t.textSecondary }]}>
              Every new player gets Vault Coins to start spinning right away.
            </Text>
            <View style={[styles.rewardPill, { backgroundColor: hexWithAlpha(t.gold, '22'), borderColor: t.gold }]}>
              <VaultCoinIcon size={28} />
              <Text style={[styles.rewardText, { color: t.gold }]}>+5,000 VC</Text>
            </View>
            <Text style={[styles.disclaimer, { color: t.textMuted }]}>
              Vault Coins are for entertainment only and have no cash value.
            </Text>
            <AppButton label="Claim Starter Coins" onPress={goNext} style={styles.btn} />
            <AppButton variant="ghost" label="Back" onPress={() => setStep('how')} />
          </View>
        ) : null}

        {step === 'legal' ? (
          <View style={styles.block}>
            <OnboardingHeroImage
              source={SpinVaultImages.icons.age18Badge}
              compact
              accessibilityLabel="Adults only 18 plus badge"
            />
            <Text style={[styles.title, { color: t.textPrimary }]}>Adults Only — 18+</Text>
            <Text style={[styles.sub, { color: t.textSecondary }]}>
              Spin Vault is for adults only. Vault Coins and rewards are for entertainment only. Spin Vault does not
              offer real-money gambling, cash prizes, or withdrawable rewards.
            </Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ageOk }}
              onPress={() => setAgeOk((v) => !v)}
              style={[styles.checkRow, { borderColor: ageOk ? t.gold : t.border, backgroundColor: t.surfaceElevated }]}
            >
              <View style={[styles.checkBox, { borderColor: t.gold, backgroundColor: ageOk ? t.gold : 'transparent' }]}>
                <Text style={styles.checkMark}>{ageOk ? '✓' : ''}</Text>
              </View>
              <Text style={[styles.checkText, { color: t.textPrimary }]}>I am 18 or older</Text>
            </Pressable>
            <Text style={[styles.legalLine, { color: t.textMuted }]}>
              <Text style={[styles.legalLink, { color: t.accent }]} onPress={() => setLegalModal('terms')}>
                Terms of Service
              </Text>
              {' · '}
              <Text style={[styles.legalLink, { color: t.accent }]} onPress={() => setLegalModal('privacy')}>
                Privacy Policy
              </Text>
            </Text>
            <AppButton label="Continue" disabled={!ageOk} onPress={goNext} style={styles.btn} />
            <AppButton variant="ghost" label="Back" onPress={() => setStep('starter')} />
          </View>
        ) : null}

        {step === 'save' ? (
          <View style={styles.block}>
            <OnboardingHeroImage
              source={SpinVaultImages.onboarding.saveVaultHero}
              accessibilityLabel="Save your vault artwork"
            />
            <Image source={SpinVaultImages.icons.saveVaultShield} resizeMode="contain" style={styles.saveIcon} />
            <Text style={[styles.title, { color: t.textPrimary }]}>Save Your Vault</Text>
            <Text style={[styles.sub, { color: t.textSecondary }]}>
              Create an account to save your Vault Coins, rewards, daily streaks, and unlocked themes.
            </Text>
            {formError ? (
              <Text style={[styles.error, { color: t.destructive }]} accessibilityLiveRegion="polite">
                {formError}
              </Text>
            ) : null}
            <AppButton label="Create Account" onPress={goCreateAccount} style={styles.btn} />
            <AppleSignInButton navigateToTabs={false} onSuccess={() => handleSocialSuccess('apple')} />
            <GoogleSignInButton navigateToTabs={false} onSuccess={() => handleSocialSuccess('google')} />
            <AppButton
              variant="outline"
              label="Continue as Guest"
              loading={guestBusy}
              disabled={guestBusy}
              onPress={() => void onGuest()}
              style={styles.btn}
            />
            <Text style={[styles.guestNote, { color: t.textMuted }]}>Guest progress may be limited to this device.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                completeOnboarding()
                track(AnalyticsEvents.ONBOARDING_COMPLETED, { path: 'sign_in_existing_account' })
                router.push(routes.login)
              }}
            >
              <Text style={[styles.footerLink, { color: t.accent }]}>Already have an account? Sign in</Text>
            </Pressable>
            <AppButton variant="ghost" label="Back" onPress={() => setStep('legal')} />
          </View>
        ) : null}
          </AppScrollView>
        </View>
      </View>

      <LegalDocumentModal
        visible={legalModal !== null}
        type={legalModal ?? 'terms'}
        onClose={() => setLegalModal(null)}
      />
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  scrim: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  shell: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  scroll: {
    padding: 22,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 28,
    height: 5,
    borderRadius: 999,
  },
  block: {
    gap: 14,
  },
  logo: {
    width: '100%',
    height: 54,
    alignSelf: 'center',
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 32,
    textAlign: 'center',
  },
  sub: {
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
  btn: {
    alignSelf: 'stretch',
    minHeight: 48,
  },
  rewardPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
  },
  rewardText: {
    fontSize: 24,
    fontWeight: '900',
  },
  checkRow: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#1A1200',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
  },
  checkText: {
    fontSize: 16,
    fontWeight: '800',
  },
  legalLine: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  legalLink: {
    fontWeight: '800',
  },
  saveIcon: {
    width: 68,
    height: 68,
    alignSelf: 'center',
    marginTop: -18,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  guestNote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 4,
  },
})
