import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { ThemesToolbar } from "@/components/themes/themes-toolbar";
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
import { StatusChip } from "@/components/admin/status-chip";

export default async function ThemesListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let rows: Array<{
    id: string;
    slug: string;
    display_name: string;
    publish_status: string;
    updated_at: string;
  }> = [];

  try {
    const supabase = await createSupabaseServerClient();
    const admin = adminSchema(supabase);
    let query = admin
      .from("content_items")
      .select("id, slug, display_name, publish_status, updated_at")
      .eq("category", "theme")
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
        title="Themes"
        subtitle="Slot-machine skins for the Play screen — not app rebrands."
        primaryAction={
          <Button asChild>
            <Link href="/admin/content/themes/new">Create theme</Link>
          </Button>
        }
        secondaryAction={
          <Button variant="outline" asChild>
            <Link href="/admin/help">View rules</Link>
          </Button>
        }
      />

      <ThemesToolbar initialQuery={q ?? ""} />

      <div className="bg-card mt-6 rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No themes yet — create one or check Supabase connectivity.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.display_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.slug}</TableCell>
                  <TableCell>
                    <StatusChip
                      status={publishStatusToChip(r.publish_status)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/content/themes/${r.slug}`}>Open</Link>
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
