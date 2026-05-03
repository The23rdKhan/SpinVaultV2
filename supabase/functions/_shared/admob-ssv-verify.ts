/**
 * AdMob rewarded SSV verification (manual algorithm per Google docs).
 * @see https://developers.google.com/admob/ios/ssv#manual_verification_of_rewarded_ssv
 */

const DEFAULT_KEYS_URL = 'https://gstatic.com/admob/reward/verifier-keys.json'
const CACHE_MS = 23 * 60 * 60 * 1000

type KeysCache = { map: Map<number, CryptoKey>; fetchedAt: number }

let keysCache: KeysCache | null = null

async function loadVerifierKeys(): Promise<Map<number, CryptoKey>> {
  const now = Date.now()
  if (keysCache && now - keysCache.fetchedAt < CACHE_MS) {
    return keysCache.map
  }

  const url = Deno.env.get('ADMOB_SSV_KEYS_URL') ?? DEFAULT_KEYS_URL
  const res = await fetch(url)
  if (!res.ok) throw new Error(`admob_keys_http_${res.status}`)
  const json = (await res.json()) as { keys?: { keyId?: number; base64?: string }[] }
  const map = new Map<number, CryptoKey>()
  for (const k of json.keys ?? []) {
    const keyId = k.keyId
    const b64 = k.base64
    if (keyId == null || !b64) continue
    const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      raw,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    )
    map.set(Number(keyId), cryptoKey)
  }
  if (map.size === 0) throw new Error('admob_no_keys')
  keysCache = { map, fetchedAt: now }
  return map
}

function decodeSignature(sigUrlEncoded: string): Uint8Array {
  const normalized = sigUrlEncoded.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const bin = atob(normalized + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Returns true if the callback URL signature is valid (or skip-verify env set). */
export async function verifyAdmobRewardCallback(fullUrl: string): Promise<boolean> {
  const skip = Deno.env.get('ADMOB_SKIP_SIGNATURE_VERIFY')
  if (skip === '1' || skip === 'true') {
    console.warn('[admob-ssv] ADMOB_SKIP_SIGNATURE_VERIFY active — not production safe')
    return true
  }

  const u = new URL(fullUrl)
  const qs = u.search.startsWith('?') ? u.search.slice(1) : u.search

  const sigMarker = 'signature='
  const sigIdx = qs.indexOf(sigMarker)
  if (sigIdx === -1) return false

  const contentPart = sigIdx === 0 ? '' : qs.slice(0, sigIdx - 1)
  const contentBytes = new TextEncoder().encode(contentPart)

  const sigAndKey = qs.slice(sigIdx)
  const keyMarker = '&key_id='
  const keyIdx = sigAndKey.indexOf(keyMarker)
  if (keyIdx === -1) return false

  const sigEncoded = sigAndKey.slice(sigMarker.length, keyIdx)
  const keyIdStr = sigAndKey.slice(keyIdx + keyMarker.length)
  const keyId = Number.parseInt(keyIdStr, 10)
  if (!Number.isFinite(keyId)) return false

  const sigBytes = decodeSignature(decodeURIComponent(sigEncoded))

  const keys = await loadVerifierKeys()
  const pub = keys.get(keyId)
  if (!pub) return false

  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    pub,
    sigBytes,
    contentBytes,
  )
  return ok
}
