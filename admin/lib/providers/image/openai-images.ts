import "server-only";

import type { OpenAiImageCostInput } from "@/lib/ai/openai-image-cost-estimate";

export type OpenAiImageJobInput = OpenAiImageCostInput;

type OpenAiImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

export async function generateOpenAiImages(
  input: OpenAiImageJobInput,
): Promise<{ buffers: Buffer[]; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const size =
    input.aspectRatio === "1024x1792"
      ? "1024x1792"
      : input.aspectRatio === "1792x1024"
        ? "1792x1024"
        : "1024x1024";

  const buffers: Buffer[] = [];
  const model = "dall-e-3";

  for (let i = 0; i < input.count; i += 1) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: input.negativePrompt
          ? `${input.prompt}\nAvoid: ${input.negativePrompt}`
          : input.prompt,
        n: 1,
        size,
        response_format: "b64_json",
      }),
    });

    const json = (await res.json()) as OpenAiImageResponse;
    if (!res.ok) {
      throw new Error(json.error?.message ?? `OpenAI error ${res.status}`);
    }
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("OpenAI returned no image data");
    }
    buffers.push(Buffer.from(b64, "base64"));
  }

  return { buffers, model };
}
