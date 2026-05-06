import { NextResponse, type NextRequest } from "next/server";

import { adminSchema } from "@/lib/supabase/admin-db";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Historical catalog snapshot by version — same **public, unauthenticated** contract as
 * `/api/catalog/v1/latest` (see that route’s security notes).
 */

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ version: string }> },
) {
  try {
    const { version: raw } = await ctx.params;
    const version = Number(raw);
    if (!Number.isFinite(version) || version <= 0) {
      return NextResponse.json({ error: "bad_version" }, { status: 400 });
    }

    const service = createSupabaseServiceClient();
    const admin = adminSchema(service);

    const { data: row, error } = await admin
      .from("store_catalog")
      .select("catalog_version,payload,payload_sha256,built_at")
      .eq("catalog_version", version)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      catalogVersion: row.catalog_version,
      payloadSha256: row.payload_sha256,
      builtAt: row.built_at,
      payload: row.payload,
    });
  } catch {
    return NextResponse.json({ error: "misconfigured" }, { status: 503 });
  }
}
