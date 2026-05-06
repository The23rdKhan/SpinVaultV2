import { PageHeader } from "@/components/admin/page-header";
import { AuditToolbar } from "@/components/users/audit-toolbar";
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

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string }>;
}) {
  const { action, entity } = await searchParams;

  let rows: Array<{
    id: number;
    action: string;
    entity_type: string;
    entity_id: string;
    at: string;
  }> = [];

  try {
    const supabase = await createSupabaseServerClient();
    const admin = adminSchema(supabase);
    let q = admin
      .from("audit_log")
      .select("id, action, entity_type, entity_id, at")
      .order("at", { ascending: false })
      .limit(100);
    if (action) {
      q = q.ilike("action", `%${action}%`);
    }
    if (entity) {
      q = q.or(`entity_type.ilike.%${entity}%,entity_id.ilike.%${entity}%`);
    }
    const { data } = await q;
    rows = (data ?? []) as typeof rows;
  } catch {
    rows = [];
  }

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Immutable append-only trail ([§M])." />
      <AuditToolbar initialAction={action ?? ""} initialEntity={entity ?? ""} />
      <div className="bg-card mt-6 rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No entries — actions write here after migrations apply.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    {new Date(r.at).toLocaleString()}
                  </TableCell>
                  <TableCell>{r.action}</TableCell>
                  <TableCell>{r.entity_type}</TableCell>
                  <TableCell className="font-mono text-xs">{r.entity_id}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
