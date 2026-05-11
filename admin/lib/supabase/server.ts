import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  ADMIN_DEV_BYPASS_USER,
  isAdminAuthBypass,
} from "@/lib/auth/dev-bypass";

import { createSupabaseServiceClient } from "./service";

/**
 * Session-bound client (anon key + cookies). RLS uses `auth.uid()`.
 */
export async function createSessionSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component without mutable cookies — safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * With `ADMIN_SKIP_AUTH=1` in development, uses the service-role client (RLS bypassed).
 */
export async function createSupabaseServerClient() {
  if (isAdminAuthBypass()) {
    return createSupabaseServiceClient();
  }
  return createSessionSupabaseServerClient();
}

/**
 * Signed-in user for server code. In dev bypass mode, returns a synthetic user
 * (not in `auth.users`); use with {@link createSupabaseServerClient} bypass only.
 */
export async function getServerAuthUser(): Promise<{
  id: string;
  email: string;
} | null> {
  if (isAdminAuthBypass()) {
    return { ...ADMIN_DEV_BYPASS_USER };
  }

  const supabase = await createSessionSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return { id: user.id, email: user.email };
}
