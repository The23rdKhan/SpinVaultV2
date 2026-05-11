import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { ADMIN_SETUP_INTENT_COOKIE } from "@/lib/auth/cookies";
import {
  completeBootstrapIfSetupIntent,
  upsertAdminUserRow,
} from "@/lib/auth/post-login-sync";

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
    await upsertAdminUserRow(supabase, user);

    const setupIntent =
      request.cookies.get(ADMIN_SETUP_INTENT_COOKIE)?.value === "1";

    if (setupIntent) {
      await completeBootstrapIfSetupIntent(user.id);
      response.cookies.delete(ADMIN_SETUP_INTENT_COOKIE);
    }
  }

  return response;
}
