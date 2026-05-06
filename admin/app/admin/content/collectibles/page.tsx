import Link from "next/link";

import { CollectiblesToolbar } from "@/components/collectibles/collectibles-toolbar";
import { PageHeader } from "@/components/admin/page-header";
import { StatusChip } from "@/components/admin/status-chip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { publishStatusToChip } from "@/lib/publish-status-map";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

export default async function CollectiblesListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let rows: Array<{
    id: string;
    slug: string;
    display_name: string;
    category: string;
    publish_status: string;
  }> = [];

  try {
    const supabase = await createSupabaseServerClient();
    const admin = adminSchema(supabase);
    let query = admin
      .from("content_items")
      .select("id, slug, display_name, category, publish_status")
      .neq("category", "theme")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (q) {
      query = query.or(`slug.ilike.%${q}%,display_name.ilike.%${q}%`);
    }
    const { data } = await query;
    rows = (data ?? []) as typeof rows;
  } catch {
    rows = [];
  }

  return (
    <div>
      <PageHeader
        title="Collectibles"
        subtitle="Profile and store cosmetics — assets, pricing, unlocks."
        primaryAction={
          <Button asChild>
            <Link href="/admin/content/collectibles/new">Create collectible</Link>
          </Button>
        }
      />
      <CollectiblesToolbar initialQuery={q ?? ""} />
      <div className="bg-card mt-6 rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No collectibles yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.display_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.slug}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>
                    <StatusChip
                      status={publishStatusToChip(r.publish_status)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/content/collectibles/${r.slug}`}>
                        Open
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
