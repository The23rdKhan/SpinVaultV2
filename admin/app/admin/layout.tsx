import { redirect } from "next/navigation";

import { AdminChrome } from "@/components/admin/admin-chrome";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminContext } from "@/lib/auth/admin-context";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();

  if (!ctx) {
    redirect("/login?next=/admin/dashboard");
  }

  if (ctx.roles.length === 0) {
    return <NoAccess email={ctx.email} />;
  }

  return (
    <AdminChrome email={ctx.email} roles={ctx.roles}>
      {children}
    </AdminChrome>
  );
}
