import type { ReactNode } from 'react'
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { useAppearance } from '@/lib/appearance-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { radius, space } from '@/theme/design-tokens'

type GlassModalCardProps = {
  children: ReactNode
  style?: ViewStyle
}

/** Modal content panel: blur on iOS, elevated surface on Android. */
export function GlassModalCard({ children, style }: GlassModalCardProps) {
  const t = useCasinoTheme()
  const { resolvedMode } = useAppearance()
  const tint: 'dark' | 'light' = resolvedMode === 'dark' ? 'dark' : 'light'

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={64}
        tint={tint}
        style={[
          styles.base,
          {
            borderColor: t.glassStroke,
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
          backgroundColor: t.card,
          borderColor: t.glassStroke,
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
    padding: space.xl,
    gap: space.md,
    maxWidth: 380,
    width: '100%',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
  },
})
