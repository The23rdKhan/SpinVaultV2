"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import { failure, success, type ActionResult } from "@/lib/actions/result";
import { MSG_FORBIDDEN, MSG_SAVE_FAILED } from "@/lib/actions/safe-action-message";
import { PermissionError, requirePermission } from "@/lib/auth/require-permission";
import { insertAuditLog } from "@/lib/data/audit-log";
import {
  createCollectibleSchema,
  createThemeSchema,
  updateContentItemSchema,
  updateThemeTokensSchema,
} from "@/lib/schemas/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";
import { scanStoreCopy } from "@/lib/validators/copy";
import {
  guardPriceForRarity,
  type Rarity,
} from "@/lib/validators/rarity-price";

const WRITER_ROLES = [
  "super_admin",
  "content_manager",
  "artist_designer",
] as const;

function copyIssuesFromStore(store: {
  tagline?: string;
  shortDescription?: string;
  longDescription?: string;
}) {
  const blob = [store.tagline, store.shortDescription, store.longDescription]
    .filter(Boolean)
    .join("\n");
  return scanStoreCopy(blob);
}

export async function createThemeAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = createThemeSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        "validation_error",
        "Invalid theme payload",
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
    await requirePermission(supabase, user.id, WRITER_ROLES);

    const issues = copyIssuesFromStore(parsed.data.storeCopy);
    if (issues.length) {
      return failure("scr_copy", issues.map((i) => i.message).join(" "));
    }
    const priceGuard = guardPriceForRarity(
      parsed.data.rarity,
      parsed.data.priceCoins ?? null,
    );
    if (!priceGuard.ok) {
      return failure("economy_guard", `${priceGuard.message} (${priceGuard.scr})`);
    }

    const admin = adminSchema(supabase);
    const { data: row, error } = await admin
      .from("content_items")
      .insert({
        slug: parsed.data.slug,
        category: "theme",
        display_name: parsed.data.displayName,
        description: parsed.data.description,
        store_copy: parsed.data.storeCopy,
        rarity: parsed.data.rarity,
        price_coins: parsed.data.priceCoins ?? null,
        created_by: user.id,
        publish_status: "draft",
      })
      .select("id")
      .single();

    if (error || !row) {
      console.error("[createThemeAction] content_items insert", error);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    const tid = row.id as string;

    const { error: extErr } = await admin.from("theme_items").insert({
      content_item_id: tid,
      theme_slug: parsed.data.slug,
      tokens_dark: parsed.data.tokensDark ?? {},
      tokens_light: parsed.data.tokensLight ?? {},
    });

    if (extErr) {
      console.error("[createThemeAction] theme_items insert", extErr);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "theme.create",
      entity_type: "content_item",
      entity_id: tid,
      after: parsed.data,
    });

    revalidatePath("/admin/content/themes");
    return success({ id: tid });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}

export async function createCollectibleAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = createCollectibleSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        "validation_error",
        "Invalid collectible payload",
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
    await requirePermission(supabase, user.id, WRITER_ROLES);

    const issues = copyIssuesFromStore(parsed.data.storeCopy);
    if (issues.length) {
      return failure("scr_copy", issues.map((i) => i.message).join(" "));
    }
    const priceGuard = guardPriceForRarity(
      parsed.data.rarity,
      parsed.data.priceCoins ?? null,
    );
    if (!priceGuard.ok) {
      return failure("economy_guard", `${priceGuard.message} (${priceGuard.scr})`);
    }

    const admin = adminSchema(supabase);
    const { data: row, error } = await admin
      .from("content_items")
      .insert({
        slug: parsed.data.slug,
        category: parsed.data.category,
        display_name: parsed.data.displayName,
        description: parsed.data.description,
        store_copy: parsed.data.storeCopy,
        rarity: parsed.data.rarity,
        price_coins: parsed.data.priceCoins ?? null,
        created_by: user.id,
        publish_status: "draft",
      })
      .select("id")
      .single();

    if (error || !row) {
      console.error("[createCollectibleAction] content_items insert", error);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    const cid = row.id as string;

    const { error: extErr } = await admin.from("collectible_items").insert({
      content_item_id: cid,
      equip_slot: parsed.data.equipSlot,
    });

    if (extErr) {
      console.error("[createCollectibleAction] collectible_items insert", extErr);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "collectible.create",
      entity_type: "content_item",
      entity_id: cid,
      after: parsed.data,
    });

    revalidatePath("/admin/content/collectibles");
    return success({ id: cid });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}

