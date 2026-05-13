import { forwardRef } from 'react'
import { Platform, ScrollView, type ScrollViewProps } from 'react-native'

/**
 * App-wide scroll defaults: no scroll indicators, no rubber-band bounce, and no
 * Android overscroll glow — reads like native screens rather than web pages.
 * `{...props}` is applied before the fixed props below so these chrome settings
 * always win (re-enable indicators by using raw `ScrollView` or extending this).
 */
export const AppScrollView = forwardRef<ScrollView, ScrollViewProps>(function AppScrollView(
  props,
  ref,
) {
  return (
    <ScrollView
      ref={ref}
      {...props}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      alwaysBounceVertical={false}
      alwaysBounceHorizontal={false}
      bounces={false}
      {...(Platform.OS === 'android' ? { overScrollMode: 'never' as const } : {})}
    />
  )
})

AppScrollView.displayName = 'AppScrollView'
