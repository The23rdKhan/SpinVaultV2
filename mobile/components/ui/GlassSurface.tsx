import type { ReactNode } from 'react'
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { useAppearance } from '@/lib/appearance-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { radius, space } from '@/theme/design-tokens'
import { hexWithAlpha } from '@/theme/tokens'

type GlassSurfaceProps = {
  children: ReactNode
  style?: ViewStyle
  /** Extra padding inside the surface. */
  padding?: keyof typeof space | number
}

/**
 * Frosted layer on iOS; muted fill on Android (performant fallback).
 */
export function GlassSurface({ children, style, padding = 'lg' }: GlassSurfaceProps) {
  const t = useCasinoTheme()
  const { resolvedMode } = useAppearance()
  const pad = typeof padding === 'number' ? padding : space[padding]
  const tint: 'dark' | 'light' = resolvedMode === 'dark' ? 'dark' : 'light'
  const borderColor = t.glassStroke
  const androidFill =
    resolvedMode === 'dark'
      ? hexWithAlpha(t.card, 'EE')
      : hexWithAlpha(t.card, 'F2')

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={55}
        tint={tint}
        style={[
          styles.base,
          {
            borderColor,
            padding: pad,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        {children}
      </BlurView>
    )
  }

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: androidFill,
          borderColor,
          padding: pad,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
