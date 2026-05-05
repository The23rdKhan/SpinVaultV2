import { Text, type TextProps } from 'react-native'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { typography } from '@/theme/design-tokens'

type Variant = keyof typeof typography

type AppTextProps = TextProps & {
  variant?: Variant
  /** When set, uses primary accent (e.g. large titles on marketing screens). */
  accent?: boolean
  secondary?: boolean
}

export function AppText({
  variant = 'body',
  accent,
  secondary,
  style,
  children,
  ...rest
}: AppTextProps) {
  const t = useCasinoTheme()
  const base = typography[variant]
  const color = accent
    ? t.primary
    : secondary
      ? t.mutedForeground
      : t.foreground
  return (
    <Text
      style={[base, { color }, style]}
      allowFontScaling
      maxFontSizeMultiplier={1.35}
      {...rest}
    >
      {children}
    </Text>
  )
}
