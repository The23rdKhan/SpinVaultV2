import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText } from '@/components/ui/AppText'
import { SkeletonBlock } from '@/components/ui/SkeletonBlock'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { space } from '@/theme/design-tokens'

export function BrandedLoadingScreen() {
  const t = useCasinoTheme()
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: t.groupedBackground, paddingTop: insets.top + space.xxl },
      ]}
    >
      <AppText variant="title2" accent style={styles.wordmark}>
        SpinVault
      </AppText>
      <AppText variant="footnote" secondary style={styles.caption}>
        Loading your session…
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
  wordmark: { textAlign: 'center', marginBottom: space.xs },
  caption: { textAlign: 'center', marginBottom: space.xxl },
  skel: { gap: space.md },
})
