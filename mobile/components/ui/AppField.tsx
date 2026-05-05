import { Platform, StyleSheet, TextInput, type TextInputProps } from 'react-native'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { radius } from '@/theme/design-tokens'

type AppFieldProps = TextInputProps & {
  /** Larger tap area & heading alignment for accessibility forms. */
  dense?: boolean
}

export function AppField({ style, dense, ...rest }: AppFieldProps) {
  const t = useCasinoTheme()
  return (
    <TextInput
      placeholderTextColor={t.mutedForeground}
      selectionColor={t.primary}
      cursorColor={t.primary}
      style={[
        styles.base,
        {
          color: t.foreground,
          backgroundColor: t.fillSecondary,
          borderColor: t.glassStroke,
          minHeight: dense ? 44 : 50,
        },
        style,
      ]}
      {...rest}
    />
  )
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 17,
  },
})
