import { PageHeader } from "@/components/admin/page-header";
import { getAdminEnvLabel } from "@/lib/env/admin-env";

export default function EnvironmentSettingsPage() {
  const env = getAdminEnvLabel();
  return (
    <div>
      <PageHeader
        title="Environment"
        subtitle="Mapped from NEXT_PUBLIC_ADMIN_ENV — never prints secrets ([§B2.2])."
      />
      <div className="bg-card mt-6 rounded-xl border p-6 shadow-sm">
        <p className="text-sm">
          Active label: <span className="font-semibold">{env}</span>
        </p>
        <p className="text-muted-foreground mt-3 text-xs">
          Configure Supabase keys in `admin/.env.local` and expose the `admin` schema via Supabase API settings.
        </p>
      </div>
    </div>
  );
}
