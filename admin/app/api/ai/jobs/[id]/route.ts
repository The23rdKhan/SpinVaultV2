import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = adminSchema(supabase);
  const { data: job, error } = await admin
    .from("asset_generation_jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: assets } = await admin
    .from("generated_assets")
    .select("*")
    .eq("job_id", id)
    .order("candidate_index", { ascending: true });

  return NextResponse.json({ ...job, generated_assets: assets ?? [] });
}
