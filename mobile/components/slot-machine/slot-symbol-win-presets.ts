import {
  cancelAnimation,
  Easing,
  type SharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import type { WinType } from '@shared/slot/evaluate-spin'
import type { SlotSymbol } from '@/lib/game-context'

export type SymbolWinPreset =
  | 'jackpotPulse'
  | 'coinPop'
  | 'gemGlowBlue'
  | 'gemGlowPurple'
  | 'wheelSpin'
  | 'keyWiggle'
  | 'crownPulse'
  | 'wildFlip'
  | 'scatterFlash'

const FLIP_DURATION_MS = 580
const WHEEL_SPIN_MS = 640

export function getSymbolWinPreset(symbol: SlotSymbol): SymbolWinPreset {
  if (symbol.isWild) return 'wildFlip'
  if (symbol.isScatter) return 'scatterFlash'
  switch (symbol.id) {
    case 'seven':
      return 'jackpotPulse'
    case 'lemon':
      return 'coinPop'
    case 'diamond':
      return 'gemGlowBlue'
    case 'cherry':
      return 'gemGlowPurple'
    case 'bell':
      return 'wheelSpin'
    case 'orange':
      return 'keyWiggle'
    case 'grape':
      return 'crownPulse'
    default:
      return 'gemGlowBlue'
  }
}

export interface WinPresetValues {
  scale: SharedValue<number>
  rotateZ: SharedValue<number>
  rotateY: SharedValue<number>
  opacity: SharedValue<number>
  glowOpacity: SharedValue<number>
  winTranslateY: SharedValue<number>
}

interface RunWinPresetOptions {
  preset: SymbolWinPreset
  values: WinPresetValues
  columnDelay: number
  cycles: number
  winTier: Exclude<WinType, 'none'>
  reduceMotion: boolean
}

const EASE_OUT = Easing.out(Easing.quad)
const EASE_IN_OUT = Easing.inOut(Easing.quad)
const FLIP_EASE = Easing.out(Easing.cubic)

function pulseMsForTier(winTier: Exclude<WinType, 'none'>): number {
  return winTier === 'normal' ? 200 : 230
}

function resetWinMotion(values: WinPresetValues) {
  const { scale, rotateZ, rotateY, opacity, glowOpacity, winTranslateY } = values
  cancelAnimation(scale)
  cancelAnimation(rotateZ)
  cancelAnimation(rotateY)
  cancelAnimation(opacity)
  cancelAnimation(glowOpacity)
  cancelAnimation(winTranslateY)
}

/** One-shot reduced-motion bump per preset family. */
function runReducedWinPreset(preset: SymbolWinPreset, values: WinPresetValues) {
  const { scale, rotateZ, rotateY, glowOpacity, winTranslateY } = values
  resetWinMotion(values)
  glowOpacity.value =
    preset === 'jackpotPulse' || preset === 'wildFlip' || preset === 'scatterFlash'
      ? 0.78
      : 0.62
  scale.value = withSequence(
    withTiming(1.06, { duration: 160, easing: EASE_OUT }),
    withTiming(1, { duration: 200, easing: EASE_OUT }),
  )
  rotateZ.value = 0
  rotateY.value = 0
  winTranslateY.value = 0
  if (preset === 'scatterFlash') {
    values.opacity.value = withSequence(
      withTiming(0.9, { duration: 120, easing: EASE_OUT }),
      withTiming(1, { duration: 160, easing: EASE_OUT }),
    )
  }
}

function runGlowPulse(
  glowOpacity: SharedValue<number>,
  delay: number,
  cycles: number,
  pulseMs: number,
  high = 0.92,
  low = 0.5,
) {
  glowOpacity.value = withDelay(
    delay,
    withRepeat(
      withSequence(
        withTiming(high, { duration: pulseMs, easing: EASE_OUT }),
        withTiming(low, { duration: pulseMs, easing: EASE_IN_OUT }),
      ),
      cycles,
      false,
    ),
  )
}

function runScalePulse(
  scale: SharedValue<number>,
  delay: number,
  cycles: number,
  pulseMs: number,
  peak: number,
) {
  scale.value = withDelay(
    delay,
    withRepeat(
      withSequence(
        withTiming(peak, { duration: pulseMs, easing: EASE_OUT }),
        withTiming(1, { duration: pulseMs, easing: EASE_IN_OUT }),
      ),
      cycles,
      false,
    ),
  )
}

const FLIP_HALF_MS = FLIP_DURATION_MS / 2

/** Single Y-flip (out and back to 0°) + subtle scale bump — does not rest mirrored. */
function runFlipAndReturn(rotateY: SharedValue<number>, delay: number) {
  rotateY.value = withDelay(
    delay,
    withSequence(
      withTiming(180, { duration: FLIP_HALF_MS, easing: FLIP_EASE }),
      withTiming(0, { duration: FLIP_HALF_MS, easing: FLIP_EASE }),
    ),
  )
}

/** Single flip + subtle scale bump — not repeated. */
function runOneShotFlip(
  values: WinPresetValues,
  delay: number,
  glowCycles: number,
  pulseMs: number,
) {
  const { scale, rotateY, glowOpacity } = values
  runFlipAndReturn(rotateY, delay)
  scale.value = withDelay(
    delay,
    withSequence(
      withTiming(1.06, { duration: FLIP_DURATION_MS * 0.45, easing: EASE_OUT }),
      withTiming(1, { duration: FLIP_DURATION_MS * 0.55, easing: EASE_IN_OUT }),
    ),
  )
  runGlowPulse(glowOpacity, delay, glowCycles, pulseMs, 0.9, 0.42)
}

export function runSymbolWinPreset({
  preset,
  values,
  columnDelay,
  cycles,
  winTier,
  reduceMotion,
}: RunWinPresetOptions) {
  const { scale, rotateZ, rotateY, opacity, glowOpacity, winTranslateY } = values
  resetWinMotion(values)

  if (reduceMotion) {
    runReducedWinPreset(preset, values)
    return
  }

  const delay = columnDelay
  const pulseMs = pulseMsForTier(winTier)
  const scatterPulseCycles = Math.min(cycles, 3)

  switch (preset) {
    case 'jackpotPulse': {
      const peak = winTier === 'jackpot' ? 1.16 : 1.12
      runGlowPulse(glowOpacity, delay, cycles, pulseMs, 0.92, 0.4)
      runScalePulse(scale, delay, cycles, pulseMs, peak)
      break
    }
    case 'coinPop': {
      runGlowPulse(glowOpacity, delay, cycles, pulseMs, 0.82, 0.45)
      runScalePulse(scale, delay, cycles, pulseMs, 1.12)
      rotateZ.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-8, { duration: pulseMs, easing: EASE_OUT }),
            withTiming(8, { duration: pulseMs, easing: EASE_IN_OUT }),
            withTiming(0, { duration: pulseMs, easing: EASE_OUT }),
          ),
          cycles,
          false,
        ),
      )
      break
    }
    case 'gemGlowBlue': {
      runGlowPulse(glowOpacity, delay, cycles, pulseMs, 0.86, 0.32)
      runScalePulse(scale, delay, cycles, pulseMs, 1.1)
      break
    }
    case 'gemGlowPurple': {
      runGlowPulse(glowOpacity, delay, cycles, pulseMs, 0.88, 0.34)
      runScalePulse(scale, delay, cycles, pulseMs, 1.1)
      break
    }
    case 'wheelSpin': {
      rotateZ.value = withDelay(
        delay,
        withTiming(360, { duration: WHEEL_SPIN_MS, easing: FLIP_EASE }),
      )
      runScalePulse(scale, delay, Math.min(cycles, 4), 180, 1.06)
      break
    }
    case 'keyWiggle': {
      rotateZ.value = withDelay(
        delay,
        withSequence(
          withTiming(-12, { duration: 90, easing: EASE_OUT }),
          withTiming(12, { duration: 110, easing: EASE_IN_OUT }),
          withTiming(-6, { duration: 90, easing: EASE_IN_OUT }),
          withTiming(0, { duration: 100, easing: EASE_OUT }),
        ),
      )
      runScalePulse(scale, delay, Math.min(cycles, 4), 180, 1.06)
      break
    }
    case 'crownPulse': {
      runScalePulse(scale, delay, cycles, pulseMs, 1.12)
      winTranslateY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-3, { duration: pulseMs, easing: EASE_OUT }),
            withTiming(0, { duration: pulseMs, easing: EASE_IN_OUT }),
          ),
          cycles,
          false,
        ),
      )
      break
    }
    case 'wildFlip': {
      runOneShotFlip(values, delay, Math.min(cycles, 4), pulseMs)
      break
    }
    case 'scatterFlash': {
      runFlipAndReturn(rotateY, delay)
      scale.value = withDelay(
        delay,
        withSequence(
          withTiming(1.06, { duration: FLIP_DURATION_MS * 0.45, easing: EASE_OUT }),
          withTiming(1, { duration: FLIP_DURATION_MS * 0.55, easing: EASE_IN_OUT }),
        ),
      )
      runGlowPulse(glowOpacity, delay, scatterPulseCycles, pulseMs, 0.95, 0.48)
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.82, { duration: pulseMs, easing: EASE_OUT }),
            withTiming(1, { duration: pulseMs, easing: EASE_IN_OUT }),
          ),
          scatterPulseCycles,
          false,
        ),
      )
      break
    }
  }
}

export function settleWinMotion(values: WinPresetValues) {
  const { scale, rotateZ, rotateY, opacity, glowOpacity, winTranslateY } = values
  resetWinMotion(values)
  glowOpacity.value = withTiming(0, { duration: 200 })
  scale.value = withTiming(1, { duration: 200, easing: EASE_OUT })
  rotateZ.value = withTiming(0, { duration: 160 })
  rotateY.value = withTiming(0, { duration: 160 })
  winTranslateY.value = withTiming(0, { duration: 160 })
  opacity.value = withTiming(1, { duration: 160 })
}
