import { NextResponse } from "next/server";

import { adminSchema } from "@/lib/supabase/admin-db";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Public catalog snapshot — backed by `admin.store_catalog` ([§N.1]).
 *
 * **Auth:** Intentionally **unauthenticated** so mobile / CDN consumers can fetch JSON without a
 * user session (matches deferred mobile catalog integration). For production, put this behind a
 * CDN with caching, rate limiting, WAF, and/or a future signed-URL or API-key strategy — do not rely
 * on obscurity alone.
 */
export async function GET() {
  try {
    const service = createSupabaseServiceClient();
    const admin = adminSchema(service);

    const { data: meta, error: metaErr } = await admin
      .from("catalog_meta")
      .select("last_version")
      .eq("id", 1)
      .single();

    if (metaErr || meta == null) {
      return NextResponse.json(
        { error: "catalog_meta_unavailable" },
        { status: 503 },
      );
    }

    const version = meta.last_version as number;
    if (!version) {
      return NextResponse.json({ error: "not_published" }, { status: 404 });
    }

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
