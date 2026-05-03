import { Color } from 'expo-router'
import { Platform, useColorScheme as useRNColorScheme } from 'react-native'
import type { ColorValue } from 'react-native'

import type { AppearanceMode } from '@/lib/appearance-context'

/** Semantic foreground/separator tokens from expo-router `Color` (native settings-style UI). */
export type NativeSemanticPalette = {
  label: ColorValue
  secondaryLabel: ColorValue
  separator: ColorValue
  placeholderText: ColorValue
  rowIcon: ColorValue
}

/**
 * Maps iOS/Android system colors into RN styles. Subscribes to OS scheme changes via `useColorScheme`.
 *
 * When the user forces light/dark in Appearance settings (not "system"), returns `null` so callers
 * should fall back to `useCasinoTheme()` — avoids PlatformColor following only the OS while the app
 * chrome follows `resolvedMode`.
 */
export function useNativeSemanticColors(mode: AppearanceMode): NativeSemanticPalette | null {
  useRNColorScheme()

  if (mode !== 'system') {
    return null
  }

  if (Platform.OS === 'ios') {
    return {
      label: Color.ios.label,
      secondaryLabel: Color.ios.secondaryLabel,
      separator: Color.ios.separator,
      placeholderText: Color.ios.placeholderText,
      rowIcon: Color.ios.secondaryLabel,
    }
  }

  if (Platform.OS === 'android') {
    return {
      label: Color.android.dynamic.onSurface,
      secondaryLabel: Color.android.dynamic.onSurfaceVariant,
      separator: Color.android.dynamic.outlineVariant,
      placeholderText: Color.android.dynamic.onSurfaceVariant,
      rowIcon: Color.android.dynamic.onSurfaceVariant,
    }
  }

  return null
}
