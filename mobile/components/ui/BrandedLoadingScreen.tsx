import { Image, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText } from '@/components/ui/AppText'
import { SkeletonBlock } from '@/components/ui/SkeletonBlock'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { SPINVAULT_LOGO_HORIZONTAL_PNG } from '@/lib/brand-assets'
import { space } from '@/theme/design-tokens'

const LOADING_MESSAGES = [
  'Counting your Vault Coins…',
  'Checking your daily streak…',
  'Preparing the reels…',
  'Unlocking rewards…',
  'Restoring your vault…',
]

export function BrandedLoadingScreen() {
  const t = useCasinoTheme()
  const insets = useSafeAreaInsets()
  const message = LOADING_MESSAGES[new Date().getSeconds() % LOADING_MESSAGES.length]
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: t.groupedBackground, paddingTop: insets.top + space.xxl },
      ]}
    >
      <Image
        source={SPINVAULT_LOGO_HORIZONTAL_PNG}
        resizeMode="contain"
        style={styles.logo}
        accessibilityLabel="Spin Vault logo"
        accessibilityRole="image"
      />
      <AppText variant="title2" accent style={styles.wordmark}>
        Opening Your Vault
      </AppText>
      <AppText variant="footnote" secondary style={styles.caption}>
        Restoring your session and loading your rewards…
      </AppText>
      <AppText variant="caption1" secondary style={styles.caption}>
        {message}
      </AppText>
      <View style={styles.skel}>
        <SkeletonBlock height={120} radiusKey="lg" />
        <SkeletonBlock height={56} />
        <SkeletonBlock height={56} />
        <SkeletonBlock height={40} width="60%" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.xxl },
  logo: { width: '100%', height: 58, marginBottom: space.md },
  wordmark: { textAlign: 'center', marginBottom: space.xs },
  caption: { textAlign: 'center', marginBottom: space.md },
  skel: { gap: space.md },
})
