/**
 * Canonical machine-layer token keys — must match `mobile/theme/tokens.ts` MACHINE_OVERRIDE_KEYS.
 * Used by Zod + DB validation ([SCR-4] — themes cannot touch shell odds/RNG; token surface is bounded).
 */
export const MACHINE_OVERRIDE_KEYS = [
  "cabinetBg",
  "cabinetBorder",
  "reelBg",
  "reelBorder",
  "spinButtonStart",
  "spinButtonEnd",
  "jackpot",
  "win",
  "machineAccent",
] as const;

export type MachineOverrideKey = (typeof MACHINE_OVERRIDE_KEYS)[number];
