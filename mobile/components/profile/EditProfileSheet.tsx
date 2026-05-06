import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FontAwesome from '@expo/vector-icons/FontAwesome'
// Lazy-load so a missing native module doesn't crash the JS bundle
// while the dev client is being rebuilt.
let ImagePicker: typeof import('expo-image-picker') | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ImagePicker = require('expo-image-picker') as typeof import('expo-image-picker')
} catch {
  ImagePicker = null
}
import { AppButton } from '@/components/ui/AppButton'
import { useCasinoTheme } from '@/lib/use-casino-theme'
import { hexWithAlpha } from '@/theme/tokens'

const MAX_NAME_LEN = 20
const MAX_BIO_LEN = 120

interface Props {
  open: boolean
  onClose: () => void
  /** Current values */
  username: string
  bio: string
  avatarUri: string | null
  isGuest: boolean
  /** Callbacks — only update display labels, no auth/wallet/server logic */
  onSaveName: (name: string) => void
  onSaveBio: (bio: string) => void
  onSaveAvatar: (uri: string | null) => void
}

export function EditProfileSheet({
  open,
  onClose,
  username,
  bio,
  avatarUri,
  isGuest,
  onSaveName,
  onSaveBio,
  onSaveAvatar,
}: Props) {
  const t = useCasinoTheme()
  const insets = useSafeAreaInsets()

  const [name, setName] = useState(username)
  const [bioText, setBioText] = useState(bio)
  const [localAvatar, setLocalAvatar] = useState<string | null>(avatarUri)
  const [pickerBusy, setPickerBusy] = useState(false)

  const nameRef = useRef<TextInput>(null)

  // Reset draft when sheet opens
  useEffect(() => {
    if (open) {
      setName(username)
      setBioText(bio)
      setLocalAvatar(avatarUri)
    }
  }, [open, username, bio, avatarUri])

  const pickerAvailable = ImagePicker !== null

  const pickImage = async (source: 'library' | 'camera') => {
    if (!ImagePicker) return
    setPickerBusy(true)
    try {
      let result: import('expo-image-picker').ImagePickerResult

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') return
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') return
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      }

      if (!result.canceled && result.assets[0]) {
        setLocalAvatar(result.assets[0].uri)
      }
    } finally {
      setPickerBusy(false)
    }
  }

  const handleSave = () => {
    const trimmedName = name.trim()
    if (trimmedName) onSaveName(trimmedName)
    onSaveBio(bioText.trim())
    onSaveAvatar(localAvatar)
    Keyboard.dismiss()
    onClose()
  }

  const handleCancel = () => {
    Keyboard.dismiss()
    onClose()
  }

  const removeAvatar = () => setLocalAvatar(null)

  const nameCharsLeft = MAX_NAME_LEN - name.length
  const bioCharsLeft = MAX_BIO_LEN - bioText.length

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleCancel} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: t.surfaceElevated,
              borderColor: t.border,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: t.muted }]} />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: t.textPrimary }]}>Edit Profile</Text>
              <Pressable
                onPress={handleCancel}
                style={[styles.closeBtn, { backgroundColor: hexWithAlpha(t.muted, '66') }]}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <FontAwesome name="times" size={16} color={t.textMuted} />
              </Pressable>
            </View>

            {/* Avatar picker */}
            <View style={styles.avatarSection}>
              <View style={[styles.avatarRing, { borderColor: t.primary }]}>
                {localAvatar ? (
                  <Image source={{ uri: localAvatar }} style={styles.avatarImg} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: t.cardSoft }]}>
                    <FontAwesome name="user" size={36} color={t.textMuted} />
                  </View>
                )}
                {pickerBusy && (
                  <View style={[styles.avatarOverlay, { backgroundColor: hexWithAlpha(t.overlay, 'AA') }]}>
                    <ActivityIndicator color={t.primary} />
                  </View>
                )}
              </View>

              <View style={styles.avatarActions}>
                <Pressable
                  onPress={() => void pickImage('library')}
                  disabled={pickerBusy || !pickerAvailable}
                  style={[
                    styles.avatarBtn,
                    pickerAvailable
                      ? { borderColor: t.primary, backgroundColor: hexWithAlpha(t.primary, '18') }
                      : { borderColor: t.border, backgroundColor: 'transparent', opacity: 0.45 },
                  ]}
                  accessibilityLabel="Choose from photo library"
                  accessibilityRole="button"
                >
                  <FontAwesome name="photo" size={13} color={pickerAvailable ? t.primary : t.textMuted} />
                  <Text style={[styles.avatarBtnTxt, { color: pickerAvailable ? t.primary : t.textMuted }]}>Library</Text>
                </Pressable>
                <Pressable
                  onPress={() => void pickImage('camera')}
                  disabled={pickerBusy || !pickerAvailable}
                  style={[
                    styles.avatarBtn,
                    pickerAvailable
                      ? { borderColor: t.border, backgroundColor: 'transparent' }
                      : { borderColor: t.border, backgroundColor: 'transparent', opacity: 0.45 },
                  ]}
                  accessibilityLabel="Take a photo"
                  accessibilityRole="button"
                >
                  <FontAwesome name="camera" size={13} color={pickerAvailable ? t.textSecondary : t.textMuted} />
                  <Text style={[styles.avatarBtnTxt, { color: pickerAvailable ? t.textSecondary : t.textMuted }]}>Camera</Text>
                </Pressable>
                {localAvatar ? (
                  <Pressable
                    onPress={removeAvatar}
                    style={[styles.avatarBtn, { borderColor: hexWithAlpha(t.destructive, '66'), backgroundColor: hexWithAlpha(t.destructive, '0E') }]}
                    accessibilityLabel="Remove photo"
                    accessibilityRole="button"
                  >
                    <FontAwesome name="trash" size={13} color={t.destructive} />
                    <Text style={[styles.avatarBtnTxt, { color: t.destructive }]}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              {!pickerAvailable ? (
                <Text style={[styles.pickerNote, { color: t.textMuted }]}>
                  Rebuild the dev client to enable photo upload.
                </Text>
              ) : null}
            </View>

            {/* Display name */}
            <View style={styles.fieldBlock}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>Display Name</Text>
                <Text style={[styles.fieldCount, { color: nameCharsLeft < 5 ? t.destructive : t.textMuted }]}>
                  {nameCharsLeft} left
                </Text>
              </View>
              <TextInput
                ref={nameRef}
                value={name}
                onChangeText={(v) => setName(v.slice(0, MAX_NAME_LEN))}
                style={[styles.input, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.input }]}
                placeholder="Your display name"
                placeholderTextColor={t.textMuted}
                maxLength={MAX_NAME_LEN}
                returnKeyType="next"
                autoCorrect={false}
                accessibilityLabel="Display name"
              />
            </View>

            {/* Bio */}
            <View style={styles.fieldBlock}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>Bio</Text>
                <Text style={[styles.fieldCount, { color: bioCharsLeft < 20 ? t.destructive : t.textMuted }]}>
                  {bioCharsLeft} left
                </Text>
              </View>
              <TextInput
                value={bioText}
                onChangeText={(v) => setBioText(v.slice(0, MAX_BIO_LEN))}
                style={[styles.bioInput, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.input }]}
                placeholder="A short line that shows on the leaderboard…"
                placeholderTextColor={t.textMuted}
                maxLength={MAX_BIO_LEN}
                multiline
                numberOfLines={3}
                returnKeyType="done"
                accessibilityLabel="Profile bio"
              />
              <Text style={[styles.bioHint, { color: t.textMuted }]}>
                Visible to other players on the leaderboard.
              </Text>
            </View>

            {/* Guest nudge */}
            {isGuest ? (
              <View style={[styles.guestNotice, { borderColor: t.border, backgroundColor: hexWithAlpha(t.accent, '11') }]}>
                <FontAwesome name="info-circle" size={14} color={t.accent} />
                <Text style={[styles.guestNoticeTxt, { color: t.textSecondary }]}>
                  Link your account (Apple or Google) to keep your profile name and bio if you switch devices.
                </Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actionRow}>
              <AppButton
                variant="outline"
                label="Cancel"
                onPress={handleCancel}
                style={{ flex: 1 }}
              />
              <AppButton
                variant="primary"
                label="Save"
                onPress={handleSave}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  body: {
    padding: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '900' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    gap: 14,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pickerNote: { fontSize: 11, textAlign: 'center' },
  avatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
  },
  avatarBtnTxt: { fontSize: 13, fontWeight: '700' },
  fieldBlock: { gap: 6 },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: { fontSize: 14, fontWeight: '700' },
  fieldCount: { fontSize: 11, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  bioHint: { fontSize: 11, lineHeight: 15 },
  guestNotice: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  guestNoticeTxt: { flex: 1, fontSize: 12, lineHeight: 17 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
})
