import { Stack } from 'expo-router'
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { HeaderActions } from '@/components/navigation/HeaderActions'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'
import { APP_NAME } from '@shared/brand'

function HeaderLogoMark({ source, accessibilityLabel }: { source: ImageSourcePropType; accessibilityLabel: string }) {
  return (
    <Image
      source={source}
      style={styles.headerLogo}
      resizeMode="contain"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    />
  )
}

function HeaderBrandMark({ title }: { title: string }) {
  const t = useCasinoTheme()
  return (
    <View style={styles.brandRow}>
      <View style={[styles.brandIcon, { backgroundColor: t.primary }]}>
        <FontAwesome name="archive" size={15} color={t.primaryForeground} accessibilityLabel="" />
      </View>
      <View style={styles.brandText}>
        <Text style={[styles.brandName, { color: t.textPrimary }]}>{APP_NAME}</Text>
        <Text style={[styles.brandSubtitle, { color: hexWithAlpha(t.textSecondary, '88') }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  )
}

/** Nested stack inside each native tab so headers and `headerRight` work (native tabs have no JS tab header). */
export function TabScreenStack({
  title,
  headerLogo,
}: {
  title: string
  /** When set, replaces the default archive + wordmark with this raster (e.g. Play tab). */
  headerLogo?: ImageSourcePropType
}) {
  const t = useCasinoTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: t.background,
        },
        headerTintColor: t.textPrimary,
        headerShadowVisible: false,
        headerRight: () => <HeaderActions />,
        contentStyle: { backgroundColor: t.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitleAlign: headerLogo ? 'center' : undefined,
          headerTitle: () =>
            headerLogo ? (
              <HeaderLogoMark
                source={headerLogo}
                accessibilityLabel={`${APP_NAME}. ${title}.`}
              />
            ) : (
              <HeaderBrandMark title={title} />
            ),
        }}
      />
    </Stack>
  )
}

const styles = StyleSheet.create({
  headerLogo: { height: 36, width: 220, marginVertical: 2 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { justifyContent: 'center', maxWidth: 200 },
  brandName: { fontSize: 19, fontWeight: '900', letterSpacing: 0.2 },
  brandSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 1, letterSpacing: 0.15 },
})
