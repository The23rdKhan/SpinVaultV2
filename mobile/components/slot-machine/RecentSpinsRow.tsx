/**
 * RecentSpinsRow — paginated spin history below the slot surface.
 *
 * Each entry shows:
 *   - Relative timestamp ("just now", "2m ago")
 *   - Bet / Result / Win-type badge   ← different from Coin Activity (game context)
 *   - Column labels (Time · Bet · Result · XP · Tier)
 *   - XP value on the same row as bet/result (legacy rows without XP show —)
 *   - Optional **Paths** line: paylines + scatter + jackpot row (from engine snapshot)
 *   - 5 middle-row emojis with payline-aware highlights  ← unique to Spin History
 *   - Extra vertical spacing between rows for readability
 *
 * 5 rows per page · Prev / Next pagination · Hidden until first spin.
 * Low-balance hint (same CTA as bet-adjust toast) when paid spins are blocked — see `SPIN_HISTORY_LOW_BALANCE_HINT`.
 */

import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { useHaptics } from '@/lib/use-haptics'
import { hexWithAlpha } from '@/theme/tokens'
import { SPIN_HISTORY_LOW_BALANCE_HINT } from '@/lib/bet-ui-copy'
import { useGame, type SpinAuditEntry } from '@/lib/game-context'
import { getWinTypeBadgeUpper } from '@/lib/vault-copy'

interface Props {
  spinAudit: SpinAuditEntry[]
}

const PAGE_SIZE = 5

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Format a coin count for compact display.
 * Handles the full SpinVault range including whale bets (up to $100M+).
 */
