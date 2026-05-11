import type { SupabaseClient, User } from "@supabase/supabase-js";

import { adminSchema } from "@/lib/supabase/admin-db";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function upsertAdminUserRow(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  if (!user.email) {
    return;
  }
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
}

/**
 * When `/setup` set the setup-intent cookie, grant `super_admin` and mark bootstrap complete once.
 */
export async function completeBootstrapIfSetupIntent(
  userId: string,
): Promise<void> {
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
        user_id: userId,
        role: "super_admin",
      },
      { onConflict: "user_id,role" },
    );

    await svcAdmin
      .from("bootstrap_state")
      .update({
        completed_at: new Date().toISOString(),
        completed_by: userId,
      })
      .eq("id", 1);
  }
}
