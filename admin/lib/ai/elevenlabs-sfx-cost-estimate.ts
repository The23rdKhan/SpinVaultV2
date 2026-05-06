export type ElevenLabsSfxInput = {
  prompt: string;
};

/**
 * Placeholder USD estimate for ElevenLabs SFX — safe for client & server.
 */
export function estimateElevenLabsSfxCostUsd(input: ElevenLabsSfxInput): number {
  void input;
  return 0.05;
}
