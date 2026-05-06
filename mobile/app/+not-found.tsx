import { Link, Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'
import { routes } from '@/lib/app-routes'

export default function NotFoundScreen() {
  const t = useCasinoTheme()
  return (
    <>
      <Stack.Screen options={{ title: 'SpinVault', headerShown: false }} />
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <Text style={[styles.icon, { color: t.gold }]}>🔒</Text>
        <Text style={[styles.title, { color: t.textPrimary }]}>Lost in the vault?</Text>
        <Text style={[styles.sub, { color: t.textSecondary }]}>That screen doesn't exist.</Text>
        <Link href={routes.tabsIndex}>
          <View style={[styles.btn, { backgroundColor: t.primary }]}>
            <Text style={[styles.btnTxt, { color: t.primaryForeground }]}>Back to Play</Text>
          </View>
        </Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  icon: { fontSize: 48, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  sub: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  btn: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: { fontSize: 16, fontWeight: '900' },
})