export async function updateContentItemAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = updateContentItemSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        "validation_error",
        "Invalid update payload",
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
    await requirePermission(supabase, user.id, WRITER_ROLES);

    const admin = adminSchema(supabase);
    const { data: existing } = await admin
      .from("content_items")
      .select("id, rarity, store_copy")
      .eq("id", parsed.data.id)
      .single();

    if (!existing) {
      return failure("not_found", "Item not found");
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.displayName != null) {
      patch.display_name = parsed.data.displayName;
    }
    if (parsed.data.description !== undefined) {
      patch.description = parsed.data.description;
    }
    if (parsed.data.storeCopy) {
      const issues = copyIssuesFromStore(parsed.data.storeCopy);
      if (issues.length) {
        return failure("scr_copy", issues.map((i) => i.message).join(" "));
      }
      patch.store_copy = parsed.data.storeCopy;
    }
    const nextRarity = (parsed.data.rarity ?? existing.rarity) as Rarity;
    if (parsed.data.rarity != null) {
      patch.rarity = parsed.data.rarity;
    }
    if (parsed.data.priceCoins !== undefined) {
      const priceGuard = guardPriceForRarity(nextRarity, parsed.data.priceCoins);
      if (!priceGuard.ok) {
        return failure(
          "economy_guard",
          `${priceGuard.message} (${priceGuard.scr})`,
        );
      }
      patch.price_coins = parsed.data.priceCoins;
    }
    if (parsed.data.previewImageUrl !== undefined) {
      patch.preview_image_url = parsed.data.previewImageUrl;
    }
    if (parsed.data.thumbnailUrl !== undefined) {
      patch.thumbnail_url = parsed.data.thumbnailUrl;
    }
    if (parsed.data.fullImageUrl !== undefined) {
      patch.full_image_url = parsed.data.fullImageUrl;
    }

    const { error } = await admin
      .from("content_items")
      .update(patch)
      .eq("id", parsed.data.id);

    if (error) {
      console.error("[updateContentItemAction] content_items update", error);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "content.update",
      entity_type: "content_item",
      entity_id: parsed.data.id,
      before: existing,
      after: patch,
    });

    revalidatePath("/admin/content");
    return success({ id: parsed.data.id });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}

export async function updateThemeTokensAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = updateThemeTokensSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        "validation_error",
        "Invalid tokens",
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
    await requirePermission(supabase, user.id, WRITER_ROLES);

    const admin = adminSchema(supabase);
    const { error } = await admin
      .from("theme_items")
      .update({
        tokens_dark: parsed.data.tokensDark,
        tokens_light: parsed.data.tokensLight,
      })
      .eq("content_item_id", parsed.data.contentItemId);

    if (error) {
      console.error("[updateThemeTokensAction] theme_items update", error);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "theme.tokens_update",
      entity_type: "content_item",
      entity_id: parsed.data.contentItemId,
      after: {
        tokens_dark: parsed.data.tokensDark,
        tokens_light: parsed.data.tokensLight,
      },
    });

    revalidatePath("/admin/content/themes");
    return success({ id: parsed.data.contentItemId });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}

export async function archiveContentItemAction(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
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
    ]);

    const admin = adminSchema(supabase);
    const { error } = await admin
      .from("content_items")
      .update({
        publish_status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);

    if (error) {
      console.error("[archiveContentItemAction] content_items update", error);
      return failure("db_error", MSG_SAVE_FAILED);
    }

    await insertAuditLog(supabase, {
      actor_id: user.id,
      action: "content.archive",
      entity_type: "content_item",
      entity_id: input.id,
    });

    revalidatePath("/admin/content");
    return success({ id: input.id });
  } catch (e) {
    if (e instanceof PermissionError) {
      return failure("forbidden", MSG_FORBIDDEN);
    }
    throw e;
  }
}
