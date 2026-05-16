import type { ReactNode } from 'react'
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useAppearance } from '@/lib/appearance-context'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'

const AUTH_BACKGROUND_DARK = require('@/assets/backgrounds/auth-background-dark.png') as ImageSourcePropType
const AUTH_BACKGROUND_LIGHT = require('@/assets/backgrounds/auth-background-light.png') as ImageSourcePropType
const VAULT_COIN = require('@/assets/icons/vault-coin.png') as ImageSourcePropType

export function AuthBackgroundLayout({
  children,
  contentStyle,
}: {
  children: ReactNode
  contentStyle?: StyleProp<ViewStyle>
}) {
  const t = useCasinoTheme()
  const { resolvedMode } = useAppearance()
  const source = resolvedMode === 'dark' ? AUTH_BACKGROUND_DARK : AUTH_BACKGROUND_LIGHT

  return (
    <ImageBackground source={source} resizeMode="cover" style={styles.background}>
      <View style={[styles.scrim, { backgroundColor: resolvedMode === 'dark' ? '#020409A8' : '#FFF8EACC' }]}>
        <View style={[styles.content, contentStyle, { backgroundColor: hexWithAlpha(t.card, resolvedMode === 'dark' ? 'E6' : 'F2') }]}>
          {children}
        </View>
      </View>
    </ImageBackground>
  )
}

export function OnboardingHeroImage({
  source,
  accessibilityLabel,
  compact,
}: {
  source: ImageSourcePropType
  accessibilityLabel: string
  compact?: boolean
}) {
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={[styles.heroImage, compact && styles.heroImageCompact]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    />
  )
}

export function FeatureCard({
  title,
  body,
  image,
}: {
  title: string
  body: string
  image: ImageSourcePropType
}) {
  const t = useCasinoTheme()
  return (
    <View style={[styles.featureCard, { backgroundColor: t.surfaceElevated, borderColor: t.border }]}>
      <Image source={image} resizeMode="contain" style={styles.featureIcon} />
      <View style={styles.featureCopy}>
        <Text style={[styles.featureTitle, { color: t.textPrimary }]}>{title}</Text>
        <Text style={[styles.featureBody, { color: t.textSecondary }]}>{body}</Text>
      </View>
    </View>
  )
}

export function VaultCoinIcon({ size = 24 }: { size?: number }) {
  return (
    <Image
      source={VAULT_COIN}
      resizeMode="contain"
      style={{ width: size, height: size }}
      accessibilityLabel="Vault Coins"
      accessibilityRole="image"
    />
  )
}

export function StorePackCard({
  artwork,
  title,
  details,
  priceLabel,
  badge,
  featured,
  disabled,
  onPress,
  onPreview,
  style,
}: {
  artwork: ImageSourcePropType
  title: string
  details: string[]
  priceLabel: string
  badge?: string
  featured?: boolean
  disabled?: boolean
  onPress: () => void
  onPreview?: () => void
  style?: StyleProp<ViewStyle>
}) {
  const t = useCasinoTheme()
  return (
    <View
      style={[
        styles.storeCard,
        {
          backgroundColor: t.surfaceElevated,
          borderColor: featured ? t.gold : t.border,
          shadowColor: featured ? t.gold : t.shadow,
        },
        style,
      ]}
    >
      {badge ? (
        <View style={[styles.storeBadge, { backgroundColor: featured ? t.gold : t.primary }]}>
          <Text style={[styles.storeBadgeText, { color: featured ? '#1A1200' : t.primaryForeground }]}>
            {badge}
          </Text>
        </View>
      ) : null}
      <Pressable
        onPress={onPreview}
        accessibilityRole={onPreview ? 'button' : 'image'}
        accessibilityLabel={`${title} artwork`}
        style={styles.storeArtworkPress}
      >
        <ImageBackground
          source={artwork}
          resizeMode="cover"
          imageStyle={styles.storeArtworkImage}
          style={styles.storeArtwork}
        >
          <View style={styles.storePriceSlot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Buy ${title} for ${priceLabel}`}
              accessibilityState={{ disabled: !!disabled }}
              disabled={disabled}
              onPress={onPress}
              style={({ pressed }) => [
                styles.priceButton,
                {
                  backgroundColor: featured ? t.gold : t.primary,
                  opacity: disabled ? 0.55 : pressed ? 0.88 : 1,
                },
              ]}
            >
              <Text style={[styles.priceText, { color: featured ? '#1A1200' : t.primaryForeground }]}>
                {priceLabel}
              </Text>
            </Pressable>
          </View>
        </ImageBackground>
      </Pressable>
      <Text style={[styles.storeTitle, { color: featured ? t.gold : t.textPrimary }]} numberOfLines={2}>
        {title}
      </Text>
      {details.map((detail) => (
        <Text key={detail} style={[styles.storeDetail, { color: t.textSecondary }]} numberOfLines={1}>
          {detail}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scrim: { flex: 1, padding: 24, justifyContent: 'center' },
  content: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  heroImage: {
    alignSelf: 'center',
    width: '100%',
    height: 190,
  },
  heroImageCompact: {
    height: 112,
  },
  featureCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 54,
    height: 54,
  },
  featureCopy: {
    flex: 1,
    minWidth: 0,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  featureBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  storeCard: {
    flexBasis: '48%',
    maxWidth: '48%',
    borderRadius: 14,
    borderWidth: 2,
    padding: 10,
    gap: 6,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  storeBadge: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    minHeight: 20,
  },
  storeBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  storeArtworkPress: {
    width: '100%',
  },
  storeArtwork: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'flex-end',
  },
  storeArtworkImage: {
    borderRadius: 12,
  },
  storePriceSlot: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  priceButton: {
    minHeight: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '900',
  },
  storeTitle: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  storeDetail: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
})
