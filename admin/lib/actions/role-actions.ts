"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";
import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/actions/result";
import { MSG_FORBIDDEN, MSG_SAVE_FAILED } from "@/lib/actions/safe-action-message";
import { PermissionError, requirePermission } from "@/lib/auth/require-permission";
import { type AdminRole, isAdminRole } from "@/lib/auth/types";
import { insertAuditLog } from "@/lib/data/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

const assignSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().refine((r): r is AdminRole => isAdminRole(r)),
});

export async function assignRoleAction(
  input: unknown,
): Promise<ActionResult<{ userId: string; role: AdminRole }>> {
  try {
    const parsed = assignSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        "validation_error",
        "Invalid role payload",
        flattenError(parsed.error).fieldErrors,
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return failure("unauthorized", "Sign in required.");
    }
    await requirePermission(supabase, user.id, ["super_admin"]);

    const admin = adminSchema(supabase);
    const { error } = await admin.from("admin_roles").upsert(
      {
        user_id: parsed.data.userId,
        role: parsed.data.role,
        granted_by: user.id,
      },
      { onConflict: "user_id,role" },
    );

    if (error) {
      console.error("[assignRoleAction] admin_roles upsert", error);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "admin.assign_role",
      entity_type: "admin_user",
      entity_id: parsed.data.userId,
      after: { role: parsed.data.role },
    });

    revalidatePath("/admin/users/admins");
    return success({ userId: parsed.data.userId, role: parsed.data.role });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}
