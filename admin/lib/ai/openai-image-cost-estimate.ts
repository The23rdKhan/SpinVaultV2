/**
 * Pure USD estimate for OpenAI image jobs — safe for client & server ([NAV-AC-3]).
 * No env vars, no provider SDK.
 */
export type OpenAiImageCostInput = {
  prompt: string;
  negativePrompt?: string;
  count: 1 | 2 | 4;
  aspectRatio: string;
};

/** Rough USD estimate for confirmation UI — mirrors MVP pricing assumptions in sprint docs. */
export function estimateOpenAiImageCostUsd(input: OpenAiImageCostInput): number {
  void input.aspectRatio;
  const perImage = 0.04;
  return perImage * input.count;
}
