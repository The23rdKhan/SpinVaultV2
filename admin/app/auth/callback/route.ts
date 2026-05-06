import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { ADMIN_SETUP_INTENT_COOKIE } from "@/lib/auth/cookies";
import { adminSchema } from "@/lib/supabase/admin-db";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * OAuth/magic-link redirect handler — exchanges `code` for a session and optionally completes one-time bootstrap.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  let nextRaw = url.searchParams.get("next") ?? "/admin/dashboard";
  if (!nextRaw.startsWith("/")) {
    nextRaw = "/admin/dashboard";
  }

  let response = NextResponse.redirect(new URL(nextRaw, request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.redirect(new URL(nextRaw, request.url));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const admin = adminSchema(supabase);
    await admin.from("admin_users").upsert(
      {
        id: user.id,
        email: user.email,
        display_name:
          (user.user_metadata?.full_name as string | undefined) ?? null,
      },
      { onConflict: "id" },
    );

    const setupIntent =
      request.cookies.get(ADMIN_SETUP_INTENT_COOKIE)?.value === "1";

    if (setupIntent) {
      const service = createSupabaseServiceClient();
      const svcAdmin = adminSchema(service);

      const { data: boot } = await svcAdmin
        .from("bootstrap_state")
        .select("completed_at")
        .eq("id", 1)
        .maybeSingle();

      if (!boot?.completed_at) {
        await svcAdmin.from("admin_roles").upsert(
          {
            user_id: user.id,
            role: "super_admin",
          },
          { onConflict: "user_id,role" },
        );

        await svcAdmin
          .from("bootstrap_state")
          .update({
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          })
          .eq("id", 1);
      }

      response.cookies.delete(ADMIN_SETUP_INTENT_COOKIE);
    }
  }

  return response;
}
