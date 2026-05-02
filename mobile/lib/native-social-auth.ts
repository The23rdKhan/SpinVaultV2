import 'react-native-get-random-values'

import appleAuth, { appleAuthAndroid } from '@invertase/react-native-apple-authentication'
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import { v4 as uuid } from 'uuid'

export type NativeSocialAuthResult =
  | { ok: true }
  | { ok: false; code: 'cancelled' | 'unavailable' | 'config' | 'unknown'; message?: string }

async function signInWithAppleIOS(supabase: SupabaseClient): Promise<NativeSocialAuthResult> {
  if (Platform.OS !== 'ios' || !appleAuth.isSupported) {
    return {
      ok: false,
      code: 'unavailable',
      message: 'Sign in with Apple requires iOS 13+.',
    }
  }

  try {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    })

    if (!response.identityToken) {
      return {
        ok: false,
        code: 'unknown',
        message: 'Apple did not return an identity token.',
      }
    }

    try {
      const credentialState = await appleAuth.getCredentialStateForUser(response.user)
      if (credentialState !== appleAuth.State.AUTHORIZED) {
        return {
          ok: false,
          code: 'unknown',
          message: 'Apple credential is not authorized.',
        }
      }
    } catch {
      // Simulator — continue when identity token exists.
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: response.identityToken,
      nonce: response.nonce,
    })

    if (error) {
      return { ok: false, code: 'unknown', message: error.message }
    }

    if (response.fullName) {
      const fn = response.fullName
      const parts = [fn.givenName, fn.middleName, fn.familyName].filter(Boolean) as string[]
      const fullName = parts.join(' ')
      if (fullName) {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            given_name: fn.givenName ?? undefined,
            family_name: fn.familyName ?? undefined,
          },
        })
      }
    }

    return { ok: true }
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e
        ? String((e as { code: string }).code)
        : ''
    if (code === appleAuth.Error.CANCELED) {
      return { ok: false, code: 'cancelled' }
    }
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, code: 'unknown', message }
  }
}

async function signInWithAppleAndroid(supabase: SupabaseClient): Promise<NativeSocialAuthResult> {
  if (Platform.OS !== 'android' || typeof appleAuthAndroid.signIn !== 'function') {
    return {
      ok: false,
      code: 'unavailable',
      message: 'Apple Sign-In on Android requires a dev build with the native module (API 19+).',
    }
  }
  if (!appleAuthAndroid.isSupported) {
    return {
      ok: false,
      code: 'unavailable',
      message: 'Apple Sign-In is not supported on this Android version.',
    }
  }

  const serviceId = process.env.EXPO_PUBLIC_APPLE_AUTH_SERVICE_ID?.trim()
  const redirectUri = process.env.EXPO_PUBLIC_APPLE_AUTH_REDIRECT_URI?.trim()

  if (!serviceId || !redirectUri) {
    return {
      ok: false,
      code: 'config',
      message:
        'Set EXPO_PUBLIC_APPLE_AUTH_SERVICE_ID (Apple Services ID) and EXPO_PUBLIC_APPLE_AUTH_REDIRECT_URI (must match Apple Developer config).',
    }
  }

  const rawNonce = uuid()
  const state = uuid()

  try {
    appleAuthAndroid.configure({
      clientId: serviceId,
      redirectUri,
      responseType: appleAuthAndroid.ResponseType.ALL,
      scope: appleAuthAndroid.Scope.ALL,
      nonce: rawNonce,
      state,
    })

    const credentialState = await appleAuthAndroid.signIn()

    const idToken = credentialState.id_token
    const code = credentialState.code
    const nonceForSupabase = credentialState.nonce ?? rawNonce

    if (!idToken || !code) {
      return {
        ok: false,
        code: 'unknown',
        message: 'Apple did not return id_token and authorization code.',
      }
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: idToken,
      nonce: nonceForSupabase,
      access_token: code,
    })

    if (error) {
      return { ok: false, code: 'unknown', message: error.message }
    }

    const name = credentialState.user?.name
    if (name?.firstName || name?.lastName) {
      const fullName = [name.firstName, name.lastName].filter(Boolean).join(' ')
      await supabase.auth.updateUser({
        data: {
          full_name: fullName || undefined,
          given_name: name.firstName ?? undefined,
          family_name: name.lastName ?? undefined,
        },
      })
    }

    return { ok: true }
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e
        ? String((e as { code: string }).code)
        : ''
    if (code === appleAuthAndroid.Error.SIGNIN_CANCELLED) {
      return { ok: false, code: 'cancelled' }
    }
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, code: 'unknown', message }
  }
}

/** iOS native Apple button flow or Android web Apple flow → Supabase `signInWithIdToken`. */
export async function signInWithAppleNative(
  supabase: SupabaseClient,
): Promise<NativeSocialAuthResult> {
  if (Platform.OS === 'android') {
    return signInWithAppleAndroid(supabase)
  }
  if (Platform.OS === 'ios') {
    return signInWithAppleIOS(supabase)
  }
  return {
    ok: false,
    code: 'unavailable',
    message: 'Sign in with Apple is only supported on iOS and Android.',
  }
}

export async function signInWithGoogleNative(
  supabase: SupabaseClient,
): Promise<NativeSocialAuthResult> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  if (!webClientId) {
    return {
      ok: false,
      code: 'config',
      message:
        'Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (Google Cloud OAuth client of type Web). Add SHA-1 fingerprints for Android in Google Cloud.',
    }
  }

  try {
    GoogleSignin.configure({
      webClientId,
      ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
        ? { iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID }
        : {}),
    })

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    }

    const response = await GoogleSignin.signIn()
    if (!isSuccessResponse(response)) {
      return { ok: false, code: 'cancelled' }
    }

    let idToken = response.data.idToken
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens()
      idToken = tokens.idToken
    }

    if (!idToken) {
      return {
        ok: false,
        code: 'unknown',
        message:
          'Google did not return an ID token. Use the Web client ID in configure(), and list all client IDs in Supabase → Google provider.',
      }
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })

    if (error) {
      return { ok: false, code: 'unknown', message: error.message }
    }

    return { ok: true }
  } catch (e: unknown) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        return { ok: false, code: 'cancelled' }
      }
      return { ok: false, code: 'unknown', message: e.message }
    }
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, code: 'unknown', message }
  }
}
