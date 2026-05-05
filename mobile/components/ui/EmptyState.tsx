import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { space } from '@/theme/design-tokens'
import { AppText } from '@/components/ui/AppText'

type EmptyStateProps = {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  const t = useCasinoTheme()
  return (
    <View
      style={[styles.wrap, { borderColor: t.glassStroke, backgroundColor: t.fillSecondary }]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <AppText variant="headline" style={styles.title}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="subheadline" secondary style={styles.desc}>
          {description}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.xl,
    alignItems: 'center',
    gap: space.sm,
  },
  icon: { marginBottom: space.xs },
  title: { textAlign: 'center' },
  desc: { textAlign: 'center' },
  action: { marginTop: space.md, alignSelf: 'stretch' },
})
