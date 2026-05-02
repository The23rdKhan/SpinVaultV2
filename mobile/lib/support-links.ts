import * as Linking from 'expo-linking'

export { SUPPORT_URLS } from '@shared/support-urls'

export async function openExternalUrl(url: string): Promise<boolean> {
  try {
    const can = await Linking.canOpenURL(url)
    if (!can) return false
    await Linking.openURL(url)
    return true
  } catch {
    return false
  }
}
