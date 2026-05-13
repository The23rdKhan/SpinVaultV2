import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { SYMBOLS } from '@/lib/game-context'
import { SCATTER_PAYOUT_MULTIPLIERS } from '@shared/slot/evaluate-spin'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'
import { AppButton } from '@/components/ui/AppButton'
import { AppScrollView } from '@/components/ui/AppScrollView'

type Tab = 'symbols' | 'paylines' | 'bonus'

const TABS: { id: Tab; label: string }[] = [
  { id: 'symbols', label: 'Symbols' },
  { id: 'paylines', label: 'Paylines' },
  { id: 'bonus', label: 'Bonus' },
]

/**
 * True win/bet multipliers derived from evaluate-spin.ts formula:
 *   lineWinCoins = floor(bet × symValue × matchMult / 10)
 *   winMultiplier = lineWinCoins / bet = symValue × matchMult / 10
 * matchMult: 3-of-a-kind = 1, 4-of-a-kind = 2.5, 5-of-a-kind = 5
 */
function payoutMultipliers(value: number) {
  const fmt = (n: number) => (n % 1 === 0 ? `${n}×` : `${n.toFixed(1)}×`)
  return {
    m3: fmt(value / 10),
    m4: fmt((value * 2.5) / 10),
    m5: fmt((value * 5) / 10),
  }
}

const PAYLINE_NAMES = [
  { name: 'Line 1', desc: 'Middle row — R2·R2·R2·R2·R2' },
  { name: 'Line 2', desc: 'Top row — R1·R1·R1·R1·R1' },
  { name: 'Line 3', desc: 'Bottom row — R3·R3·R3·R3·R3' },
  { name: 'Line 4', desc: 'V shape — R1·R2·R3·R2·R1' },
  { name: 'Line 5', desc: 'Inverted V — R3·R2·R1·R2·R3' },
  { name: 'Line 6', desc: 'Diagonal down — R1·R1·R2·R3·R3' },
  { name: 'Line 7', desc: 'Diagonal up — R3·R3·R2·R1·R1' },
  { name: 'Line 8', desc: 'Top bump — R2·R1·R1·R1·R2' },
  { name: 'Line 9', desc: 'Bottom bump — R2·R3·R3·R3·R2' },
]

