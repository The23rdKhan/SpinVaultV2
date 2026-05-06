import { PageHeader } from "@/components/admin/page-header";
import { AssignRoleForm } from "@/components/users/assign-role-form";
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

export default async function AdminUsersPage() {
  let users: Array<{ id: string; email: string; display_name: string | null }> = [];
  let roles: Array<{ user_id: string; role: string }> = [];

  try {
    const supabase = await createSupabaseServerClient();
    const admin = adminSchema(supabase);
    const u = await admin
      .from("admin_users")
      .select("id, email, display_name")
      .order("created_at", { ascending: false });
    users = (u.data ?? []) as typeof users;
    const r = await admin.from("admin_roles").select("user_id, role");
    roles = (r.data ?? []) as typeof roles;
  } catch {
    users = [];
    roles = [];
  }

  const roleMap = new Map<string, string[]>();
  for (const row of roles) {
    const arr = roleMap.get(row.user_id) ?? [];
    arr.push(row.role);
    roleMap.set(row.user_id, arr);
  }

  return (
    <div>
      <PageHeader
        title="Admin users"
        subtitle="Identity rows mirror Supabase Auth — roles grant dashboard access ([§C])."
      />
      <div className="bg-card mt-6 rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>UUID</TableHead>
              <TableHead>Roles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No rows — finish bootstrap or check migrations.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="font-mono text-xs">{u.id}</TableCell>
                  <TableCell className="text-sm">
                    {(roleMap.get(u.id) ?? []).join(", ") || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AssignRoleForm />
    </div>
  );
}
