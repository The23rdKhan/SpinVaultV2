import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import type { SpinAuditEntry } from '@/lib/game-context'
import { hexWithAlpha } from '@/theme/tokens'
import {
  formatSpinHistorySymbolsA11y,
  resolveSpinHistorySymbol,
} from '@/lib/spin-history-symbols'
import { SpinHistorySymbolCell } from './SpinHistorySymbolCell'

interface Props {
  entry: SpinAuditEntry
  isLast: boolean
  accent: string
  badge: string
  isWin: boolean
  timeAgo: string
  resultTxt: string
  xpCellText: string
  showPaidXp: boolean
  borderColor: string
  freeSpinColor: string
  textMuted: string
  textSecondary: string
  primaryColor: string
  reduceMotion: boolean
  isFreshEntry: boolean
}

function formatSpinHistoryXpA11y(showPaidXp: boolean, showFreeNoXp: boolean, xpGained: number): string {
  if (showPaidXp) return `+${xpGained} XP`
  if (showFreeNoXp) return '0 XP, free spin'
  return ''
}

function fmtCoins(n: number): string {
  if (n >= 1_000_000_000) return `${Math.round(n / 1_000_000_000)}B VC`
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M VC`
  if (n >= 10_000) return `${Math.round(n / 1_000)}K VC`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K VC`
  return `${n} VC`
}

export function SpinHistoryEntryRow({
  entry,
  isLast,
  accent,
  badge,
  isWin,
  timeAgo,
  resultTxt,
  xpCellText,
  showPaidXp,
  borderColor,
  freeSpinColor,
  textMuted,
  textSecondary,
  primaryColor,
  reduceMotion,
  isFreshEntry,
}: Props) {
  const winCols = new Set(entry.winningColsMiddle ?? [])
  const xpRaw = entry.xpGained
  const xpGained = xpRaw ?? 0
  const showFreeNoXp = entry.freeSpin && xpRaw !== undefined && xpRaw <= 0

  const rowGlow = useSharedValue(isWin && isFreshEntry && !reduceMotion ? 0 : 1)
  const resultScale = useSharedValue(1)

  useEffect(() => {
    if (!isFreshEntry || !isWin || reduceMotion) return
    rowGlow.value = 0
    rowGlow.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) })
    resultScale.value = withSequence(
      withTiming(1.06, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
    )
  }, [isFreshEntry, isWin, reduceMotion, rowGlow, resultScale])

  const rowAnimStyle = useAnimatedStyle(() => ({
    opacity: rowGlow.value,
  }))

  const resultAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
  }))

  return (
    <Animated.View
      style={[
        styles.entryBlock,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: borderColor,
          marginBottom: 12,
        },
        isWin && { backgroundColor: hexWithAlpha(accent, '07') },
        rowAnimStyle,
      ]}
      accessibilityRole="text"
      accessibilityLabel={[
        isWin ? `Won ${entry.win} Vault Coins` : `Used ${entry.bet} Vault Coins`,
        entry.freeSpin ? 'free spin' : `bet ${entry.bet}`,
        formatSpinHistoryXpA11y(showPaidXp, showFreeNoXp, xpGained),
        badge || '',
        entry.paylinesHint ?? '',
        entry.reelMiddle ? formatSpinHistorySymbolsA11y(entry.reelMiddle) : '',
        timeAgo,
      ]
        .filter(Boolean)
        .join(', ')}
    >
      <View style={styles.topRow}>
        <Text style={[styles.timeText, { color: textMuted }]}>{timeAgo}</Text>
        <Text style={[styles.betText, { color: entry.freeSpin ? freeSpinColor : textSecondary }]}>
          {entry.freeSpin ? 'Free Spin' : fmtCoins(entry.bet)}
        </Text>
        <View style={styles.resultXpCluster}>
          <Animated.Text
            style={[
              styles.resultCell,
              resultAnimStyle,
              { color: isWin ? accent : textMuted, fontWeight: isWin ? '700' : '400' },
            ]}
            numberOfLines={1}
          >
            {resultTxt}
          </Animated.Text>
          <Text
            style={[styles.xpColumn, showPaidXp ? { color: primaryColor } : { color: textMuted }]}
            numberOfLines={1}
          >
            {xpCellText}
          </Text>
        </View>
        <View style={styles.rowSpacer} />
        <View style={styles.badgeGroup}>
          {badge ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: hexWithAlpha(accent, '18'), borderColor: hexWithAlpha(accent, '40') },
              ]}
            >
              <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
            </View>
          ) : null}
          {entry.fsMultiplier != null && entry.fsMultiplier > 1 ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: hexWithAlpha(freeSpinColor, '18'),
                  borderColor: hexWithAlpha(freeSpinColor, '40'),
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: freeSpinColor }]}>
                🔥{entry.fsMultiplier}×
              </Text>
            </View>
          ) : null}
          {!badge && (entry.fsMultiplier == null || entry.fsMultiplier <= 1) ? (
            <View style={styles.badgePlaceholder} />
          ) : null}
        </View>
      </View>

      {entry.paylinesHint ? (
        <Text style={[styles.paylineHint, { color: textMuted }]} numberOfLines={2}>
          <Text style={[styles.paylineHintLabel, { color: textSecondary }]}>Paths </Text>
          {entry.paylinesHint}
        </Text>
      ) : null}

      {entry.reelMiddle && entry.reelMiddle.length > 0 ? (
        <View style={styles.symbolStrip}>
          {entry.reelMiddle.map((token, col) => (
            <SpinHistorySymbolCell
              key={col}
              symbol={resolveSpinHistorySymbol(token)}
              token={token}
              isHit={winCols.has(col)}
              fallbackAccent={textMuted}
              reduceMotion={reduceMotion}
              columnDelay={col * 45}
            />
          ))}
        </View>
      ) : null}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  entryBlock: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '400',
    width: 58,
    flexShrink: 0,
  },
  betText: {
    fontSize: 12,
    fontWeight: '500',
    width: 68,
    flexShrink: 0,
  },
  resultXpCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  resultCell: {
    fontSize: 13,
    flexShrink: 1,
    minWidth: 0,
  },
  rowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  xpColumn: {
    fontSize: 13,
    fontWeight: '700',
    width: 48,
    flexShrink: 0,
    textAlign: 'right',
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    flexShrink: 0,
    flexGrow: 0,
  },
  badge: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  badgePlaceholder: {
    width: 44,
  },
  paylineHint: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    marginTop: 0,
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  paylineHintLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  symbolStrip: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
})
