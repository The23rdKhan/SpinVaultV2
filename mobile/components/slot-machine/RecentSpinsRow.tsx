/**
 * RecentSpinsRow — paginated spin history below the slot surface.
 *
 * Each entry shows:
 *   - Relative timestamp ("just now", "2m ago")
 *   - Bet / Result / Win-type badge
 *   - Column labels (Time · Bet · Result · XP · Tier)
 *   - Optional **Paths** line: paylines + scatter + jackpot row
 *   - 5 middle-row reel symbols with payline-aware highlights + light motion
 *
 * 5 rows per page · Prev / Next pagination · Hidden until first spin.
 *
 * Spin History animation rules (keep calmer than live Play reels):
 * - Rows fade/slide in on page load or paginate; skip when reduced motion is on.
 * - Brand-new top spin (page 1): one-time row fade + result text pop (`SpinHistoryEntryRow`).
 * - Winning rows: soft static tint only — no looping reel-style celebration.
 * - Only payline-hit symbols animate (`SpinHistorySymbolCell`): short scale pop + 2 halo pulses
 *   in the symbol’s brand color, staggered left → right.
 * - Loss rows and non-hit symbols stay static.
 * - Reduced motion: static layout or one small bump on hit symbols.
 */

import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useHaptics } from '@/lib/use-haptics'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { hexWithAlpha } from '@/theme/tokens'
import { SPIN_HISTORY_LOW_BALANCE_HINT } from '@/lib/bet-ui-copy'
import { useGame, type SpinAuditEntry } from '@/lib/game-context'
import { getWinTypeBadgeUpper } from '@/lib/vault-copy'
import { SpinHistoryEntryRow } from './SpinHistoryEntryRow'

interface Props {
  spinAudit: SpinAuditEntry[]
}

const PAGE_SIZE = 5

