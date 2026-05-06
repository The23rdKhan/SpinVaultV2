import { PageHeader } from "@/components/admin/page-header";
import { ThemeCreateForm } from "@/components/themes/theme-create-form";

export default function NewThemePage() {
  return (
    <div>
      <PageHeader
        title="Create theme"
        subtitle="Draft a machine skin — tokens are constrained to MACHINE_OVERRIDE_KEYS ([SCR-4])."
      />
      <div className="mt-8">
        <ThemeCreateForm />
      </div>
    </div>
  );
}
