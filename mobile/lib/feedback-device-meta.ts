import Constants from 'expo-constants'
import { Platform } from 'react-native'

export function getFeedbackDeviceMeta(): {
  app_version: string | null
  os_version: string
  device_model: string | null
} {
  const app_version =
    Constants.expoConfig?.version ??
    (typeof Constants.nativeAppVersion === 'string' ? Constants.nativeAppVersion : null) ??
    null
  const os_version = `${Platform.OS} ${String(Platform.Version)}`
  const device_model =
    Platform.OS === 'android'
      ? String((Platform.constants as { Model?: string }).Model ?? '').trim() || null
      : null
  return { app_version, os_version, device_model }
}