const WIN_TYPES = [
  { label: 'Win',          range: '0.5× – 4.9× bet',  colorKey: 'textPrimary' as const },
  { label: 'Big Win',      range: '5× – 9.9× bet',    colorKey: 'primary' as const },
  { label: 'Mega Win',     range: '10× – 24.9× bet',  colorKey: 'win' as const },
  { label: 'Mega Jackpot', range: '25×+ bet',          colorKey: 'jackpot' as const },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function InfoModal({ open, onClose }: Props) {
  const t = useCasinoTheme()
  const [activeTab, setActiveTab] = useState<Tab>('symbols')

  const regular = SYMBOLS.filter((s) => !s.isWild && !s.isScatter)
  const special = SYMBOLS.filter((s) => s.isWild === true || s.isScatter === true)

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      {/* Backdrop blur */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}>
        <BlurView
          intensity={45}
          tint="dark"
          blurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Tap outside to close */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/*
          Plain View (not Pressable) so it never swallows the ScrollView's
          pan-gesture. Touch propagation to the backdrop is stopped via
          onStartShouldSetResponder.
        */}
        <View
          style={[styles.sheet, { backgroundColor: t.surfaceElevated, borderColor: t.border }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: t.border }]}>
            <Text style={[styles.title, { color: t.textPrimary }]}>Game Info</Text>
          </View>

          {/* Tab bar */}
          <View style={[styles.tabBar, { borderBottomColor: t.border }]}>
            {TABS.map(({ id, label }) => {
              const isActive = activeTab === id
              return (
                <Pressable
                  key={id}
                  onPress={() => setActiveTab(id)}
                  style={[
                    styles.tab,
                    isActive && { borderBottomColor: t.primary, borderBottomWidth: 2 },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.tabLabel, { color: isActive ? t.primary : t.textMuted }]}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Scrollable content — flex: 1 fills the remaining sheet height */}
          <AppScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
          >
            {/* ── SYMBOLS ── */}
            {activeTab === 'symbols' && (
              <>
                {/* Payout table header */}
                <View style={[styles.payoutHeader, { borderColor: t.border }]}>
                  <Text style={[styles.payoutHeaderCell, { color: t.textMuted, flex: 1 }]}>Symbol</Text>
                  <Text style={[styles.payoutHeaderCell, { color: t.textMuted }]}>3 match</Text>
                  <Text style={[styles.payoutHeaderCell, { color: t.textMuted }]}>4 match</Text>
                  <Text style={[styles.payoutHeaderCell, { color: t.textMuted }]}>5 match</Text>
                </View>

                <Text style={[styles.section, { color: t.textMuted, marginTop: 4 }]}>Paying Symbols</Text>
                {regular.map((s) => {
                  const { m3, m4, m5 } = payoutMultipliers(s.value)
                  return (
                    <View key={s.id} style={[styles.payoutRow, { borderColor: t.border }]}>
                      <View style={styles.payoutSymbolCell}>
                        <Text style={[styles.emoji, { color: t.textPrimary }]}>{s.emoji}</Text>
                        <Text style={[styles.payoutName, { color: t.textPrimary }]}>{s.name}</Text>
                      </View>
                      <Text style={[styles.payoutVal, { color: t.primary }]}>{m3}</Text>
                      <Text style={[styles.payoutVal, { color: t.win }]}>{m4}</Text>
                      <Text style={[styles.payoutVal, { color: t.jackpot }]}>{m5}</Text>
                    </View>
                  )
                })}

                <Text style={[styles.body, { color: t.textMuted, marginTop: 6, marginBottom: 16, fontSize: 11 }]}>
                  Multipliers shown as win ÷ bet. Wild can appear anywhere on a payline — including the first reel — and substitutes for the nearest matching symbol. Five Wilds in a row do not pay on their own.
                </Text>

                <Text style={[styles.section, { color: t.textMuted }]}>Special Symbols</Text>
                {special.map((s) => (
                  <View key={s.id} style={[styles.row, { borderColor: t.border }]}>
                    <View
                      style={[
                        styles.specialBadge,
                        {
                          backgroundColor: s.isWild
                            ? hexWithAlpha(t.win, '22')
                            : hexWithAlpha(t.gold, '22'),
                          borderColor: s.isWild ? t.win : t.gold,
                        },
                      ]}
                    >
                      <Text style={[styles.specialEmoji, { color: s.isWild ? t.win : t.gold }]}>
                        {s.emoji}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: s.isWild ? t.win : t.gold }]}>
                        {s.name}
                      </Text>
                      <Text style={[styles.meta, { color: t.textSecondary }]}>
                        {s.isWild
                          ? 'Substitutes for any symbol except Scatter. Can appear on any reel, including the first. Five Wilds alone do not pay.'
                          : '2+ anywhere pays coins (2×, 5×, 20×, or 100× your bet). 3+ also triggers 10 Free Spins. No payline needed.'}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Jackpot Mode bonus note */}
                <View style={[styles.infoCallout, { backgroundColor: hexWithAlpha(t.gold, '0E'), borderColor: hexWithAlpha(t.gold, '40') }]}>
                  <Text style={[styles.infoCalloutText, { color: t.gold }]}>
                    Jackpot Mode bonus:
                  </Text>
                  <Text style={[styles.meta, { color: t.textSecondary }]}>
                    5 Lucky Sevens (or Wilds) on the middle row triggers Jackpot Mode. Standard bets pay a flat{' '}
                    <Text style={{ fontWeight: '800', color: t.gold }}>$250,000</Text>
                    {' '}prize. Whale bets ($1M+) scale to{' '}
                    <Text style={{ fontWeight: '800', color: t.gold }}>bet × 25</Text>
                    {' '}— a $1M bet pays $25M. Payline wins are paid on top.
                  </Text>
                </View>
              </>
            )}

            {/* ── PAYLINES ── */}
            {activeTab === 'paylines' && (
              <>
                <Text style={[styles.body, { color: t.textSecondary, marginBottom: 12 }]}>
                  9 fixed paylines. Match 3 or more identical symbols starting from the leftmost reel on the same payline to win. Wins pay left-to-right only. Tap the{' '}
                  <Text style={{ fontWeight: '800', color: t.textPrimary }}>Lines</Text> button on the Play screen to see each payline visualized.
                </Text>
                {PAYLINE_NAMES.map(({ name, desc }, i) => (
                  <View
                    key={i}
                    style={[
                      styles.paylineRow,
                      {
                        borderColor: t.border,
                        backgroundColor: hexWithAlpha(t.primary, '0A'),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.lineBadge,
                        {
                          backgroundColor: hexWithAlpha(t.primary, '22'),
                          borderColor: t.primary,
                        },
                      ]}
                    >
                      <Text style={[styles.lineBadgeNum, { color: t.primary }]}>{i + 1}</Text>
                    </View>
                    <View>
                      <Text style={[styles.name, { color: t.textPrimary }]}>{name}</Text>
                      <Text style={[styles.meta, { color: t.textSecondary }]}>{desc}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* ── BONUS ── */}
            {activeTab === 'bonus' && (
              <>
                {/* Scatter — coins + free spins */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.freeSpin, '10'),
                      borderColor: hexWithAlpha(t.freeSpin, '40'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.freeSpin }]}>Scatter Pays</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Scatter symbols pay coins based on how many land anywhere on the reels — no payline required.
                    3 or more also trigger Free Spins. Both rewards stack.
                  </Text>

                  {/* Scatter payout table */}
                  <View style={[styles.payoutHeader, { borderColor: t.border, marginTop: 8 }]}>
                    <Text style={[styles.payoutHeaderCell, { color: t.textMuted, flex: 1 }]}>Scatters</Text>
                    <Text style={[styles.payoutHeaderCell, { color: t.textMuted, width: 72, textAlign: 'right' }]}>Coins</Text>
                    <Text style={[styles.payoutHeaderCell, { color: t.textMuted, width: 96, textAlign: 'right' }]}>Free Spins</Text>
                  </View>
                  {([2, 3, 4, 5] as const).map((count) => {
                    const mult = SCATTER_PAYOUT_MULTIPLIERS[count] ?? 0
                    return (
                      <View key={count} style={[styles.payoutRow, { borderColor: t.border }]}>
                        <View style={[styles.payoutSymbolCell, { flex: 1 }]}>
                          {Array.from({ length: count }).map((_, i) => (
                            <Text key={i} style={[styles.emoji, { color: t.freeSpin }]}>✦</Text>
                          ))}
                        </View>
                        <Text style={[styles.payoutVal, { color: t.win, width: 72, textAlign: 'right' }]}>
                          {mult}× bet
                        </Text>
                        <Text style={[styles.payoutVal, { color: t.freeSpin, width: 96, textAlign: 'right' }]}>
                          {count >= 3 ? '+ 10 Free' : '—'}
                        </Text>
                      </View>
                    )
                  })}

                  <Text style={[styles.meta, { color: t.textMuted, marginTop: 6 }]}>
                    Scatter coins are paid in addition to any payline wins on the same spin.
                    Free spins use your current bet at no cost, so bigger bets mean bigger free spin payouts.
                  </Text>
                </View>

                {/* Free Spin Streak Multiplier */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.freeSpin, '0D'),
                      borderColor: hexWithAlpha(t.freeSpin, '50'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.freeSpin }]}>🔥 Free Spin Streak</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    During a Free Spin session, consecutive{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>winning</Text>{' '}
                    spins build a streak multiplier that boosts your next spin's entire payout — including scatter coins:
                  </Text>

                  {/* Streak tier table */}
                  <View style={[styles.payoutHeader, { borderColor: t.border, marginTop: 8 }]}>
                    <Text style={[styles.payoutHeaderCell, { color: t.textMuted, flex: 1 }]}>Consecutive Wins</Text>
                    <Text style={[styles.payoutHeaderCell, { color: t.textMuted, width: 80, textAlign: 'right' }]}>Multiplier</Text>
                  </View>
                  {([
                    { label: 'Starting',     mult: '1×' },
                    { label: '1st win',      mult: '2×' },
                    { label: '2nd win',      mult: '3×' },
                    { label: '3rd win',      mult: '4×' },
                    { label: '4th+ win',     mult: '5× MAX' },
                  ]).map(({ label, mult }) => (
                    <View key={label} style={[styles.payoutRow, { borderColor: t.border }]}>
                      <Text style={[styles.payoutVal, { flex: 1, color: t.textSecondary }]}>{label}</Text>
                      <Text style={[styles.payoutVal, { width: 80, textAlign: 'right', color: t.freeSpin, fontWeight: '800' }]}>
                        {mult}
                      </Text>
                    </View>
                  ))}

                  <Text style={[styles.meta, { color: t.textMuted, marginTop: 6 }]}>
                    A blank free spin resets the streak to 1×. Returning to a paid spin also resets it.
                    Jackpot and Bonus Meter payouts are not multiplied.
                  </Text>
                </View>

                {/* Mega Jackpot */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.jackpot, '10'),
                      borderColor: hexWithAlpha(t.jackpot, '40'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.jackpot }]}>Mega Jackpot</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Land 5 Lucky Sevens (or Wilds) across the middle payline to win a flat{' '}
                    <Text style={{ fontWeight: '800', color: t.jackpot }}>$250,000</Text>{' '}
                    virtual coin jackpot — the biggest single-spin prize in SpinVault. Same prize regardless of bet size.
                  </Text>
                  <View style={styles.demoRow}>
                    {['7️⃣', '7️⃣', '7️⃣', '7️⃣', '7️⃣'].map((em, i) => (
                      <Text key={i} style={styles.demoEmoji}>
                        {em}
                      </Text>
                    ))}
                  </View>
                </View>

                {/* Jackpot Mode */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.gold, '0E'),
                      borderColor: hexWithAlpha(t.gold, '40'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.gold }]}>Jackpot Mode</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    When all 5 center-row positions show Lucky Seven{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>or Wild ★</Text>
                    {', '}Jackpot Mode activates and pays on top of your normal payline wins.{'\n\n'}
                    <Text style={{ fontWeight: '700', color: t.textPrimary }}>Standard bets ($10–$10K):{' '}</Text>
                    <Text style={{ fontWeight: '800', color: t.gold }}>$250,000</Text>
                    {' '}flat prize.{'\n'}
                    <Text style={{ fontWeight: '700', color: t.textPrimary }}>Whale bets ($1M+):{' '}</Text>
                    <Text style={{ fontWeight: '800', color: t.gold }}>bet × 25</Text>
                    {' '}— e.g. $1M bet → $25M jackpot, $100M bet → $2.5B jackpot.
                  </Text>
                </View>

                {/* Bonus Meter */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.primary, '0C'),
                      borderColor: hexWithAlpha(t.primary, '30'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.primary }]}>Bonus Meter</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Fills every spin — <Text style={{ fontWeight: '800', color: t.textPrimary }}>+10%</Text> on a winning spin,{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>+2%</Text> on a non-winning spin.
                    Reach 100% to claim a bonus coin reward.
                  </Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Bonus reward = your bet × 8 (minimum 350, maximum 5,000 virtual coins).
                    Higher bets earn larger bonus payouts.
                  </Text>
                </View>

                {/* Auto Spin */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.primary, '0A'),
                      borderColor: hexWithAlpha(t.primary, '28'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.primary }]}>Auto Spin</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Tap{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>Auto</Text> on the
                    Play screen to run{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>50 spins</Text>{' '}
                    automatically at your current bet. Auto Spin stops early if your balance runs
                    out or a Free Spin session begins.
                  </Text>
                </View>

                {/* Bet Range */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.primary, '06'),
                      borderColor: hexWithAlpha(t.border, 'FF'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.textPrimary }]}>Bet Range</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Bets per spin: 10 · 25 · 50 · 100 · 250 · 500 virtual coins.{'\n'}
                    Free Spins always spin at 250 coins per line at no cost to you.
                  </Text>
                </View>

                {/* Win Types */}
                <Text style={[styles.section, { color: t.textMuted, marginTop: 8 }]}>
                  Win Types
                </Text>
                <View
                  style={[
                    styles.winTable,
                    { borderColor: t.border, backgroundColor: hexWithAlpha(t.card, 'CC') },
                  ]}
                >
                  {WIN_TYPES.map(({ label, range, colorKey }) => (
                    <View key={label} style={[styles.winRow, { borderColor: t.border }]}>
                      <Text style={[styles.winLabel, { color: t[colorKey] }]}>{label}</Text>
                      <Text style={[styles.winRange, { color: t.textSecondary }]}>{range}</Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.body, { color: t.textMuted, marginTop: 8, fontSize: 11 }]}>
                  All amounts are virtual coins. No real-money payouts.
                </Text>
              </>
            )}
          </AppScrollView>

          <AppButton label="Close" onPress={onClose} style={styles.closeBtn} />
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderWidth: 1,
    // A concrete height (not just maxHeight) lets the flex:1 ScrollView
    // resolve its size. '80%' leaves safe-area breathing room at the top.
    height: '80%',
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '900' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13, fontWeight: '700' },

  // ScrollView — flex: 1 fills the sheet's remaining height
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 12, paddingBottom: 24 },

  // Shared row layout
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emoji: { fontSize: 26, width: 32, textAlign: 'center' },
  name: { fontWeight: '700', fontSize: 14 },
  meta: { fontSize: 12, marginTop: 1 },
  val: { fontWeight: '900', fontSize: 16 },
  section: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  body: { lineHeight: 20, fontSize: 13 },

  // Payout table
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
    marginBottom: 2,
  },
  payoutHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    width: 52,
    textAlign: 'center',
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  payoutSymbolCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payoutName: { fontWeight: '700', fontSize: 13, flexShrink: 1 },
  payoutVal: { fontSize: 12, fontWeight: '800', width: 52, textAlign: 'center' },

  // Info callout (gold note box)
  infoCallout: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 12,
    gap: 4,
  },
  infoCalloutText: { fontWeight: '800', fontSize: 13 },

  // Special symbols
  specialBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialEmoji: { fontSize: 18, fontWeight: '900' },

  // Paylines tab
  paylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  lineBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBadgeNum: { fontSize: 12, fontWeight: '900' },

  // Bonus tab
  bonusCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  bonusCardTitle: { fontSize: 16, fontWeight: '800' },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  demoEmoji: { fontSize: 20 },
  demoEq: { fontSize: 15, fontWeight: '700', marginHorizontal: 4 },
  demoResult: { fontSize: 13, fontWeight: '900' },

  winTable: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  winRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  winLabel: { fontWeight: '800', fontSize: 14 },
  winRange: { fontSize: 12 },

  closeBtn: { marginVertical: 16 },
})
