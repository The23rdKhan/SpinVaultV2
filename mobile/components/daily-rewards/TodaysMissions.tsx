import { StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import Toast from 'react-native-toast-message'
import { AppButton } from '@/components/ui/AppButton'
import { useGame } from '@/lib/game-context'
import { useHaptics } from '@/lib/use-haptics'
import { useCasinoTheme } from '@/lib/use-casino-theme'

const MISSION_ICONS: Record<string, keyof typeof FontAwesome.glyphMap> = {
  spin20: 'bolt',
  win5: 'trophy',
  maxbet1: 'star',
}

export function TodaysMissions() {
  const t = useCasinoTheme()
  const { missions, claimMissionReward } = useGame()
  const { claimTap } = useHaptics()

  const completedCount = missions.filter((m) => m.completed).length
  // Show the "all done" banner only while missions are completed but not yet all claimed.
  const allCompleted =
    missions.length > 0 &&
    missions.every((m) => m.completed) &&
    !missions.every((m) => m.claimed)

  return (
    <View style={[styles.panel, { borderColor: t.border, backgroundColor: t.card }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <FontAwesome name="bullseye" size={18} color={t.primary} />
          <Text style={[styles.title, { color: t.foreground }]}>Today&apos;s Missions</Text>
        </View>
        <Text style={[styles.count, { color: t.mutedForeground }]}>
          {completedCount}/{missions.length} complete
        </Text>
      </View>

      <View style={styles.list}>
        {missions.map((mission) => {
          const iconName = MISSION_ICONS[mission.id] ?? 'bullseye'
          const progress = Math.min(mission.progress, mission.target)
          const pct = mission.target > 0 ? (progress / mission.target) * 100 : 0

          return (
            <View
              key={mission.id}
              style={[
                styles.row,
                {
                  borderColor:
                    mission.completed && !mission.claimed ? t.win : t.cabinetBorder,
                  backgroundColor:
                    mission.completed && !mission.claimed ? `${t.win}18` : `${t.cabinetBg}88`,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: mission.completed ? `${t.win}33` : `${t.primary}33`,
                  },
                ]}
              >
                {mission.claimed ? (
                  <FontAwesome name="check" size={18} color={t.win} />
                ) : (
                  <FontAwesome name={iconName} size={18} color={mission.completed ? t.win : t.primary} />
                )}
              </View>

              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.name,
                      { color: t.foreground },
                      mission.claimed && { color: t.mutedForeground, textDecorationLine: 'line-through' },
                    ]}
                    numberOfLines={1}
                  >
                    {mission.name}
                  </Text>
                  <View style={styles.rewardPill}>
                    <FontAwesome name="bitcoin" size={11} color={t.primary} />
                    <Text style={[styles.rewardTxt, { color: t.foreground }]}>{mission.reward}</Text>
                  </View>
                </View>
                <Text style={[styles.desc, { color: t.mutedForeground }]}>{mission.description}</Text>
                <View style={styles.progressRow}>
                  <View style={[styles.track, { backgroundColor: t.muted }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${pct}%`,
                          backgroundColor: mission.completed ? t.win : t.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressTxt, { color: t.mutedForeground }]}>
                    {progress}/{mission.target}
                  </Text>
                </View>
              </View>

              {mission.completed && !mission.claimed ? (
                <AppButton
                  size="sm"
                  label="Claim"
                  onPress={() => {
                    void (async () => {
                      const ok = await claimMissionReward(mission.id)
                      if (ok) {
                        claimTap()
                        Toast.show({ type: 'success', text1: 'Reward claimed' })
                      } else {
                        Toast.show({ type: 'error', text1: 'Could not claim reward' })
                      }
                    })()
                  }}
                  style={styles.claimBtn}
                  accessibilityLabel={`Claim reward for ${mission.name}`}
                />
              ) : null}
            </View>
          )
        })}
      </View>

      {allCompleted ? (
        <View style={[styles.doneBanner, { borderColor: `${t.win}55` }]}>
          <Text style={[styles.doneTitle, { color: t.win }]}>All missions completed!</Text>
          <Text style={[styles.doneSub, { color: t.mutedForeground }]}>New missions tomorrow</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '800' },
  count: { fontSize: 12 },
  list: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: { flex: 1, fontSize: 14, fontWeight: '700' },
  rewardPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardTxt: { fontSize: 12, fontWeight: '800' },
  desc: { fontSize: 12, marginBottom: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 6, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  progressTxt: { fontSize: 10, width: 48, textAlign: 'right' },
  claimBtn: { alignSelf: 'center' },
  doneBanner: {
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  doneTitle: { fontSize: 14, fontWeight: '800' },
  doneSub: { fontSize: 12, marginTop: 4 },
})
