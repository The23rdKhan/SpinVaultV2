import type { ReactNode } from 'react'
import { memo, useMemo } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { hexWithAlpha } from '@/theme/tokens'
import { useCasinoTheme } from '@/lib/use-casino-theme'

type Variant = 'primary' | 'outline' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg' | 'icon'

export interface AppButtonProps extends Omit<PressableProps, 'children'> {
  children?: ReactNode
  variant?: Variant
  size?: Size
  loading?: boolean
  label?: string
}

function AppButtonInner({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  label,
  style,
  accessibilityLabel,
  ...rest
}: AppButtonProps) {
  const t = useCasinoTheme()

  const palette = useMemo(() => {
    return {
      primary: { bg: t.primary, fg: t.primaryForeground, border: t.primary },
      outline: { bg: 'transparent', fg: t.foreground, border: t.border },
      ghost: { bg: hexWithAlpha(t.card, 'CC'), fg: t.foreground, border: t.border },
      destructive: { bg: t.destructive, fg: t.destructiveForeground, border: t.destructive },
    }[variant]
  }, [t, variant])

  const dims: Record<Size, { padH: number; padV: number; radius: number; font: number; icon: number }> = {
    sm: { padH: 12, padV: 8, radius: 999, font: 12, icon: 36 },
    md: { padH: 16, padV: 12, radius: 999, font: 14, icon: 44 },
    lg: { padH: 20, padV: 14, radius: 14, font: 16, icon: 52 },
    icon: { padH: 0, padV: 0, radius: 999, font: 14, icon: 44 },
  }

  const d = dims[size]
  const isIcon = size === 'icon'

  const buttonStyle: ViewStyle = {
    backgroundColor: palette.bg,
    borderWidth: variant === 'primary' || variant === 'destructive' ? 0 : 1,
    borderColor: palette.border,
    paddingHorizontal: isIcon ? 0 : d.padH,
    paddingVertical: isIcon ? 0 : d.padV,
    minWidth: isIcon ? d.icon : undefined,
    minHeight: isIcon ? d.icon : undefined,
    borderRadius: d.radius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    opacity: disabled || loading ? 0.5 : 1,
  }

  const textStyle: TextStyle = {
    color: palette.fg,
    fontSize: d.font,
    fontWeight: '700',
  }

  const content = label ?? children
  const isBusy = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof label === 'string' ? label : undefined)}
      accessibilityState={{ disabled: !!isBusy }}
      disabled={isBusy}
      style={({ pressed }) => [buttonStyle, pressed && !isBusy && styles.pressed, style as ViewStyle]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : null}
      {!loading && typeof content === 'string' ? (
        <Text style={textStyle}>{content}</Text>
      ) : !loading ? (
        content
      ) : null}
    </Pressable>
  )
}

export const AppButton = memo(AppButtonInner)

const styles = StyleSheet.create({
  pressed: { opacity: 0.88 },
})
