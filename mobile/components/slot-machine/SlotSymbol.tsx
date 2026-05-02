import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { SlotSymbol as SlotSymbolType } from '@/lib/game-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'

interface Props {
  symbol: SlotSymbolType
  isWinning?: boolean
  isSpinning?: boolean
}

function SlotSymbolInner({ symbol, isWinning, isSpinning }: Props) {
  const t = useCasinoTheme()

  if (symbol.isWild) {
    return (
      <View style={[styles.badge, { backgroundColor: '#059669' }]}>
        <Text style={styles.badgeText}>W</Text>
      </View>
    )
  }
  if (symbol.isScatter) {
    return (
      <View style={[styles.scatter, { borderColor: t.primary }]}>
        <Text style={styles.scatterText}>S</Text>
      </View>
    )
  }

  return (
    <Text
      style={[
        styles.emoji,
        { color: t.foreground },
        isWinning && { color: t.win, fontWeight: '900' },
        isSpinning && { opacity: 0.85 },
      ]}
    >
      {symbol.emoji}
    </Text>
  )
}

export const SlotSymbolView = memo(SlotSymbolInner)

const styles = StyleSheet.create({
  emoji: {
    fontSize: 28,
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  scatter: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234,179,8,0.25)',
  },
  scatterText: { fontWeight: '900', fontSize: 14, color: '#ca8a04' },
})
