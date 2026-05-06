import { notFound } from "next/navigation";

import { CollectibleDetailView } from "@/components/collectibles/collectible-detail-view";
import { getAdminContext } from "@/lib/auth/admin-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

async function loadCollectibleRow(slug: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = adminSchema(supabase);
    const { data, error } = await admin
      .from("content_items")
      .select("*, collectible_items(*)")
      .eq("slug", slug)
      .neq("category", "theme")
      .single();

    if (error || !data) {
      return null;
    }

    const ci = data.collectible_items as { equip_slot: string } | null;
    const storeCopy =
      (data.store_copy as {
        tagline?: string;
        shortDescription?: string;
        longDescription?: string;
      }) ?? {};

    return {
      id: data.id as string,
      slug: data.slug as string,
      display_name: data.display_name as string,
      publish_status: data.publish_status as string,
      qa_status: data.qa_status as string,
      legal_status: data.legal_status as string,
      preview_image_url: (data.preview_image_url as string | null) ?? null,
      thumbnail_url: (data.thumbnail_url as string | null) ?? null,
      full_image_url: (data.full_image_url as string | null) ?? null,
      store_copy: storeCopy,
      collectible_items: ci,
    };
  } catch {
    return null;
  }
}

export default async function CollectibleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getAdminContext();
  if (!ctx) {
    notFound();
  }

  const item = await loadCollectibleRow(slug);
  if (!item) {
    notFound();
  }

  return <CollectibleDetailView roles={ctx.roles} item={item} />;
}
