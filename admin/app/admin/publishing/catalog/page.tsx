import { PageHeader } from "@/components/admin/page-header";
import { PublishCatalogButton } from "@/components/publishing/publish-catalog-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

type LatestCatalogRow = {
  catalog_version: number;
  built_at: string;
};

export default async function PublishingCatalogPage() {
  let latest: LatestCatalogRow | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const admin = adminSchema(supabase);
    const { data } = await admin
      .from("store_catalog")
      .select("catalog_version, built_at")
      .order("catalog_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    latest = (data as LatestCatalogRow | null) ?? null;
  } catch {
    latest = null;
  }

  return (
    <div>
      <PageHeader
        title="Catalog"
        subtitle="Rebuild versioned JSON consumed by `/api/catalog/v1/*` ([§N.1])."
        primaryAction={<PublishCatalogButton />}
      />
      <div className="bg-card mt-6 rounded-xl border p-6 text-sm shadow-sm">
        <p>
          Latest catalog version:{" "}
          <span className="font-mono font-semibold">
            {latest ? latest.catalog_version : "—"}
          </span>
        </p>
        {latest?.built_at ? (
          <p className="text-muted-foreground mt-2">
            Built at {new Date(latest.built_at).toLocaleString()}
          </p>
        ) : null}
        <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
          Mobile hook-up is deferred — see `docs/admin-smoke-checklist.md` ([p6-mobile-catalog]).
        </p>
      </div>
    </div>
  );
}
