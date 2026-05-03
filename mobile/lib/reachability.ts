import NetInfo from '@react-native-community/netinfo'

/**
 * False when there is no network connection or the OS reports internet as unreachable.
 * When reachability is unknown (null), we allow the action so real IAP can still talk to the store SDK.
 */
export async function isReachable(): Promise<boolean> {
  const s = await NetInfo.fetch()
  if (s.isConnected === false) return false
  if (s.isInternetReachable === false) return false
  return true
}
