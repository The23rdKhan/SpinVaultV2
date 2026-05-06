import Link from "next/link";

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

export default async function QaReviewPage() {
  let rows: Array<{ id: string; slug: string; display_name: string; publish_status: string; category: string }> = [];
  try {
    const supabase = await createSupabaseServerClient();
    const admin = adminSchema(supabase);
    const { data } = await admin
      .from("content_items")
      .select("id, slug, display_name, publish_status, category")
      .eq("publish_status", "qa_review")
      .order("updated_at", { ascending: false })
      .limit(50);
    rows = (data ?? []) as typeof rows;
  } catch {
    rows = [];
  }

  return (
    <div>
      <PageHeader title="QA review" subtitle="Machine + vanity items awaiting QA." />
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
                  Queue empty.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.display_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.slug}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>
                    <StatusChip status={publishStatusToChip(r.publish_status)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={
                          r.category === "theme"
                            ? `/admin/content/themes/${r.slug}`
                            : `/admin/content/collectibles/${r.slug}`
                        }
                      >
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
