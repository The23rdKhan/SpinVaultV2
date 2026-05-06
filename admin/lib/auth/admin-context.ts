import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

import type { AdminRole } from "./types";
import { isAdminRole } from "./types";

export type AdminContext = {
  userId: string;
  email: string;
  roles: AdminRole[];
};

/**
 * Loads the signed-in Supabase user plus `admin` schema roles (may be empty before bootstrap).
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const admin = adminSchema(supabase);
  const { data: rolesRows } = await admin
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (rolesRows ?? [])
    .map((r) => r.role as string)
    .filter(isAdminRole);

  return {
    userId: user.id,
    email: user.email,
    roles,
  };
}
