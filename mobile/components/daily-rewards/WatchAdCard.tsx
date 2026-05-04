import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Toast from 'react-native-toast-message'
import { track } from '@/lib/analytics/track'
import { useAuth } from '@/lib/auth-context'
import { useGame } from '@/lib/game-context'
import { useHaptics } from '@/lib/use-haptics'
import { AnalyticsEvents } from '@shared/analytics/event-names'
import { useCasinoTheme } from '@/lib/use-casino-theme'

type AdState = 'ready' | 'watching' | 'complete'

export function WatchAdCard() {
  const t = useCasinoTheme()
  const { canWatchAd, adsWatchedToday, maxDailyAds, watchAd } = useAuth()
  const { addCoins } = useGame()
  const { wheelSpin, claimTap } = useHaptics()
  const [open, setOpen] = useState(false)
  const [adState, setAdState] = useState<AdState>('ready')
  const [progress, setProgress] = useState(0)
  const [reward, setReward] = useState(0)

  const adsRemaining = maxDailyAds - adsWatchedToday

  useEffect(() => {
    if (adState !== 'watching') return
    const duration = 2000
    const interval = 50
    const steps = duration / interval
    let step = 0
    let cancelled = false
    const timer = setInterval(() => {
      step++
      setProgress((step / steps) * 100)
      if (step >= steps) {
        clearInterval(timer)
        ;(async () => {
          const earned = await watchAd()
          if (cancelled) return
          setReward(earned)
          addCoins(earned, {
            reason: 'rewarded_ad',
            label: 'Rewarded ad',
          })
          track(AnalyticsEvents.REWARDED_AD_COMPLETED, { reward_coins: earned })
          setAdState('complete')
        })()
      }
    }, interval)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [adState, watchAd, addCoins])

  const resetAndClose = () => {
    setOpen(false)
    setAdState('ready')
    setProgress(0)
    setReward(0)
  }

  const openModal = () => {
    if (!canWatchAd()) return
    setAdState('ready')
    setProgress(0)
    setReward(0)
    setOpen(true)
  }

  const startWatch = () => {
    if (!canWatchAd()) return
    wheelSpin()
    track(AnalyticsEvents.REWARDED_AD_STARTED)
    setAdState('watching')
    setProgress(0)
  }

  const onClaimDone = () => {
    claimTap()
    Toast.show({ type: 'success', text1: `+${reward} coins` })
    resetAndClose()
  }

  return (
    <>
      <LinearGradient
        colors={[`${t.primary}33`, t.card, `${t.primary}22`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: `${t.primary}55` }]}
      >
        <View style={styles.row}>
          <View style={[styles.playIcon, { backgroundColor: `${t.primary}33` }]}>
            <FontAwesome name="play" size={26} color={t.primary} />
          </View>
          <View style={styles.mid}>
            <Text style={[styles.h3, { color: t.foreground }]}>Watch & Earn</Text>
            <Text style={[styles.sub, { color: t.mutedForeground }]}>
              {canWatchAd()
                ? `${adsRemaining} of ${maxDailyAds} watches left today`
                : 'Come back tomorrow for more'}
            </Text>
          </View>
          <Pressable
            onPress={openModal}
            disabled={!canWatchAd()}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: canWatchAd() ? t.primary : t.muted,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.ctaSmall, { color: t.primaryForeground }]}>FREE</Text>
            <View style={styles.ctaCoins}>
              <FontAwesome name="bitcoin" size={14} color={t.primaryForeground} />
              <Text style={[styles.ctaAmt, { color: t.primaryForeground }]}>100+</Text>
            </View>
          </Pressable>
        </View>
        <View style={styles.dots}>
          {Array.from({ length: maxDailyAds }).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                { backgroundColor: idx < adsWatchedToday ? t.primary : t.muted },
              ]}
            />
          ))}
        </View>
      </LinearGradient>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => adState !== 'watching' && resetAndClose()}
      >
        <View style={styles.modalRoot}>
          <BlurView
            intensity={45}
            tint="dark"
            blurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => adState !== 'watching' && resetAndClose()}
          />
          <View style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
            <LinearGradient
              colors={[t.primary, `${t.primary}99`, t.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sheetHero}
            >
              <Pressable
                onPress={() => adState !== 'watching' && resetAndClose()}
                disabled={adState === 'watching'}
                style={[styles.sheetClose, { opacity: adState === 'watching' ? 0.4 : 1 }]}
              >
                <FontAwesome name="times" size={18} color="#fff" />
              </Pressable>
              <View style={styles.heroIcon}>
                {adState === 'complete' ? (
                  <FontAwesome name="check" size={28} color="#fff" />
                ) : adState === 'watching' ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <FontAwesome name="gift" size={28} color="#fff" />
                )}
              </View>
              <Text style={styles.heroTitle}>
                {adState === 'complete'
                  ? 'Reward earned!'
                  : adState === 'watching'
                    ? 'Watching ad…'
                    : 'Rewarded video'}
              </Text>
              <Text style={styles.heroSub}>
                {adState === 'complete'
                  ? `You earned ${reward.toLocaleString()} coins`
                  : 'Simulated sponsor message — thanks for your support!'}
              </Text>
            </LinearGradient>

            <View style={styles.sheetBody}>
              {adState === 'watching' ? (
                <View style={[styles.track, { backgroundColor: t.muted }]}>
                  <View style={[styles.fill, { width: `${progress}%`, backgroundColor: t.primary }]} />
                </View>
              ) : null}

              {adState === 'ready' ? (
                <Pressable
                  onPress={startWatch}
                  style={[styles.primaryBtn, { backgroundColor: t.primary }]}
                >
                  <FontAwesome name="play" size={16} color={t.primaryForeground} />
                  <Text style={[styles.primaryBtnTxt, { color: t.primaryForeground }]}>
                    Watch ad
                  </Text>
                </Pressable>
              ) : null}

              {adState === 'complete' ? (
                <Pressable
                  onPress={onClaimDone}
                  style={[styles.primaryBtn, { backgroundColor: t.primary }]}
                >
                  <Text style={[styles.primaryBtnTxt, { color: t.primaryForeground }]}>
                    Claim & close
                  </Text>
                </Pressable>
              ) : null}

              {adState === 'watching' ? (
                <Text style={[styles.hint, { color: t.mutedForeground }]}>
                  Please wait — reward unlocks when the bar finishes.
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  playIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1, minWidth: 0 },
  h3: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 4 },
  cta: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  ctaSmall: { fontSize: 11, fontWeight: '800' },
  ctaCoins: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaAmt: { fontWeight: '800' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetHero: {
    paddingTop: 36,
    paddingBottom: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  sheetClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroSub: {
    color: '#ffffffdd',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  sheetBody: { padding: 18, gap: 14 },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnTxt: { fontSize: 16, fontWeight: '900' },
  hint: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
})
