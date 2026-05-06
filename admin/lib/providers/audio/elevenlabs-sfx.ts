import "server-only";

import type { ElevenLabsSfxInput } from "@/lib/ai/elevenlabs-sfx-cost-estimate";

/** ElevenLabs SFX placeholder — wire full `/v1/sound-generation` when keys are available. */
export async function generateElevenLabsSfx(
  input: ElevenLabsSfxInput,
): Promise<{ buffer: Buffer; model: string }> {
  void input;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  void apiKey;
  throw new Error(
    "ElevenLabs SFX adapter not fully wired — add API integration in lib/providers/audio/elevenlabs-sfx.ts",
  );
}
