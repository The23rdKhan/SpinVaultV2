/**
 * RecentSpinsRow — paginated spin history below the slot surface.
 *
 * Each entry shows:
 *   - Relative timestamp ("just now", "2m ago")
 *   - Bet / Result / Win-type badge   ← different from Coin Activity (game context)
 *   - 5 middle-row emojis with payline-aware highlights  ← unique to Spin History
 *
 * 5 rows per page · Prev / Next pagination · Hidden until first spin.
 */

import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'
import type { SpinAuditEntry } from '@/lib/game-context'

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

type RowVariant = 'loss' | 'win' | 'bigWin' | 'megaWin' | 'jackpot' | 'free'

function rowVariant(e: SpinAuditEntry): RowVariant {
  if (e.freeSpin && e.win === 0) return 'free'
  switch (e.winType) {
    case 'jackpot': return 'jackpot'
    case 'megaWin': return 'megaWin'
    case 'bigWin':  return 'bigWin'
    case 'normal':  return e.win > 0 ? 'win' : 'loss'
    case 'none':
    default:        return e.freeSpin ? 'free' : 'loss'
  }
}

function winTypeBadge(variant: RowVariant): string {
  switch (variant) {
    case 'jackpot': return 'JACKPOT'
    case 'megaWin': return 'MEGA WIN'
    case 'bigWin':  return 'BIG WIN'
    case 'win':     return 'WIN'
    case 'free':    return 'FREE SPIN'
    default:        return ''
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
    case 'win':     return t.win
    case 'free':    return t.freeSpin
    default:        return t.textMuted
  }
}

// ─── component ──────────────────────────────────────────────────────────────

export function RecentSpinsRow({ spinAudit }: Props) {
  const t = useCasinoTheme()
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

      {/* Entries */}
      <View style={[styles.table, { borderColor: t.border, backgroundColor: t.card }]}>
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

          return (
            <View
              // Use a separator between ts and index so two spins that somehow
              // land on the same millisecond don't produce a duplicate key.
              key={`${entry.ts}-${i}`}
              style={[
                styles.entryBlock,
                !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
                isWin && { backgroundColor: hexWithAlpha(accent, '07') },
              ]}
              accessibilityRole="text"
              accessibilityLabel={[
                isWin ? `Won ${entry.win} coins` : `Lost ${entry.bet} coins`,
                entry.freeSpin ? 'free spin' : `bet ${entry.bet}`,
                badge || '',
                entry.reelMiddle?.join(' ') ?? '',
                timeAgo,
              ].filter(Boolean).join(', ')}
            >
              {/* ── Top row: time · bet · result · badge ── */}
              <View style={styles.topRow}>
                <Text style={[styles.timeText, { color: t.textMuted }]}>
                  {timeAgo}
                </Text>

                <Text style={[styles.betText, { color: entry.freeSpin ? t.freeSpin : t.textSecondary }]}>
                  {entry.freeSpin ? 'Free Spin' : fmtCoins(entry.bet)}
                </Text>

                <Text style={[
                  styles.resultText,
                  { color: isWin ? accent : t.textMuted, fontWeight: isWin ? '700' : '400' },
                ]}>
                  {resultTxt}
                </Text>

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
                  {/* Placeholder keeps the row height stable when no badges are shown. */}
                  {!badge && (entry.fsMultiplier == null || entry.fsMultiplier <= 1) ? (
                    <View style={styles.badgePlaceholder} />
                  ) : null}
                </View>
              </View>

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
            onPress={() => setPage((p) => Math.max(0, p - 1))}
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
                  onPress={() => setPage(dotPage)}
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
            onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
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

  // Table
  table: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  entryBlock: {
    paddingTop: 9,
    paddingBottom: 10,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 7,
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
  resultText: {
    fontSize: 13,
    flex: 1,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
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

  // Symbol strip
  symbolStrip: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
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
