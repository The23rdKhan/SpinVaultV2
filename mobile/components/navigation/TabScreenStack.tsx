import { Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { HeaderActions } from '@/components/navigation/HeaderActions'
import { useCasinoTheme } from '@/lib/use-casino-theme'

function HeaderBrandMark({ title }: { title: string }) {
  const t = useCasinoTheme()
  return (
    <View style={styles.brandRow}>
      <View style={[styles.brandIcon, { backgroundColor: t.primary }]}>
        <FontAwesome name="archive" size={15} color={t.primaryForeground} accessibilityLabel="" />
      </View>
      <View style={styles.brandText}>
        <Text style={[styles.brandName, { color: t.textPrimary }]}>SpinVault</Text>
        <Text style={[styles.brandSubtitle, { color: t.textSecondary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  )
}

/** Nested stack inside each native tab so headers and `headerRight` work (native tabs have no JS tab header). */
export function TabScreenStack({ title }: { title: string }) {
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
          headerTitle: () => <HeaderBrandMark title={title} />,
        }}
      />
    </Stack>
  )
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { justifyContent: 'center', maxWidth: 200 },
  brandName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  brandSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 1 },
})
