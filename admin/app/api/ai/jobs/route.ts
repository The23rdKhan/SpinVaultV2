import { NextResponse } from "next/server";
import { flattenError } from "zod";
import { z } from "zod";

import { estimateOpenAiImageCostUsd } from "@/lib/ai/openai-image-cost-estimate";
import { requirePermission } from "@/lib/auth/require-permission";
import { generateElevenLabsSfx } from "@/lib/providers/audio/elevenlabs-sfx";
import { generateOpenAiImages } from "@/lib/providers/image/openai-images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

const bodySchema = z.object({
  kind: z.enum(["image", "sound"]),
  contentItemId: z.string().uuid().nullable().optional(),
  assetType: z.string().min(1),
  prompt: z.string().min(4),
  negativePrompt: z.string().optional(),
  aspectRatio: z.string().default("1024x1024"),
  count: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(1),
});

/**
 * Creates a generation job and runs it inline (MVP — poll `/api/ai/jobs/[id]`).
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await requirePermission(supabase, user.id, [
      "super_admin",
      "content_manager",
      "artist_designer",
    ]);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = adminSchema(supabase);
  const kind = parsed.data.kind;
  const estimateUsd =
    kind === "image"
      ? estimateOpenAiImageCostUsd({
          prompt: parsed.data.prompt,
          negativePrompt: parsed.data.negativePrompt,
          count: parsed.data.count,
          aspectRatio: parsed.data.aspectRatio,
        })
      : 0.05;

  const { data: jobRow, error: jobErr } = await admin
    .from("asset_generation_jobs")
    .insert({
      content_item_id: parsed.data.contentItemId ?? null,
      kind,
      asset_type: parsed.data.assetType,
      provider: kind === "image" ? "openai" : "elevenlabs",
      model: kind === "image" ? "dall-e-3" : "eleven-sfx",
      prompt: parsed.data.prompt,
      negative_prompt: parsed.data.negativePrompt ?? null,
      aspect_ratio: parsed.data.aspectRatio,
      count: parsed.data.count,
      cost_estimate_usd: estimateUsd,
      status: "queued",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (jobErr || !jobRow) {
    console.error("[POST /api/ai/jobs] asset_generation_jobs insert", jobErr);
    return NextResponse.json(
      { error: "Unable to start generation. Please try again." },
      { status: 500 },
    );
  }

  const jobId = jobRow.id as string;

  await admin
    .from("asset_generation_jobs")
    .update({ status: "running" })
    .eq("id", jobId);

  try {
    if (kind === "image") {
      const { buffers, model } = await generateOpenAiImages({
        prompt: parsed.data.prompt,
        negativePrompt: parsed.data.negativePrompt,
        count: parsed.data.count,
        aspectRatio: parsed.data.aspectRatio,
      });

      let idx = 0;
      for (const buffer of buffers) {
        const path = `${user.id}/${jobId}/candidate-${idx}.png`;
        const { error: upErr } = await supabase.storage
          .from("generated-assets")
          .upload(path, buffer, {
            contentType: "image/png",
            upsert: true,
          });
        if (upErr) {
          throw new Error(upErr.message);
        }
        const { data: signed, error: signErr } = await supabase.storage
          .from("generated-assets")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (signErr || !signed) {
          throw new Error(signErr?.message ?? "sign_failed");
        }

        await admin.from("generated_assets").insert({
          job_id: jobId,
          candidate_index: idx,
          storage_path: path,
          public_url: signed.signedUrl,
          safety_status: "unknown",
        });
        idx += 1;
      }

      await admin
        .from("asset_generation_jobs")
        .update({
          status: "succeeded",
          completed_at: new Date().toISOString(),
          model,
        })
        .eq("id", jobId);
    } else {
      const { buffer, model } = await generateElevenLabsSfx({
        prompt: parsed.data.prompt,
      });
      const path = `${user.id}/${jobId}/candidate-0.mp3`;
      const { error: upErr } = await supabase.storage
        .from("generated-assets")
        .upload(path, buffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });
      if (upErr) {
        throw new Error(upErr.message);
      }
      const { data: signed, error: signErr } = await supabase.storage
        .from("generated-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signErr || !signed) {
        throw new Error(signErr?.message ?? "sign_failed");
      }

      await admin.from("generated_assets").insert({
        job_id: jobId,
        candidate_index: 0,
        storage_path: path,
        public_url: signed.signedUrl,
        safety_status: "unknown",
      });

      await admin
        .from("asset_generation_jobs")
        .update({
          status: "succeeded",
          completed_at: new Date().toISOString(),
          model,
        })
        .eq("id", jobId);
    }

    return NextResponse.json({ ok: true, jobId });
  } catch (e) {
    console.error("[POST /api/ai/jobs] generation failed", e);
    const internalMessage = e instanceof Error ? e.message : "generation_failed";
    await admin
      .from("asset_generation_jobs")
      .update({
        status: "failed",
        error: internalMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return NextResponse.json(
      {
        ok: false,
        jobId,
        error: "Generation failed. Please try again or check server logs.",
      },
      { status: 422 },
    );
  }
}
