import { useCallback, useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { createAudioPlayer } from 'expo-audio'
import { useGame } from '@/lib/game-context'

// ---------------------------------------------------------------------------
// Sound catalog
// NOTE: spin.wav and win.wav are already played by CasinoAudioController
// (mounted at app root) on spin-start and spin-win events. This hook only
// covers supplementary SFX that the controller doesn't handle:
//   • betChange  — immediate feedback when bet buttons are pressed
//   • bonusDing  — fires when the bonus meter completes
// ---------------------------------------------------------------------------
const SPIN_SFX = require('../assets/sounds/spin.wav') as number
const WIN_SFX = require('../assets/sounds/win.wav') as number

function isNative() {
  return Platform.OS === 'ios' || Platform.OS === 'android'
}

/**
 * Fires a one-shot sound effect (fire-and-forget, auto-disposes).
 * Disposal window is generous enough for the longest asset (~2 s).
 */
function playOnce(source: number) {
  if (!isNative()) return
  try {
    const player = createAudioPlayer(source)
    player.play()
    setTimeout(() => {
      try {
        player.remove()
      } catch {
        /* already released */
      }
    }, 2_500)
  } catch {
    /* audio unavailable */
  }
}

/**
 * Supplementary casino SFX for interactions not covered by CasinoAudioController.
 * Respects `soundEnabled` from game context. No-ops on web.
 */
export function useAudio() {
  const { soundEnabled } = useGame()
  const soundEnabledRef = useRef(soundEnabled)
  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  /** Immediate click feedback when the bet +/− or MAX buttons are pressed. */
  const betChange = useCallback(() => {
    if (!soundEnabledRef.current) return
    playOnce(SPIN_SFX)
  }, [])

  /** Plays when the bonus meter fills and a payout is awarded. */
  const bonusDing = useCallback(() => {
    if (!soundEnabledRef.current) return
    playOnce(WIN_SFX)
  }, [])

  return { betChange, bonusDing }
}
