import { Link, Stack } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { useCasinoTheme } from '@/lib/use-casino-theme'

export default function NotFoundScreen() {
  const t = useCasinoTheme()
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <Text style={[styles.title, { color: t.textPrimary }]}>{"This screen doesn't exist."}</Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: t.primary }]}>Go home</Text>
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
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
