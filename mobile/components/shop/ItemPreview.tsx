import { StyleSheet, Text, View } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { LinearGradient } from 'expo-linear-gradient'
import type { VanityItem } from '@/lib/vanity-data'
import { rarityPresentation } from '@/lib/rarity-from-theme'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'

type PreviewSize = 'sm' | 'md'

function petEmoji(previewImage: string): string {
  switch (previewImage) {
    case 'cat':
      return '🐱'
    case 'dragon':
      return '🐉'
    case 'phoenix':
      return '🔥'
    case 'unicorn':
      return '🦄'
    case 'robot':
      return '🤖'
    case 'celestial':
      return '✨'
    default:
      return '—'
  }
}

function roomEmoji(previewImage: string): string {
  switch (previewImage) {
    case 'casino-floor':
      return '🎰'
    case 'penthouse':
      return '🏙️'
    case 'yacht':
      return '🛥️'
    case 'space-station':
      return '🚀'
    case 'underwater':
      return '🌊'
    case 'volcano':
      return '🌋'
    default:
      return '🌌'
  }
}

function carEmoji(previewImage: string): string {
  switch (previewImage) {
    case 'sedan':
      return '🚗'
    case 'sports':
    case 'hypercar':
      return '🏎️'
    case 'supercar':
      return '🚙'
    case 'vintage':
      return '🚘'
    case 'limo':
      return '🚐'
    default:
      return '🛸'
  }
}

function cabinetGradient(t: ReturnType<typeof useCasinoTheme>, previewImage: string): [string, string] {
  switch (previewImage) {
    case 'gold':
      return [t.gold, hexWithAlpha(t.accent, 'EE')]
    case 'neon':
      return [t.freeSpin, t.bonus]
    case 'royal':
      return [hexWithAlpha(t.bonus, 'EE'), hexWithAlpha(t.bonus, '99')]
    case 'cosmic':
      return [t.primarySoft, t.accent]
    case 'diamond':
      return [t.surfaceElevated, t.card]
    case 'void':
      return [t.background, t.surfaceElevated]
    default:
      return [t.destructive, hexWithAlpha(t.destructive, 'AA')]
  }
}

export function ItemPreview({ item, size = 'md' }: { item: VanityItem; size?: PreviewSize }) {
  const t = useCasinoTheme()
  const rarity = rarityPresentation(t, item.rarity)
  const sm = size === 'sm'

  switch (item.category) {
    case 'avatar':
      return (
        <View
          style={[
            styles.avatarRing,
            sm ? styles.avatarSm : styles.avatarMd,
            { borderColor: rarity.border },
          ]}
        >
          <LinearGradient
            colors={[hexWithAlpha(t.primary, '44'), hexWithAlpha(t.accent, '44')]}
            style={styles.avatarFill}
          >
            <FontAwesome name="user" size={sm ? 16 : 20} color={rarity.text} />
          </LinearGradient>
        </View>
      )
    case 'frame':
      return (
        <View
          style={[
            styles.frameOuter,
            sm ? styles.frameSm : styles.frameMd,
            { borderColor: rarity.border, backgroundColor: t.cardSoft },
          ]}
        >
          <FontAwesome name="user" size={sm ? 12 : 14} color={t.textMuted} />
        </View>
      )
    case 'title':
      return (
        <Text style={[styles.titleText, sm && styles.titleSm, { color: rarity.text }]} numberOfLines={2}>
          {item.previewImage}
        </Text>
      )
    case 'pet':
      return <Text style={sm ? styles.emojiSm : styles.emojiMd}>{petEmoji(item.previewImage)}</Text>
    case 'cabinet': {
      const g = cabinetGradient(t, item.previewImage)
      return (
        <LinearGradient
          colors={g}
          style={[
            styles.cabinet,
            sm ? styles.cabinetSm : styles.cabinetMd,
            { borderColor: hexWithAlpha(t.border, '66') },
          ]}
        >
          <View />
        </LinearGradient>
      )
    }
    case 'room':
      return <Text style={sm ? styles.emojiSm : styles.emojiMd}>{roomEmoji(item.previewImage)}</Text>
    case 'car':
      return <Text style={sm ? styles.emojiSm : styles.emojiMd}>{carEmoji(item.previewImage)}</Text>
    case 'badge': {
      const fa =
        item.previewImage === 'star'
          ? 'star'
          : item.previewImage === 'spin'
            ? 'repeat'
            : item.previewImage === 'crown'
              ? 'star'
              : item.previewImage === 'trophy'
                ? 'trophy'
                : item.previewImage === 'coins'
                  ? 'circle'
                  : 'star'
      return (
        <View style={[styles.badge, { borderColor: rarity.border, backgroundColor: rarity.bg }]}>
          <FontAwesome name={fa} size={sm ? 16 : 20} color={rarity.text} />
        </View>
      )
    }
    default:
      return <FontAwesome name="star" size={sm ? 18 : 22} color={rarity.text} />
  }
}

const styles = StyleSheet.create({
  avatarRing: {
    borderRadius: 999,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarSm: { width: 36, height: 36 },
  avatarMd: { width: 44, height: 44 },
  avatarFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frameOuter: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameSm: { width: 36, height: 36, borderWidth: 3 },
  frameMd: { width: 44, height: 44, borderWidth: 4 },
  titleText: { fontWeight: '800', textAlign: 'center', maxWidth: 72 },
  titleSm: { fontSize: 11 },
  emojiSm: { fontSize: 22 },
  emojiMd: { fontSize: 28 },
  cabinet: { borderRadius: 6, borderWidth: 2 },
  cabinetSm: { width: 28, height: 40 },
  cabinetMd: { width: 36, height: 52 },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
