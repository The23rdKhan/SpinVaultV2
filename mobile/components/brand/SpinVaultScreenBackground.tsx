import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAppearance } from '@/lib/appearance-context'
import { hexWithAlpha } from '@/theme/tokens'

/** Tab screen base gradient — dark vault navy (matches reel symbol palette). */
const DARK_GRADIENT = ['#07111E', '#071311', '#03070D'] as const

/** Tab screen base gradient — warm cream parchment. */
const LIGHT_GRADIENT = ['#FFF8EA', '#F7EED8', '#EFE1C4'] as const

const DARK_GLOW = {
  gold: '#FFD76A',
  teal: '#20D6C7',
  purple: '#A855F7',
  goldAlpha: '14',
  tealAlpha: '10',
  purpleAlpha: '0D',
} as const

const LIGHT_GLOW = {
  gold: '#C9972B',
  teal: '#20D6C7',
  purple: '#A855F7',
  goldAlpha: '0D',
  tealAlpha: '0A',
  purpleAlpha: '08',
} as const

type Props = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * Shared premium vault backdrop for main tabs (Play, Rewards, Shop, Profile).
 * Gradient + subtle accent washes only — no full-screen PNG.
 */
export function SpinVaultScreenBackground({ children, style }: Props) {
  const { resolvedMode } = useAppearance()
  const isDark = resolvedMode === 'dark'
  const base = isDark ? DARK_GRADIENT : LIGHT_GRADIENT
  const glow = isDark ? DARK_GLOW : LIGHT_GLOW

  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[...base]}
        locations={[0, 0.52, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[hexWithAlpha(glow.gold, glow.goldAlpha), 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.55 }}
          style={styles.glowTop}
        />
        <LinearGradient
          colors={[hexWithAlpha(glow.teal, glow.tealAlpha), 'transparent']}
          start={{ x: 0, y: 0.15 }}
          end={{ x: 0.85, y: 0.75 }}
          style={styles.glowLeft}
        />
        <LinearGradient
          colors={['transparent', hexWithAlpha(glow.purple, glow.purpleAlpha)]}
          start={{ x: 0.2, y: 0.35 }}
          end={{ x: 1, y: 1 }}
          style={styles.glowRight}
        />
      </View>

      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  glowTop: {
    ...StyleSheet.absoluteFillObject,
  },
  glowLeft: {
    ...StyleSheet.absoluteFillObject,
  },
  glowRight: {
    ...StyleSheet.absoluteFillObject,
  },
})
