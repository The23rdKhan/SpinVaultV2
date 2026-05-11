"use server";

import { cookies } from "next/headers";

import { ADMIN_SETUP_INTENT_COOKIE } from "@/lib/auth/cookies";
import { isAdminAuthBypass } from "@/lib/auth/dev-bypass";
import {
  completeBootstrapIfSetupIntent,
  upsertAdminUserRow,
} from "@/lib/auth/post-login-sync";
import { createSessionSupabaseServerClient } from "@/lib/supabase/server";

export type FinalizeLoginResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Runs after browser sign-in (password or OAuth): sync `admin_users`, consume setup cookie if present.
 */
export async function finalizeLoginSession(): Promise<FinalizeLoginResult> {
  if (isAdminAuthBypass()) {
    return { ok: true };
  }

  const supabase = await createSessionSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, message: "Not signed in." };
  }

  await upsertAdminUserRow(supabase, user);

  const jar = await cookies();
  if (jar.get(ADMIN_SETUP_INTENT_COOKIE)?.value === "1") {
    await completeBootstrapIfSetupIntent(user.id);
    jar.delete(ADMIN_SETUP_INTENT_COOKIE);
  }

  return { ok: true };
}
