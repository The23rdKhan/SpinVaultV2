import { PageHeader } from "@/components/admin/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

export default async function PublishingVersionsPage() {
  let rows: Array<{ catalog_version: number; built_at: string; payload_sha256: string }> = [];
  try {
    const supabase = await createSupabaseServerClient();
    const admin = adminSchema(supabase);
    const { data } = await admin
      .from("store_catalog")
      .select("catalog_version, built_at, payload_sha256")
      .order("catalog_version", { ascending: false })
      .limit(25);
    rows = (data ?? []) as typeof rows;
  } catch {
    rows = [];
  }

  return (
    <div>
      <PageHeader title="Version history" subtitle="Immutable catalog snapshots (MVP = Postgres rows)." />
      <div className="bg-card mt-6 rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Built</TableHead>
              <TableHead>SHA256</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No publishes yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.catalog_version}>
                  <TableCell className="font-mono">{r.catalog_version}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {new Date(r.built_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.payload_sha256}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
