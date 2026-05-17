import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import { BONUS_METER_XP, DAILY_STREAK_FREE_SPINS_PER_CLAIM, SYMBOLS, xpForLevel } from '@/lib/game-context'
import {
  BET_OPTIONS,
  JACKPOT_BASE_PAYOUT,
  SCATTER_PAYOUT_MULTIPLIERS,
  bonusMeterPayoutForBet,
} from '@shared/slot/evaluate-spin'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'
import { AppButton } from '@/components/ui/AppButton'
import { AppScrollView } from '@/components/ui/AppScrollView'
import { JACKPOT_MODE_LABEL, getWinTierPaytableRows } from '@/lib/vault-copy'
import { SlotSymbolAsset } from './SlotSymbol'

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
function rewardMultipliers(value: number) {
  const fmt = (n: number) => (n % 1 === 0 ? `${n}×` : `${n.toFixed(1)}×`)
  return {
    m3: fmt(value / 10),
    m4: fmt((value * 2.5) / 10),
    m5: fmt((value * 5) / 10),
  }
}

const WIN_TYPES_REWARD_TABLE = getWinTierPaytableRows()

interface Props {
  open: boolean
  onClose: () => void
}

export function InfoModal({ open, onClose }: Props) {
  const t = useCasinoTheme()
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<Tab>('symbols')

  const regular = SYMBOLS.filter((s) => !s.isWild && !s.isScatter)
  const special = SYMBOLS.filter((s) => s.isWild === true || s.isScatter === true)
  const scatterSymbol = SYMBOLS.find((s) => s.isScatter === true)

  const betList = BET_OPTIONS.map((b) => b.toLocaleString()).join(' · ')
  const xpBarL1 = xpForLevel(1).toLocaleString()
  const xpBarL30 = xpForLevel(30).toLocaleString()

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalFill}>
        {/* Backdrop blur */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}>
          <BlurView
            intensity={45}
            tint="dark"
            blurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/*
          Do not wrap the sheet in the same Pressable as "tap outside" — that steals
          scroll gestures. Backdrop is a sibling behind the sheet; sheet receives pans.
        */}
        <View style={styles.modalStack} pointerEvents="box-none">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close game info"
          />
          <View
            style={[styles.sheet, { backgroundColor: t.surfaceElevated, borderColor: t.border }]}
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
                {/* Reward table header */}
                <View style={[styles.payoutHeader, { borderColor: t.border }]}>
                  <Text style={[styles.payoutHeaderCell, { color: t.textMuted, flex: 1 }]}>Symbol</Text>
                  <Text style={[styles.payoutHeaderCell, { color: t.textMuted }]}>3 match</Text>
                  <Text style={[styles.payoutHeaderCell, { color: t.textMuted }]}>4 match</Text>
                  <Text style={[styles.payoutHeaderCell, { color: t.textMuted }]}>5 match</Text>
                </View>

                <Text style={[styles.section, { color: t.textMuted, marginTop: 4 }]}>Paying Symbols</Text>
                {regular.map((s) => {
                  const { m3, m4, m5 } = rewardMultipliers(s.value)
                  return (
                    <View key={s.id} style={[styles.payoutRow, { borderColor: t.border }]}>
                      <View style={styles.payoutSymbolCell}>
                        {s.asset ? (
                          <SlotSymbolAsset symbol={s} size={28} />
                        ) : (
                          <Text style={[styles.emoji, { color: t.textPrimary }]}>{s.emoji}</Text>
                        )}
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
                      {s.asset ? (
                        <SlotSymbolAsset symbol={s} size={30} />
                      ) : (
                        <Text style={[styles.specialEmoji, { color: s.isWild ? t.win : t.gold }]}>
                          {s.emoji}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: s.isWild ? t.win : t.gold }]}>
                        {s.name}
                      </Text>
                      <Text style={[styles.meta, { color: t.textSecondary }]}>
                        {s.isWild
                          ? 'Wild Logo substitutes for any symbol except Scatter Chest. Can appear on any reel, including the first. Five Wild Logos alone do not award Vault Coins.'
                          : '2+ Scatter Chests anywhere award Vault Coins (2×, 5×, 20×, or 100× your bet). 3+ also triggers 10 Free Spins. No payline needed.'}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Pointer to Bonus tab for center-row jackpot */}
                <View style={[styles.infoCallout, { backgroundColor: hexWithAlpha(t.gold, '0E'), borderColor: hexWithAlpha(t.gold, '40') }]}>
                  <Text style={[styles.infoCalloutText, { color: t.gold }]}>Center-row jackpot</Text>
                  <Text style={[styles.meta, { color: t.textSecondary }]}>
                    Five Lucky Sevens or Wilds on the <Text style={{ fontWeight: '700', color: t.textPrimary }}>middle row</Text> (payline 1) triggers Jackpot Mode. Full rules: <Text style={{ fontWeight: '800', color: t.gold }}>Bonus · Jackpot Mode (center row)</Text> — prize is the greater of{' '}
                    <Text style={{ fontWeight: '800', color: t.gold }}>{JACKPOT_BASE_PAYOUT.toLocaleString()} Vault Coins</Text> and your line bet × 25.
                  </Text>
                </View>
              </>
            )}

            {/* ── PAYLINES ── */}
            {activeTab === 'paylines' && (
              <>
                <Text style={[styles.body, { color: t.textSecondary, marginBottom: 12 }]}>
                  Nine fixed paths (rows, V-shapes, diagonals, bumps). You need 3 or more matching symbols along a path,
                  starting from the left reel, paying left-to-right only. Wild helps complete runs for paying symbols;
                  scatter does not substitute on paylines — it pays separately from anywhere on the grid (see Bonus tab).
                </Text>
                <Text style={[styles.body, { color: t.textSecondary }]}>
                  Open the <Text style={{ fontWeight: '800', color: t.textPrimary }}>Lines</Text> control on the Play screen to step through each path with a diagram. That modal is the source of truth for shapes; this tab stays short on purpose to avoid duplicate lists.
                </Text>
              </>
            )}

            {/* ── BONUS ── */}
            {activeTab === 'bonus' && (
              <>
                {/* Scatter — Vault Coins + free spins */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.freeSpin, '10'),
                      borderColor: hexWithAlpha(t.freeSpin, '40'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.freeSpin }]}>Scatter Rewards</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Scatter symbols award Vault Coins based on how many land anywhere on the reels — no payline required.
                    3 or more also trigger Free Spins. Both rewards stack.
                  </Text>

                  {/* Scatter payout table */}
                  <View style={[styles.payoutHeader, { borderColor: t.border, marginTop: 8 }]}>
                    <Text style={[styles.payoutHeaderCell, { color: t.textMuted, flex: 1 }]}>Scatters</Text>
                    <Text style={[styles.payoutHeaderCell, { color: t.textMuted, width: 72, textAlign: 'right' }]}>VC</Text>
                    <Text style={[styles.payoutHeaderCell, { color: t.textMuted, width: 96, textAlign: 'right' }]}>Free Spins</Text>
                  </View>
                  {([2, 3, 4, 5] as const).map((count) => {
                    const mult = SCATTER_PAYOUT_MULTIPLIERS[count] ?? 0
                    return (
                      <View key={count} style={[styles.payoutRow, { borderColor: t.border }]}>
                        <View style={[styles.payoutSymbolCell, { flex: 1 }]}>
                          {Array.from({ length: count }).map((_, i) => (
                            scatterSymbol ? (
                              <SlotSymbolAsset key={i} symbol={scatterSymbol} size={22} />
                            ) : (
                              <Text key={i} style={[styles.emoji, { color: t.freeSpin }]}>✦</Text>
                            )
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
                    Scatter Vault Coins are awarded in addition to any payline rewards on the same spin.
                    Free spins use your current bet at no cost, so bigger bets mean bigger free spin rewards.
                  </Text>
                  <Text style={[styles.meta, { color: t.textMuted, marginTop: 6, fontSize: 11 }]}>
                    6 or more scatters still use the 5-scatter Vault Coin tier (100× bet) and still award +10 free spins — counts above 5 are capped for reward math.
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
                    spins build a streak multiplier that boosts your next spin's win total (Bonus Meter Vault Coins stay separate):
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
                    Bonus Meter Vault Coins are awarded separately and are not multiplied by the streak.
                  </Text>
                  <Text style={[styles.meta, { color: t.textMuted, marginTop: 4 }]}>
                    Free spins do not grant XP toward your level (paid spins do).
                  </Text>
                  <Text style={[styles.meta, { color: t.textMuted, marginTop: 4, fontSize: 11 }]}>
                    Streak multipliers apply on device; server-backed spins may not use the same streak yet.
                  </Text>
                </View>

                {/* Center-row jackpot (Jackpot Mode / Mega Jackpot win label) */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.gold, '0E'),
                      borderColor: hexWithAlpha(t.gold, '40'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.gold }]}>{JACKPOT_MODE_LABEL} (center row)</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    When all five middle-row positions show Lucky Seven{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>or Wild ★</Text>
                    {', '}you hit Jackpot Mode. The flat center-row prize stacks on your normal payline wins. Your celebration title still follows total return vs bet (Win → Mega Jackpot).
                  </Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Vault Coin reward is the <Text style={{ fontWeight: '800', color: t.textPrimary }}>greater</Text> of a{' '}
                    <Text style={{ fontWeight: '800', color: t.gold }}>{JACKPOT_BASE_PAYOUT.toLocaleString()} Vault Coins</Text> floor and{' '}
                    <Text style={{ fontWeight: '800', color: t.gold }}>your line bet × 25</Text>. Typical line bets hit the floor; very large bets scale up with the same Vault Coin formula.
                  </Text>
                  <View style={styles.demoRow}>
                    {['7️⃣', '7️⃣', '7️⃣', '7️⃣', '7️⃣'].map((em, i) => (
                      <Text key={i} style={styles.demoEmoji}>
                        {em}
                      </Text>
                    ))}
                  </View>
                </View>

                {/* Mystery Multiplier */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.win, '0C'),
                      borderColor: hexWithAlpha(t.win, '35'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.win }]}>Mystery Multiplier</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    On spins that already have a base win result (paylines, Scatter Vault Coins, and/or center-row
                    jackpot reward), there is a small chance the entire base result is multiplied before it
                    is added to your balance. Possible values:{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>2×, 3×, 5×, 8×, or 10×</Text>
                    . Does not apply to the Bonus Meter reward when the meter fills on the same spin.
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
                    Reach 100% to claim a bonus Vault Coin reward.
                  </Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Bonus reward is at least{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>350</Text> Vault Coins and scales as{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>bet × 8</Text> (no upper cap), so
                    higher line bets earn larger meter rewards — e.g. at a 100 Vault Coin bet:{' '}
                    <Text style={{ fontWeight: '800', color: t.primary }}>{bonusMeterPayoutForBet(100).toLocaleString()}</Text> Vault Coins.
                  </Text>
                </View>

                {/* Fast — cosmetic count-up only (ControlDeck) */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.primary, '08'),
                      borderColor: hexWithAlpha(t.primary, '22'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.textPrimary }]}>Fast</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Tap <Text style={{ fontWeight: '800', color: t.textPrimary }}>Fast</Text> next to Info / Lines / Auto
                    to speed up only the <Text style={{ fontWeight: '800', color: t.textPrimary }}>Last Win</Text> coin
                    count-up after a spin. Reel animation timing and reward math are unchanged — it is a display
                    convenience, not a turbo for the slot engine.
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
                    out or a Free Spin session begins. Tap <Text style={{ fontWeight: '800', color: t.textPrimary }}>Stop</Text> while running to cancel the rest.
                  </Text>
                </View>

                {/* Daily streak free spins */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.freeSpin, '0C'),
                      borderColor: hexWithAlpha(t.freeSpin, '33'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.freeSpin }]}>Daily streak</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    On the <Text style={{ fontWeight: '800', color: t.textPrimary }}>Rewards</Text> tab, claiming the next
                    day in your login streak awards Vault Coins and adds{' '}
                    <Text style={{ fontWeight: '800', color: t.freeSpin }}>{DAILY_STREAK_FREE_SPINS_PER_CLAIM} free spins</Text>
                    {' '}(offline / local economy). Cloud saves follow the server wallet — amounts may differ but the
                    streak lives there too.
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
                    Line bets (Vault Coins):{'\n'}
                    {betList}.{'\n'}
                    Higher tiers unlock when your vault holds at least{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>50×</Text> that bet in Vault Coins
                    (starter tiers up to 500 are always available).{'\n\n'}
                    <Text style={{ fontWeight: '700', color: t.textPrimary }}>Free spins</Text> cost no Vault Coins and
                    pay using your <Text style={{ fontWeight: '800', color: t.textPrimary }}>current line bet</Text> — same
                    reward math as a paid spin at that amount.
                  </Text>
                </View>

                {/* Level & XP */}
                <View
                  style={[
                    styles.bonusCard,
                    {
                      backgroundColor: hexWithAlpha(t.primary, '08'),
                      borderColor: hexWithAlpha(t.primary, '28'),
                    },
                  ]}
                >
                  <Text style={[styles.bonusCardTitle, { color: t.textPrimary }]}>Level &amp; XP</Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>Paid spins</Text> earn XP when the
                    reels resolve. <Text style={{ fontWeight: '800', color: t.textPrimary }}>Free spins</Text> do
                    not (they still award Vault Coins normally).
                  </Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Each paid spin grants a{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>base</Text> amount from your line bet
                    (at least 10 XP, plus about 1 XP per 10 Vault Coins bet, up to 500 XP from bet alone), plus a{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>win bonus</Text> when that spin pays
                    Vault Coins: up to 100 XP from the spin win (about 1 XP per 1,000 Vault Coins won on that spin). When the{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>Bonus Meter</Text> fills on the same
                    paid spin, you also get <Text style={{ fontWeight: '800', color: t.primary }}>+{BONUS_METER_XP} XP</Text>.
                  </Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    XP fills your level bar. The amount needed for the{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>next</Text> level grows on a curve
                    (roughly +15% per level). For example, level 1→2 needs about{' '}
                    <Text style={{ fontWeight: '800', color: t.primary }}>{xpBarL1}</Text> XP; level 30→31 needs about{' '}
                    <Text style={{ fontWeight: '800', color: t.primary }}>{xpBarL30}</Text> XP.
                  </Text>
                  <Text style={[styles.body, { color: t.textSecondary }]}>
                    Leveling up always awards <Text style={{ fontWeight: '800', color: t.textPrimary }}>bonus Vault Coins</Text>
                    . Landmark levels 5, 10, 20, 30, 50, 75, and 100 replace the default with larger preset Vault Coin bundles and may add{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>free spins</Text>
                    {' '}(they do <Text style={{ fontWeight: '800', color: t.textPrimary }}>not</Text> stack the small “level × 500” formula on top). Every other level grants{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>level × 500</Text> bonus Vault Coins. Claiming{' '}
                    <Text style={{ fontWeight: '800', color: t.textPrimary }}>missions</Text> and some other rewards can grant bonus XP on top of spins.
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
                  {WIN_TYPES_REWARD_TABLE.map(({ winType, label, range, colorKey }) => (
                    <View key={winType} style={[styles.winRow, { borderColor: t.border }]}>
                      <Text style={[styles.winLabel, { color: t[colorKey] }]}>{label}</Text>
                      <Text style={[styles.winRange, { color: t.textSecondary }]}>{range}</Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.body, { color: t.textMuted, marginTop: 8, fontSize: 11 }]}>
                  Wins below <Text style={{ fontWeight: '700', color: t.textSecondary }}>1×</Text> your line bet still
                  credit Vault Coins; the in-game result uses a compact tally instead of the full “Win” celebration.
                </Text>

                <Text style={[styles.body, { color: t.textMuted, marginTop: 8, fontSize: 11 }]}>
                  <Text style={{ fontWeight: '700', color: t.textSecondary }}>Jackpot</Text> and{' '}
                  <Text style={{ fontWeight: '700', color: t.textSecondary }}>Mega Jackpot</Text> here mean how big
                  the spin paid overall (after mystery multiplier if any). Those titles are not the same as{' '}
                  <Text style={{ fontWeight: '700', color: t.textSecondary }}>{JACKPOT_MODE_LABEL}</Text> (five 7s or Wilds on
                  the middle row — see above).
                </Text>

                <Text style={[styles.body, { color: t.textMuted, marginTop: 8, fontSize: 11 }]}>
                  All amounts are Vault Coins for entertainment only. No cash value.
                </Text>
              </>
            )}
          </AppScrollView>

          <View
            style={[
              styles.sheetFooter,
              { paddingBottom: Math.max(12, insets.bottom + 8), borderTopColor: t.border },
            ]}
          >
            <AppButton label="Close" onPress={onClose} style={styles.closeBtn} />
          </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalFill: {
    flex: 1,
  },
  /** Tap-to-dismiss layer + bottom sheet; sheet is last so it sits above the Pressable. */
  modalStack: {
    flex: 1,
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

  sheetFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  closeBtn: { marginVertical: 8 },
})
