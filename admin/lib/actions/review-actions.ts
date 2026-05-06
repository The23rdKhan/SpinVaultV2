"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { failure, success, type ActionResult } from "@/lib/actions/result";
import {
  MSG_FORBIDDEN,
  MSG_PUBLISH_FAILED,
  MSG_SAVE_FAILED,
} from "@/lib/actions/safe-action-message";
import { PermissionError, requirePermission } from "@/lib/auth/require-permission";
import { insertAuditLog } from "@/lib/data/audit-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

async function loadItem(supabase: SupabaseClient, id: string) {
  const admin = adminSchema(supabase);
  return admin
    .from("content_items")
    .select("*, theme_items(*), collectible_items(*)")
    .eq("id", id)
    .single();
}

export async function submitForQaAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return failure("unauthorized", "Sign in required.");
    }
    await requirePermission(supabase, user.id, [
      "super_admin",
      "content_manager",
      "artist_designer",
    ]);

    const admin = adminSchema(supabase);
    const { error } = await admin
      .from("content_items")
      .update({
        publish_status: "qa_review",
        qa_status: "in_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[submitForQaAction] update", error);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "review.submit_qa",
      entity_type: "content_item",
      entity_id: id,
    });

    revalidatePath(`/admin/content`);
    return success({ id });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}

export async function approveQaAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return failure("unauthorized", "Sign in required.");
    }
    await requirePermission(supabase, user.id, ["super_admin", "qa_reviewer"]);

    const admin = adminSchema(supabase);
    const { error } = await admin
      .from("content_items")
      .update({
        qa_status: "approved",
        publish_status: "legal_review",
        legal_status: "in_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[approveQaAction] update", error);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    await admin.from("content_reviews").insert({
      content_item_id: id,
      gate: "qa",
      status: "approved",
      reviewer_id: user.id,
      notes: "QA approved",
    });

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "review.qa_approve",
      entity_type: "content_item",
      entity_id: id,
    });

    revalidatePath(`/admin/reviews`);
    return success({ id });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}

export async function rejectQaAction(
  id: string,
  notes: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return failure("unauthorized", "Sign in required.");
    }
    await requirePermission(supabase, user.id, ["super_admin", "qa_reviewer"]);

    const admin = adminSchema(supabase);
    const { error } = await admin
      .from("content_items")
      .update({
        qa_status: "rejected",
        publish_status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[rejectQaAction] update", error);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    await admin.from("content_reviews").insert({
      content_item_id: id,
      gate: "qa",
      status: "rejected",
      reviewer_id: user.id,
      notes,
    });

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "review.qa_reject",
      entity_type: "content_item",
      entity_id: id,
      after: { notes },
    });

    revalidatePath(`/admin/reviews`);
    return success({ id });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}

export async function approveLegalAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return failure("unauthorized", "Sign in required.");
    }
    await requirePermission(supabase, user.id, ["super_admin", "legal_compliance"]);

    const admin = adminSchema(supabase);
    const { error } = await admin
      .from("content_items")
      .update({
        legal_status: "approved",
        publish_status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[approveLegalAction] update", error);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    await admin.from("content_reviews").insert({
      content_item_id: id,
      gate: "legal",
      status: "approved",
      reviewer_id: user.id,
      notes: "Legal approved",
    });

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "review.legal_approve",
      entity_type: "content_item",
      entity_id: id,
    });

    revalidatePath(`/admin/reviews`);
    return success({ id });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}

export async function rejectLegalAction(
  id: string,
  notes: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return failure("unauthorized", "Sign in required.");
    }
    await requirePermission(supabase, user.id, ["super_admin", "legal_compliance"]);

    const admin = adminSchema(supabase);
    const { error } = await admin
      .from("content_items")
      .update({
        legal_status: "rejected",
        publish_status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[rejectLegalAction] update", error);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    await admin.from("content_reviews").insert({
      content_item_id: id,
      gate: "legal",
      status: "rejected",
      reviewer_id: user.id,
      notes,
    });

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "review.legal_reject",
      entity_type: "content_item",
      entity_id: id,
      after: { notes },
    });

    revalidatePath(`/admin/reviews`);
    return success({ id });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}

export async function publishItemAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return failure("unauthorized", "Sign in required.");
    }
    await requirePermission(supabase, user.id, ["super_admin", "content_manager"]);

    const { data: row, error: loadErr } = await loadItem(supabase, id);
    if (loadErr || !row) {
      return failure("not_found", "Item not found");
    }

    if (row.qa_status !== "approved" || row.legal_status !== "approved") {
      return failure(
        "publish_gate",
        "QA and Legal must both be approved before publishing.",
      );
    }

    const admin = adminSchema(supabase);

    const { data: lastPv } = await admin
      .from("publish_versions")
      .select("version")
      .eq("content_item_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (lastPv?.version ?? 0) + 1;

    const { data: meta } = await admin
      .from("catalog_meta")
      .select("last_version")
      .eq("id", 1)
      .single();

    const catalogVersion = meta?.last_version ?? 0;

    const { data: pvRow, error: pvErr } = await admin
      .from("publish_versions")
      .insert({
        content_item_id: id,
        version: nextVersion,
        snapshot: row,
        catalog_version: catalogVersion,
        published_by: user.id,
      })
      .select("id")
      .single();

    if (pvErr || !pvRow) {
      console.error("[publishItemAction] publish_versions insert", pvErr);
      return failure("db_error", MSG_PUBLISH_FAILED);
    }

    const { error } = await admin
      .from("content_items")
      .update({
        publish_status: "published",
        current_version_id: pvRow.id as string,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[publishItemAction] content_items update", error);
      return failure("db_error", MSG_PUBLISH_FAILED);
    }

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "content.publish",
      entity_type: "content_item",
      entity_id: id,
      after: { publish_version: nextVersion },
    });

    revalidatePath(`/admin/publishing`);
    return success({ id });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}
