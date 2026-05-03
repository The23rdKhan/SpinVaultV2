import { Platform, TurboModuleRegistry } from 'react-native'

/** True when the dev client / release binary includes `@expo/ui` native code (`ExpoUI` module). */
export function isExpoUiNativeAvailable(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false
  }
  return TurboModuleRegistry.get('ExpoUI') != null
}
