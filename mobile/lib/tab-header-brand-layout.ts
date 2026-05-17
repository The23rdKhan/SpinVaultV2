import {
  SPINVAULT_LOGO_HORIZONTAL_ASPECT,
  TAB_HEADER_A11Y_FONT_SCALE_THRESHOLD,
  TAB_HEADER_COMPACT_MAX_WIDTH,
  TAB_HEADER_LARGE_MIN_WIDTH,
  TAB_HEADER_LOGO_HORIZONTAL,
  TAB_HEADER_LOGO_HORIZONTAL_LARGE,
  TAB_HEADER_RIGHT_RESERVED_WIDTH,
} from '@/lib/brand-assets'

export type TabHeaderBrandLayout = {
  useCompact: boolean
  horizontal: { width: number; height: number }
  compactRowMaxWidth: number
}

/**
 * Width-driven header branding — covers 2024–2026 iPhones without device-specific checks.
 * Uses logical points from `useWindowDimensions()` (updates on rotation / Stage Manager).
 */
export function resolveTabHeaderBrandLayout(
  windowWidth: number,
  fontScale = 1,
): TabHeaderBrandLayout {
  const useCompact = windowWidth < TAB_HEADER_COMPACT_MAX_WIDTH
  const a11yExtra = fontScale >= TAB_HEADER_A11Y_FONT_SCALE_THRESHOLD ? 28 : 0
  const reservedRight = TAB_HEADER_RIGHT_RESERVED_WIDTH + a11yExtra
  const cap =
    windowWidth >= TAB_HEADER_LARGE_MIN_WIDTH
      ? TAB_HEADER_LOGO_HORIZONTAL_LARGE
      : TAB_HEADER_LOGO_HORIZONTAL
  const maxByScreen = windowWidth - reservedRight - 16
  const width = Math.min(cap.width, Math.max(120, Math.round(maxByScreen * 0.92)))
  const height = Math.min(cap.height, Math.max(28, Math.round(width * SPINVAULT_LOGO_HORIZONTAL_ASPECT)))

  return {
    useCompact,
    horizontal: { width, height },
    compactRowMaxWidth: Math.min(204, Math.round(windowWidth * 0.52)),
  }
}
