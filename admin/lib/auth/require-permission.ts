import type { SupabaseClient } from "@supabase/supabase-js";

import { adminSchema } from "@/lib/supabase/admin-db";

import { isAdminAuthBypass } from "./dev-bypass";
import type { AdminRole } from "./types";
import { isAdminRole } from "./types";

/**
 * Server-side role gate (§C matrix). RLS uses `admin.is_active_admin` / `admin.has_role`.
 * Optional SQL twin: `admin.has_permission(uid, allowed_roles[])` (see migration
 * `20260507180000_admin_has_permission_compat.sql`) — not required for MVP routes.
 */
export class PermissionError extends Error {
  readonly code = "FORBIDDEN";

  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "PermissionError";
  }
}

/**
 * Loads roles for `userId` and throws {@link PermissionError} unless one of `allowed` matches.
 * Used inside Server Actions after `getUser()` ([§C] matrix enforced in app code; RLS is baseline).
 */
export async function requirePermission(
  supabase: SupabaseClient,
  userId: string,
  allowed: readonly AdminRole[],
): Promise<AdminRole[]> {
  if (isAdminAuthBypass()) {
    return ["super_admin"];
  }

  const admin = adminSchema(supabase);
  const { data: rows, error } = await admin
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    throw new PermissionError(error.message);
  }

  const roles = (rows ?? [])
    .map((r) => r.role as string)
    .filter(isAdminRole);

  const ok = roles.some((r) => allowed.includes(r));
  if (!ok) {
    throw new PermissionError();
  }

  return roles;
}
