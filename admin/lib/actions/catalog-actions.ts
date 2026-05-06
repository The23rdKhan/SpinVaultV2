"use server";

import { createHash } from "crypto";

import { revalidatePath } from "next/cache";

import { failure, success, type ActionResult } from "@/lib/actions/result";
import {
  MSG_FORBIDDEN,
  MSG_PUBLISH_FAILED,
} from "@/lib/actions/safe-action-message";
import { PermissionError, requirePermission } from "@/lib/auth/require-permission";
import {
  buildCatalogPayload,
  type CatalogContentRow,
} from "@/lib/catalog/build";
import { insertAuditLog } from "@/lib/data/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

/** Rebuild catalog JSON from published rows and bump `catalog_meta` ([§L.6]). */
export async function publishCatalogAction(): Promise<
  ActionResult<{ version: number }>
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return failure("unauthorized", "Sign in required.");
    }
    await requirePermission(supabase, user.id, ["super_admin", "content_manager"]);

    const admin = adminSchema(supabase);

    const { data: rows, error: loadErr } = await admin
      .from("content_items")
      .select("*, theme_items(*), collectible_items(*)")
      .eq("publish_status", "published");

    if (loadErr) {
      console.error("[publishCatalogAction] load content_items", loadErr);
      return failure("db_error", MSG_PUBLISH_FAILED);
    }

    const { data: metaRow, error: metaErr } = await admin
      .from("catalog_meta")
      .select("last_version")
      .eq("id", 1)
      .single();

    if (metaErr || metaRow == null) {
      console.error("[publishCatalogAction] catalog_meta", metaErr);
      return failure("db_error", MSG_PUBLISH_FAILED);
    }

    const nextVersion = (metaRow.last_version as number) + 1;
    const builtAt = new Date().toISOString();

    const payload = buildCatalogPayload(
      (rows ?? []) as CatalogContentRow[],
      nextVersion,
      builtAt,
    );

    const json = JSON.stringify(payload);
    const sha = createHash("sha256").update(json).digest("hex");

    const { error: insertErr } = await admin.from("store_catalog").insert({
      catalog_version: nextVersion,
      payload,
      payload_sha256: sha,
      payload_url: "",
      built_by: user.id,
      notes: "MVP inline JSON row",
    });

    if (insertErr) {
      console.error("[publishCatalogAction] store_catalog insert", insertErr);
      return failure("db_error", MSG_PUBLISH_FAILED);
    }

    const { error: bumpErr } = await admin
      .from("catalog_meta")
      .update({ last_version: nextVersion })
      .eq("id", 1);

    if (bumpErr) {
      console.error("[publishCatalogAction] catalog_meta bump", bumpErr);
      return failure("db_error", MSG_PUBLISH_FAILED);
    }

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "catalog.publish",
      entity_type: "store_catalog",
      entity_id: String(nextVersion),
      after: { sha },
    });

    revalidatePath("/admin/publishing/catalog");
    return success({ version: nextVersion });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}
