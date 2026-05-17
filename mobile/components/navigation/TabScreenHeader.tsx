import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HeaderActions } from '@/components/navigation/HeaderActions'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { SPINVAULT_LOGO_HORIZONTAL_PNG, SPINVAULT_LOGO_MARK_PNG, TAB_HEADER_LOGO_MARK } from '@/lib/brand-assets'
import { resolveTabHeaderBrandLayout, type TabHeaderBrandLayout } from '@/lib/tab-header-brand-layout'
import { hexWithAlpha } from '@/theme/tokens'
import { APP_NAME } from '@shared/brand'

/** Native `headerTitle` is ~32–36pt tall — wide PNG wordmarks get scaled down. Use this bar instead. */
export const TAB_SCREEN_HEADER_BAR_HEIGHT = 52

function TabHeaderBrand({ subtitle, layout }: { subtitle: string; layout: TabHeaderBrandLayout }) {
  const t = useCasinoTheme()

  if (layout.useCompact) {
    return (
      <View
        style={[styles.brandRow, { maxWidth: layout.compactRowMaxWidth }]}
        accessibilityRole="header"
      >
        <Image
          source={SPINVAULT_LOGO_MARK_PNG}
          style={styles.brandMark}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel={`${APP_NAME} logo`}
        />
        <View style={styles.brandText}>
          <Text style={[styles.brandName, { color: t.textPrimary }]} numberOfLines={1}>
            {APP_NAME}
          </Text>
          <Text
            style={[styles.brandSubtitle, { color: hexWithAlpha(t.textSecondary, 'CC') }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    )
  }

  const { width, height } = layout.horizontal
  return (
    <Image
      source={SPINVAULT_LOGO_HORIZONTAL_PNG}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      accessibilityRole="image"
      accessibilityLabel={`${APP_NAME}. ${subtitle}.`}
    />
  )
}

export function TabScreenHeader({ title }: { title: string }) {
  const t = useCasinoTheme()
  const insets = useSafeAreaInsets()
  const { width: windowWidth, fontScale } = useWindowDimensions()
  const layout = resolveTabHeaderBrandLayout(windowWidth, fontScale)

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: t.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.brandSlot}>
          <TabHeaderBrand subtitle={title} layout={layout} />
        </View>
        <HeaderActions />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TAB_SCREEN_HEADER_BAR_HEIGHT,
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 10,
  },
  brandSlot: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
    minHeight: TAB_HEADER_LOGO_MARK.height,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: TAB_HEADER_LOGO_MARK.width,
    height: TAB_HEADER_LOGO_MARK.height,
  },
  brandText: {
    flexShrink: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
    letterSpacing: 0.12,
  },
})
