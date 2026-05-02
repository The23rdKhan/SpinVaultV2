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
        <FontAwesome name="bolt" size={16} color={t.primaryForeground} />
      </View>
      <View>
        <Text style={[styles.brandKicker, { color: t.mutedForeground }]}>SPINVAULT</Text>
        <Text style={[styles.brandTitle, { color: t.foreground }]}>{title}</Text>
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
        headerStyle: { backgroundColor: t.background },
        headerTintColor: t.foreground,
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
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  brandTitle: { fontSize: 16, fontWeight: '900', marginTop: -1 },
})
