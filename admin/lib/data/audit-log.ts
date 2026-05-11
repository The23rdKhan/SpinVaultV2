import type { SupabaseClient } from "@supabase/supabase-js";

import { isAdminAuthBypass } from "@/lib/auth/dev-bypass";
import { adminSchema } from "@/lib/supabase/admin-db";

export type AuditInsert = {
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before?: unknown;
  after?: unknown;
};

/** Append-only audit trail ([§M]). */
export async function insertAuditLog(
  supabase: SupabaseClient,
  row: AuditInsert,
): Promise<void> {
  const admin = adminSchema(supabase);
  const { error } = await admin.from("audit_log").insert({
    ...row,
    actor_id: isAdminAuthBypass() ? null : row.actor_id,
  });
  if (error) {
    console.error("audit_log insert failed", error);
  }
}