function fmtCoins(n: number): string {
  if (n >= 1_000_000_000) return `$${Math.round(n / 1_000_000_000)}B`
  if (n >= 1_000_000)     return `$${Math.round(n / 1_000_000)}M`
  if (n >= 10_000)        return `$${Math.round(n / 1_000)}K`
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(1)}K`
  return `$${n}`
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diffMs / 1000)
  if (s < 10)  return 'just now'
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/** VoiceOver line for XP on a spin row (paid vs free); avoids a stray `showXp` identifier. */
function formatSpinHistoryXpA11y(showPaidXp: boolean, showFreeNoXp: boolean, xpGained: number): string {
  if (showPaidXp) return `+${xpGained} XP`
  if (showFreeNoXp) return '0 XP, free spin'
  return ''
}

type RowVariant = 'loss' | 'subtle' | 'win' | 'bigWin' | 'megaWin' | 'jackpot' | 'free'

/** Return win÷bet when `winMultiplier` was not stored (legacy spin audit rows). */
function effectiveReturnVsBet(e: SpinAuditEntry): number | undefined {
  if (e.winMultiplier != null && Number.isFinite(e.winMultiplier)) return e.winMultiplier
  if (e.bet > 0 && e.win > 0) return e.win / e.bet
  return undefined
}

function rowVariant(e: SpinAuditEntry): RowVariant {
  if (e.freeSpin && e.win === 0) return 'free'
  switch (e.winType) {
    case 'jackpot': return 'jackpot'
    case 'megaWin': return 'megaWin'
    case 'bigWin':  return 'bigWin'
    case 'normal': {
      if (e.win <= 0) return 'loss'
      const m = effectiveReturnVsBet(e)
      if (m != null && m < 1) return 'subtle'
      return 'win'
    }
    case 'none':
    default:        return e.freeSpin ? 'free' : 'loss'
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

/**
 * Resolve the accent color for a given row variant.
 * Defined at module level (not inside the component) to avoid recreating
 * a closure-over-`t` function on every render.
 */
function accentFor(
  variant: RowVariant,
  t: ReturnType<typeof useCasinoTheme>,
): string {
  switch (variant) {
    case 'jackpot': return t.gold
    case 'megaWin': return t.jackpot
    case 'bigWin':  return t.primary
    case 'subtle':  return t.textMuted
    case 'win':     return t.win
    case 'free':    return t.freeSpin
    default:        return t.textMuted
  }
}

// ─── component ──────────────────────────────────────────────────────────────

export function RecentSpinsRow({ spinAudit }: Props) {
  const t = useCasinoTheme()
  const { pagerTap } = useHaptics()
  const { coins, currentBet, freeSpins } = useGame()
  const [page, setPage] = useState(0)

  // Reset to the newest page whenever a new spin is appended so the player
  // always sees the latest result without manually navigating back.
  const prevLengthRef = useRef(spinAudit.length)
  useEffect(() => {
    if (spinAudit.length !== prevLengthRef.current) {
      prevLengthRef.current = spinAudit.length
      setPage(0)
    }
  }, [spinAudit.length])

  const totalEntries = spinAudit.length
  /** Mirrors ControlDeck “broke” gate: paid spin needs coins ≥ line bet, unless free spins cover cost. */
  const showLowBalanceHint = totalEntries > 0 && coins < currentBet && freeSpins === 0

  if (totalEntries === 0) return null

  const totalPages  = Math.ceil(totalEntries / PAGE_SIZE)
  const safePage    = Math.min(page, Math.max(0, totalPages - 1))
  const pageEntries = spinAudit.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  return (
    <View style={styles.root}>
      {/* Header */}
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

      {/* Entries */}
      <View style={[styles.table, { borderColor: t.border, backgroundColor: t.card }]}>
        <View style={[styles.columnHeaderRow, { borderBottomColor: t.border }]}>
          <Text style={[styles.timeText, styles.columnHeaderText, { color: t.textMuted }]}>Time</Text>
          <Text style={[styles.betText, styles.columnHeaderText, { color: t.textMuted }]}>Bet</Text>
          <View style={styles.resultXpCluster}>
            <Text style={[styles.resultCell, styles.columnHeaderText, { color: t.textMuted }]}>Result</Text>
            <Text style={[styles.xpColumn, styles.columnHeaderText, { color: t.textMuted }]}>XP</Text>
          </View>
          <View style={styles.rowSpacer} />
          <View style={styles.columnHeaderBadgeSlot}>
            <Text style={[styles.columnHeaderText, styles.columnHeaderTier, { color: t.textMuted }]}>
              Tier
            </Text>
          </View>
        </View>

        {pageEntries.map((entry, i) => {
          const variant   = rowVariant(entry)
          const accent    = accentFor(variant, t)
          const badge     = winTypeBadge(variant)
          const isWin     = variant !== 'loss'
          const isLast    = i === pageEntries.length - 1
          const resultTxt = isWin
            ? `+${fmtCoins(entry.win)}`
            : `−${fmtCoins(entry.bet)}`
          const winCols   = new Set(entry.winningColsMiddle ?? [])
          // Compute once and reuse — avoids the double call that previously
          // appeared in both accessibilityLabel and JSX text.
          const timeAgo   = relativeTime(entry.ts)
          const xpRaw     = entry.xpGained
          const xpGained  = xpRaw ?? 0
          const showPaidXp = xpRaw !== undefined && xpRaw > 0
          const showFreeNoXp = entry.freeSpin && xpRaw !== undefined && xpRaw <= 0

          const xpCellText =
            xpRaw === undefined ? '—' : xpRaw > 0 ? `+${xpRaw.toLocaleString()}` : '0'

          return (
            <View
              // Use a separator between ts and index so two spins that somehow
              // land on the same millisecond don't produce a duplicate key.
              key={`${entry.ts}-${i}`}
              style={[
                styles.entryBlock,
                !isLast && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: t.border,
                  marginBottom: 12,
                },
                isWin && { backgroundColor: hexWithAlpha(accent, '07') },
              ]}
              accessibilityRole="text"
              accessibilityLabel={[
                isWin ? `Won ${entry.win} coins` : `Lost ${entry.bet} coins`,
                entry.freeSpin ? 'free spin' : `bet ${entry.bet}`,
                formatSpinHistoryXpA11y(showPaidXp, showFreeNoXp, xpGained),
                badge || '',
                entry.paylinesHint ?? '',
                entry.reelMiddle?.join(' ') ?? '',
                timeAgo,
              ].filter(Boolean).join(', ')}
            >
              {/* ── Top row: time · bet · result · tier badges ── */}
              <View style={styles.topRow}>
                <Text style={[styles.timeText, { color: t.textMuted }]}>
                  {timeAgo}
                </Text>

                <Text style={[styles.betText, { color: entry.freeSpin ? t.freeSpin : t.textSecondary }]}>
                  {entry.freeSpin ? 'Free Spin' : fmtCoins(entry.bet)}
                </Text>

                <View style={styles.resultXpCluster}>
                  <Text
                    style={[
                      styles.resultCell,
                      { color: isWin ? accent : t.textMuted, fontWeight: isWin ? '700' : '400' },
                    ]}
                    numberOfLines={1}
                  >
                    {resultTxt}
                  </Text>
                  <Text
                    style={[
                      styles.xpColumn,
                      showPaidXp ? { color: t.primary } : { color: t.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {xpCellText}
                  </Text>
                </View>

                <View style={styles.rowSpacer} />

                <View style={styles.badgeGroup}>
                  {badge ? (
                    <View style={[
                      styles.badge,
                      { backgroundColor: hexWithAlpha(accent, '18'), borderColor: hexWithAlpha(accent, '40') },
                    ]}>
                      <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
                    </View>
                  ) : null}
                  {entry.fsMultiplier != null && entry.fsMultiplier > 1 ? (
                    <View style={[
                      styles.badge,
                      { backgroundColor: hexWithAlpha(t.freeSpin, '18'), borderColor: hexWithAlpha(t.freeSpin, '40') },
                    ]}>
                      <Text style={[styles.badgeText, { color: t.freeSpin }]}>
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
                <Text style={[styles.paylineHint, { color: t.textMuted }]} numberOfLines={2}>
                  <Text style={[styles.paylineHintLabel, { color: t.textSecondary }]}>Paths </Text>
                  {entry.paylinesHint}
                </Text>
              ) : null}

              {/* ── Symbol strip with payline highlights ── */}
              {entry.reelMiddle && entry.reelMiddle.length > 0 && (
                <View style={styles.symbolStrip}>
                  {entry.reelMiddle.map((emoji, col) => {
                    const isHit = winCols.has(col)
                    return (
                      <View
                        key={col}
                        style={[
                          styles.symbolCell,
                          isHit
                            ? {
                                backgroundColor: hexWithAlpha(accent, '22'),
                                borderColor:     hexWithAlpha(accent, '70'),
                                borderWidth: 1.5,
                                shadowColor:   accent,
                                shadowOpacity: 0.45,
                                shadowRadius:  6,
                                shadowOffset:  { width: 0, height: 0 },
                                elevation: 3,
                              }
                            : {
                                backgroundColor: hexWithAlpha(t.textMuted, '06'),
                                borderColor:     hexWithAlpha(t.textMuted, '15'),
                                borderWidth: StyleSheet.hairlineWidth,
                              },
                        ]}
                      >
                        <Text style={[styles.symbolEmoji, isHit && styles.symbolEmojiHit]}>
                          {emoji}
                        </Text>
                        {isHit && (
                          <View style={[styles.winDot, { backgroundColor: accent }]} />
                        )}
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })}
      </View>

      {/* Pagination */}
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
              { borderColor: t.border, backgroundColor: pressed ? hexWithAlpha(t.primary, '15') : t.card },
              safePage === 0 && { opacity: 0.35 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Newer spins"
            accessibilityState={{ disabled: safePage === 0 }}
          >
            <FontAwesome name="chevron-left" size={11} color={t.textSecondary} />
            <Text style={[styles.pageBtnText, { color: t.textSecondary }]}>Newer</Text>
          </Pressable>

          {/* Dot indicators */}
          <View style={styles.dotRow}>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, di) => {
              const offset  = totalPages <= 7 ? 0 : Math.max(0, Math.min(totalPages - 7, safePage - 3))
              const dotPage = offset + di
              const active  = dotPage === safePage
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
                  <View style={[
                    styles.dot,
                    active
                      ? { width: 16, backgroundColor: t.primary }
                      : { width: 6,  backgroundColor: hexWithAlpha(t.textMuted, '40') },
                  ]} />
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
              { borderColor: t.border, backgroundColor: pressed ? hexWithAlpha(t.primary, '15') : t.card },
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

// ─── styles ─────────────────────────────────────────────────────────────────

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

  // Table — vertical padding so first/last rows aren’t flush to the card rim
  table: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingVertical: 8,
  },
  entryBlock: {
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Top row
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
  /** Result + XP stay adjacent; flexible gap before Tier is absorbed here. */
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

  // Symbol strip
  symbolStrip: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  symbolCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 8,
    position: 'relative',
  },
  symbolEmoji: {
    fontSize: 17,
  },
  symbolEmojiHit: {
    fontSize: 18,
  },
  winDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Pagination
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
