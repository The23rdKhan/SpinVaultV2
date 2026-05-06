import { PageHeader } from "@/components/admin/page-header";
import { CATALOG_DISCLOSURES } from "@/lib/legal/catalog-disclosures";

export default function ComplianceSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Compliance rules"
        subtitle="Canonical SCR enforcement — immutable disclosure strings ([§J.5], §Z)."
      />
      <div className="bg-card mt-6 space-y-3 rounded-xl border p-6 text-sm shadow-sm">
        {Object.entries(CATALOG_DISCLOSURES).map(([k, v]) => (
          <div key={k}>
            <p className="text-muted-foreground font-mono text-xs">{k}</p>
            <p>{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
