"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client for minimal client-side auth helpers (e.g. signOut).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
