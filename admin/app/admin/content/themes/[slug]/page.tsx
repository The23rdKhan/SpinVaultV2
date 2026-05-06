import { notFound } from "next/navigation";

import { ThemeDetailView } from "@/components/themes/theme-detail-view";
import { getAdminContext } from "@/lib/auth/admin-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

async function loadThemeRow(slug: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = adminSchema(supabase);
    const { data, error } = await admin
      .from("content_items")
      .select("*, theme_items(*)")
      .eq("slug", slug)
      .eq("category", "theme")
      .single();

    if (error || !data) {
      return null;
    }

    const ti = data.theme_items as {
      tokens_dark: Record<string, string>;
      tokens_light: Record<string, string>;
    } | null;

    return {
      id: data.id as string,
      slug: data.slug as string,
      display_name: data.display_name as string,
      description: (data.description as string | null) ?? null,
      publish_status: data.publish_status as string,
      qa_status: data.qa_status as string,
      legal_status: data.legal_status as string,
      preview_image_url: (data.preview_image_url as string | null) ?? null,
      thumbnail_url: (data.thumbnail_url as string | null) ?? null,
      full_image_url: (data.full_image_url as string | null) ?? null,
      theme_items: ti
        ? {
            tokens_dark: ti.tokens_dark ?? {},
            tokens_light: ti.tokens_light ?? {},
          }
        : null,
    };
  } catch {
    return null;
  }
}

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getAdminContext();
  if (!ctx) {
    notFound();
  }

  const item = await loadThemeRow(slug);
  if (!item) {
    notFound();
  }

  return <ThemeDetailView roles={ctx.roles} item={item} />;
}
