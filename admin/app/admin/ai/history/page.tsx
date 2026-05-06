import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
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

export default async function AiHistoryPage() {
  let rows: Array<{
    id: string;
    kind: string;
    status: string;
    provider: string;
    created_at: string;
    cost_estimate_usd: number | null;
  }> = [];

  try {
    const supabase = await createSupabaseServerClient();
    const admin = adminSchema(supabase);
    const { data } = await admin
      .from("asset_generation_jobs")
      .select("id, kind, status, provider, created_at, cost_estimate_usd")
      .order("created_at", { ascending: false })
      .limit(50);
    rows = (data ?? []) as typeof rows;
  } catch {
    rows = [];
  }

  return (
    <div>
      <PageHeader title="Generation history" subtitle="Recent AI jobs + audit metadata." />
      <div className="bg-card mt-6 rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Est. USD</TableHead>
              <TableHead className="text-right">Job</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No jobs yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    {new Date(r.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{r.kind}</TableCell>
                  <TableCell>{r.provider}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    {r.cost_estimate_usd != null ? r.cost_estimate_usd.toFixed(4) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/ai/history#${r.id}`}>Open</Link>
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
