import { useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { LinearGradient } from 'expo-linear-gradient'
import { AppButton } from '@/components/ui/AppButton'
import { useGame, type Theme } from '@/lib/game-context'
import { THEME_CONFIGS, type ThemeConfig } from '@/lib/theme-config'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'

const EXTRA_THEMES = ['cyber', 'treasure'] as const

function themeCardGradient(
  t: ReturnType<typeof useCasinoTheme>,
  themeId: (typeof EXTRA_THEMES)[number],
): [string, string] {
  if (themeId === 'cyber') {
    return [t.surfaceElevated, hexWithAlpha(t.freeSpin, '55')]
  }
  return [t.surfaceElevated, hexWithAlpha(t.gold, '55')]
}

export function ThemeUnlockCards({
  onMessage,
}: {
  onMessage: (msg: string) => void
}) {
  const t = useCasinoTheme()
  const { coins, ownedThemes, currentTheme, buyTheme, setTheme } = useGame()
  const [preview, setPreview] = useState<ThemeConfig | null>(null)

  const unlock = (themeId: Theme) => {
    void (async () => {
      const cfg = THEME_CONFIGS[themeId]
      if (ownedThemes.includes(themeId)) {
        setTheme(themeId)
        onMessage(`${cfg.name} equipped`)
        return
      }
      const ok = await buyTheme(themeId, cfg.price)
      if (ok) {
        setTheme(themeId)
        onMessage(`${cfg.name} unlocked`)
      } else {
        onMessage('Not enough coins')
      }
    })()
  }

  return (
    <>
      <View style={styles.sectionHead}>
        <FontAwesome name="paint-brush" size={18} color={t.primary} />
        <Text style={[styles.h2, { color: t.textPrimary }]}>Theme unlocks</Text>
      </View>

      {EXTRA_THEMES.map((themeId) => {
        const config = THEME_CONFIGS[themeId]
        const isOwned = ownedThemes.includes(themeId)
        const isActive = currentTheme === themeId
        const coinsNeeded = Math.max(0, config.price - coins)
        const grad = themeCardGradient(t, themeId)

        return (
          <LinearGradient
            key={themeId}
            colors={[hexWithAlpha(grad[0], 'CC'), hexWithAlpha(grad[1], '44')]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.themeCard,
              {
                borderColor: isActive ? t.primary : t.border,
                borderWidth: isActive ? 2 : 1,
              },
            ]}
          >
            <View style={styles.themeHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeName, { color: t.textPrimary }]}>{config.name}</Text>
                <Text style={[styles.themeDesc, { color: t.textSecondary }]}>
                  {config.description}
                </Text>
              </View>
              {isActive ? (
                <View
                  style={[
                    styles.activePill,
                    {
                      borderColor: hexWithAlpha(t.primary, '88'),
                      backgroundColor: hexWithAlpha(t.overlay, '22'),
                    },
                  ]}
                >
                  <Text style={[styles.activePillTxt, { color: t.primary }]}>Active</Text>
                </View>
              ) : null}
            </View>

            <View style={{ gap: 6, marginBottom: 12 }}>
              {config.unlocks.map((line, i) => (
                <Text key={i} style={[styles.unlockLine, { color: t.textMuted }]}>
                  {line}
                </Text>
              ))}
            </View>

            <View style={{ marginBottom: 12 }}>
              {isOwned ? (
                <View style={styles.statusRow}>
                  <FontAwesome name="check" size={14} color={t.primary} />
                  <Text style={[styles.statusTxt, { color: t.primary }]}>Unlocked</Text>
                </View>
              ) : coinsNeeded > 0 ? (
                <View style={styles.statusRow}>
                  <FontAwesome name="lock" size={12} color={t.textMuted} />
                  <Text style={[styles.needCoins, { color: t.textSecondary }]}>
                    You need{' '}
                    <Text style={{ fontWeight: '900', color: t.gold }}>
                      {coinsNeeded.toLocaleString()}
                    </Text>{' '}
                    virtual coins
                  </Text>
                </View>
              ) : (
                <Text style={[styles.statusTxt, { color: t.primary }]}>Ready to unlock</Text>
              )}
            </View>

            <View style={styles.btnRow}>
              <AppButton
                variant="outline"
                label="Preview"
                onPress={() => setPreview(config)}
                style={{ flex: 1 }}
              />
              {!isOwned && coinsNeeded <= 0 ? (
                <AppButton
                  label={`Unlock · ${config.price.toLocaleString()} virtual coins`}
                  onPress={() => unlock(themeId)}
                  style={{ flex: 1 }}
                />
              ) : null}
              {isOwned && !isActive ? (
                <AppButton label="Equip" onPress={() => unlock(themeId)} style={{ flex: 1 }} />
              ) : null}
            </View>
          </LinearGradient>
        )
      })}

      <Modal visible={preview != null} animationType="slide" transparent>
        <View style={[styles.modalBackdrop, { backgroundColor: t.overlay }]}>
          <View style={[styles.modalCard, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}>
            <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.modalTitle, { color: t.textPrimary }]}>{preview?.name}</Text>
              <Pressable onPress={() => setPreview(null)} hitSlop={12}>
                <FontAwesome name="times" size={22} color={t.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
              {preview ? (
                <>
                  <LinearGradient
                    colors={[t.surface, t.cardSoft]}
                    style={[styles.previewCabinet, { borderColor: t.border }]}
                  >
                    <View style={styles.previewReels}>
                      {preview.symbolSet.slice(0, 3).map((sym, i) => (
                        <View
                          key={i}
                          style={[
                            styles.previewCell,
                            {
                              borderColor: hexWithAlpha(t.border, '88'),
                              backgroundColor: hexWithAlpha(t.surfaceElevated, '44'),
                            },
                          ]}
                        >
                          <Text style={styles.previewSym}>{sym}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.jackpotLbl, { color: t.primary }]}>
                      {preview.jackpotName}
                    </Text>
                  </LinearGradient>

                  <View>
                    <Text style={[styles.lbl, { color: t.textMuted }]}>INCLUDES</Text>
                    {preview.unlocks.map((u, i) => (
                      <Text key={i} style={[styles.incLine, { color: t.textPrimary }]}>
                        {u}
                      </Text>
                    ))}
                  </View>

                  <View>
                    <Text style={[styles.lbl, { color: t.textMuted }]}>CUSTOMIZATIONS</Text>
                    <Text style={[styles.dlRow, { color: t.textPrimary }]}>
                      Bonus: <Text style={{ fontWeight: '800' }}>{preview.bonusName}</Text>
                    </Text>
                    <Text style={[styles.dlRow, { color: t.textPrimary }]}>
                      Wild: {preview.wildIcon} {preview.wildName}
                    </Text>
                    <Text style={[styles.dlRow, { color: t.textPrimary }]}>
                      Scatter: {preview.scatterIcon} {preview.scatterName}
                    </Text>
                  </View>
                </>
              ) : null}
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: t.border }]}>
              <AppButton label="Close" variant="outline" onPress={() => setPreview(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  h2: { fontSize: 18, fontWeight: '900' },
  themeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  themeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  themeName: { fontSize: 17, fontWeight: '900' },
  themeDesc: { fontSize: 11, marginTop: 4, lineHeight: 15 },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  activePillTxt: { fontSize: 10, fontWeight: '900' },
  unlockLine: { fontSize: 11, lineHeight: 15 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusTxt: { fontSize: 13, fontWeight: '800' },
  needCoins: { fontSize: 13 },
  btnRow: { flexDirection: 'row', gap: 8 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 2,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '900', flex: 1 },
  modalBody: { paddingHorizontal: 14, paddingTop: 14, maxHeight: 360 },
  modalFooter: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth },
  previewCabinet: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  previewReels: { flexDirection: 'row', gap: 6 },
  previewCell: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSym: { fontSize: 22 },
  jackpotLbl: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  lbl: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  incLine: { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  dlRow: { fontSize: 12, marginBottom: 6 },
})
