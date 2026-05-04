import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { router } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { AppButton } from '@/components/ui/AppButton'
import { routes } from '@/lib/app-routes'
import { useGame } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'

export function FreeSpinsWallet() {
  const t = useCasinoTheme()
  const { freeSpins } = useGame()
  const active = freeSpins > 0

  // Pop the count badge whenever freeSpins increases.
  const countScale = useSharedValue(1)
  const prevSpinsRef = { current: freeSpins }
  useEffect(() => {
    if (freeSpins > prevSpinsRef.current) {
      countScale.value = withSpring(1.4, { damping: 4, stiffness: 280 }, () => {
        countScale.value = withSpring(1, { damping: 8, stiffness: 200 })
      })
    }
    prevSpinsRef.current = freeSpins
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeSpins, countScale])

  const countStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countScale.value }],
  }))

  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: active ? `${t.primary}88` : t.border,
          backgroundColor: t.card,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: active ? t.primary : `${t.muted}99` },
            ]}
          >
            <FontAwesome name="star" size={22} color={active ? t.primaryForeground : t.mutedForeground} />
          </View>
          <View>
            <Text style={[styles.title, { color: t.foreground }]}>Free Spins</Text>
            <Text style={[styles.sub, { color: t.mutedForeground }]}>
              {active ? 'Ready to use!' : 'Win from Scatters'}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Animated.Text style={[styles.big, { color: active ? t.primary : t.mutedForeground }, countStyle]}>
            {freeSpins}
          </Animated.Text>
          {active ? (
            <AppButton
              size="sm"
              label="Play"
              onPress={() => router.navigate(routes.tabsIndex)}
              style={styles.playBtn}
              accessibilityLabel="Use free spins on the slot machine"
            />
          ) : null}
        </View>
      </View>
      <View style={[styles.footer, { borderTopColor: t.border }]}>
        <Text style={[styles.hint, { color: t.mutedForeground }]}>
          Land 3+ Scatter symbols to win 10 Free Spins. Free spins use your current bet without deducting
          coins!
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  big: { fontSize: 28, fontWeight: '900' },
  playBtn: { minWidth: 72 },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hint: { fontSize: 11, lineHeight: 16 },
})