function fmtCoins(n: number): string {
  if (n >= 1_000_000_000) return `${Math.round(n / 1_000_000_000)}B VC`
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M VC`
  if (n >= 10_000) return `${Math.round(n / 1_000)}K VC`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K VC`
  return `${n} VC`
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diffMs / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

type RowVariant = 'loss' | 'subtle' | 'win' | 'bigWin' | 'megaWin' | 'jackpot' | 'free'

function effectiveReturnVsBet(e: SpinAuditEntry): number | undefined {
  if (e.winMultiplier != null && Number.isFinite(e.winMultiplier)) return e.winMultiplier
  if (e.bet > 0 && e.win > 0) return e.win / e.bet
  return undefined
}

function rowVariant(e: SpinAuditEntry): RowVariant {
  if (e.freeSpin && e.win === 0) return 'free'
  switch (e.winType) {
    case 'jackpot':
      return 'jackpot'
    case 'megaWin':
      return 'megaWin'
    case 'bigWin':
      return 'bigWin'
    case 'normal': {
      if (e.win <= 0) return 'loss'
      const m = effectiveReturnVsBet(e)
      if (m != null && m < 1) return 'subtle'
      return 'win'
    }
    case 'none':
    default:
      return e.freeSpin ? 'free' : 'loss'
  }
}

function winTypeBadge(variant: RowVariant): string {
  switch (variant) {
    case 'jackpot':
      return getWinTypeBadgeUpper('jackpot')
    case 'megaWin':
      return getWinTypeBadgeUpper('megaWin')
    case 'bigWin':
      return getWinTypeBadgeUpper('bigWin')
    case 'subtle':
      return '<1×'
    case 'win':
      return getWinTypeBadgeUpper('normal')
    case 'free':
      return 'FREE SPIN'
    default:
      return ''
  }
}

function accentFor(variant: RowVariant, t: ReturnType<typeof useCasinoTheme>): string {
  switch (variant) {
    case 'jackpot':
      return t.gold
    case 'megaWin':
      return t.jackpot
    case 'bigWin':
      return t.primary
    case 'subtle':
      return t.textMuted
    case 'win':
      return t.win
    case 'free':
      return t.freeSpin
    default:
      return t.textMuted
  }
}

export function RecentSpinsRow({ spinAudit }: Props) {
  const t = useCasinoTheme()
  const reduceMotion = useReducedMotion()
  const { pagerTap } = useHaptics()
  const { coins, currentBet, freeSpins } = useGame()
  const [page, setPage] = useState(0)
  /** Timestamp of the latest spin — drives one-shot “new result” motion on page 1. */
  const [highlightTs, setHighlightTs] = useState<string | null>(null)

  const prevLengthRef = useRef(spinAudit.length)
  useEffect(() => {
    if (spinAudit.length !== prevLengthRef.current) {
      const grew = spinAudit.length > prevLengthRef.current
      prevLengthRef.current = spinAudit.length
      if (grew) setHighlightTs(spinAudit[0]?.ts ?? null)
      setPage(0)
    }
  }, [spinAudit.length, spinAudit])

  const totalEntries = spinAudit.length
  const showLowBalanceHint = totalEntries > 0 && coins < currentBet && freeSpins === 0

  if (totalEntries === 0) return null

  const totalPages = Math.ceil(totalEntries / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(0, totalPages - 1))
  const pageEntries = spinAudit.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Spin History</Text>
        {totalPages > 1 && (
          <Text style={[styles.pageCount, { color: t.textMuted }]}>
            {safePage + 1} / {totalPages}
          </Text>
        )}
      </View>

      {showLowBalanceHint ? (
        <Text
          style={[styles.spinHistoryHint, { color: t.textSecondary }]}
          accessibilityRole="text"
          accessibilityLabel={SPIN_HISTORY_LOW_BALANCE_HINT}
        >
          {SPIN_HISTORY_LOW_BALANCE_HINT}
        </Text>
      ) : null}

      <View style={[styles.table, { borderColor: t.border, backgroundColor: t.card }]}>
        <View style={[styles.columnHeaderRow, { borderBottomColor: t.border }]}>
          <Text style={[styles.timeText, styles.columnHeaderText, { color: t.textMuted }]}>Time</Text>
          <Text style={[styles.betText, styles.columnHeaderText, { color: t.textMuted }]}>Bet</Text>
          <View style={styles.resultXpCluster}>
            <Text style={[styles.resultCell, styles.columnHeaderText, { color: t.textMuted }]}>
              Result
            </Text>
            <Text style={[styles.xpColumn, styles.columnHeaderText, { color: t.textMuted }]}>XP</Text>
          </View>
          <View style={styles.rowSpacer} />
          <View style={styles.columnHeaderBadgeSlot}>
            <Text style={[styles.columnHeaderText, styles.columnHeaderTier, { color: t.textMuted }]}>
              Tier
            </Text>
          </View>
        </View>

        {/* Row entrance: FadeInDown below. Fresh-win + symbol motion: SpinHistoryEntryRow / SpinHistorySymbolCell. */}
        <View key={`spin-history-page-${safePage}`}>
          {pageEntries.map((entry, i) => {
            const variant = rowVariant(entry)
            const accent = accentFor(variant, t)
            const badge = winTypeBadge(variant)
            const isWin = variant !== 'loss'
            const isLast = i === pageEntries.length - 1
            const isFreshEntry = safePage === 0 && i === 0 && highlightTs != null && entry.ts === highlightTs
            const resultTxt = isWin ? `+${fmtCoins(entry.win)}` : `−${fmtCoins(entry.bet)}`
            const xpRaw = entry.xpGained
            const showPaidXp = xpRaw !== undefined && xpRaw > 0
            const xpCellText = xpRaw === undefined ? '—' : xpRaw > 0 ? `+${xpRaw.toLocaleString()}` : '0'

            return (
              <Animated.View
                key={`${entry.ts}-${i}`}
                entering={
                  reduceMotion
                    ? undefined
                    : FadeInDown.delay(i * 55)
                        .duration(280)
                        .springify()
                        .damping(20)
                }
              >
                <SpinHistoryEntryRow
                  entry={entry}
                  isLast={isLast}
                  accent={accent}
                  badge={badge}
                  isWin={isWin}
                  timeAgo={relativeTime(entry.ts)}
                  resultTxt={resultTxt}
                  xpCellText={xpCellText}
                  showPaidXp={showPaidXp}
                  borderColor={t.border}
                  freeSpinColor={t.freeSpin}
                  textMuted={t.textMuted}
                  textSecondary={t.textSecondary}
                  primaryColor={t.primary}
                  reduceMotion={reduceMotion}
                  isFreshEntry={isFreshEntry}
                />
              </Animated.View>
            )
          })}
        </View>
      </View>

      {totalPages > 1 && (
        <View style={styles.pager}>
          <Pressable
            onPress={() => {
              pagerTap()
              setPage((p) => Math.max(0, p - 1))
            }}
            disabled={safePage === 0}
            style={({ pressed }) => [
              styles.pageBtn,
              {
                borderColor: t.border,
                backgroundColor: pressed ? hexWithAlpha(t.primary, '15') : t.card,
              },
              safePage === 0 && { opacity: 0.35 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Newer spins"
            accessibilityState={{ disabled: safePage === 0 }}
          >
            <FontAwesome name="chevron-left" size={11} color={t.textSecondary} />
            <Text style={[styles.pageBtnText, { color: t.textSecondary }]}>Newer</Text>
          </Pressable>

          <View style={styles.dotRow}>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, di) => {
              const offset = totalPages <= 7 ? 0 : Math.max(0, Math.min(totalPages - 7, safePage - 3))
              const dotPage = offset + di
              const active = dotPage === safePage
              return (
                <Pressable
                  key={dotPage}
                  onPress={() => {
                    pagerTap()
                    setPage(dotPage)
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Page ${dotPage + 1}`}
                >
                  <View
                    style={[
                      styles.dot,
                      active
                        ? { width: 16, backgroundColor: t.primary }
                        : { width: 6, backgroundColor: hexWithAlpha(t.textMuted, '40') },
                    ]}
                  />
                </Pressable>
              )
            })}
          </View>

          <Pressable
            onPress={() => {
              pagerTap()
              setPage((p) => Math.min(totalPages - 1, p + 1))
            }}
            disabled={safePage >= totalPages - 1}
            style={({ pressed }) => [
              styles.pageBtn,
              {
                borderColor: t.border,
                backgroundColor: pressed ? hexWithAlpha(t.primary, '15') : t.card,
              },
              safePage >= totalPages - 1 && { opacity: 0.35 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Older spins"
            accessibilityState={{ disabled: safePage >= totalPages - 1 }}
          >
            <Text style={[styles.pageBtnText, { color: t.textSecondary }]}>Older</Text>
            <FontAwesome name="chevron-right" size={11} color={t.textSecondary} />
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pageCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  spinHistoryHint: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginTop: -2,
    marginBottom: 2,
  },
  columnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  columnHeaderText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  columnHeaderTier: {
    textAlign: 'right',
  },
  columnHeaderBadgeSlot: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minWidth: 44,
    flexShrink: 0,
    flexGrow: 0,
  },
  table: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingVertical: 8,
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
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 2,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
})
