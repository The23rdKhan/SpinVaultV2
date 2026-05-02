import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio'
import { useGame } from '@/lib/game-context'

const SPIN_SRC = require('@/assets/sounds/spin.wav')
const WIN_SRC = require('@/assets/sounds/win.wav')

/** Hooks spin/win SFX to `soundEnabled`. Lobby loop removed (no autoplay at launch). */
export function CasinoAudioController() {
  const { soundEnabled, isSpinning, spinSequence, lastWin } = useGame()

  const spinPlayer = useAudioPlayer(SPIN_SRC)
  const winPlayer = useAudioPlayer(WIN_SRC)

  const prevSpinningRef = useRef<boolean | null>(null)
  const prevSeqRef = useRef<number | null>(null)

  useEffect(() => {
    if (Platform.OS === 'web') return
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      allowsRecording: false,
      shouldPlayInBackground: false,
    })
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web') return
    spinPlayer.volume = 1
    winPlayer.volume = 1
  }, [spinPlayer, winPlayer])

  useEffect(() => {
    if (Platform.OS === 'web') return
    if (prevSpinningRef.current === null) {
      prevSpinningRef.current = isSpinning
      return
    }
    if (soundEnabled && prevSpinningRef.current === false && isSpinning === true) {
      void spinPlayer.seekTo(0).then(() => {
        spinPlayer.play()
      })
    }
    prevSpinningRef.current = isSpinning
  }, [isSpinning, soundEnabled, spinPlayer])

  useEffect(() => {
    if (Platform.OS === 'web') return
    if (prevSeqRef.current === null) {
      prevSeqRef.current = spinSequence
      return
    }
    if (spinSequence > prevSeqRef.current && lastWin > 0 && soundEnabled) {
      void winPlayer.seekTo(0).then(() => {
        winPlayer.play()
      })
    }
    prevSeqRef.current = spinSequence
  }, [spinSequence, lastWin, soundEnabled, winPlayer])

  return null
}
