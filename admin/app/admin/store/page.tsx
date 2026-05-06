import { PageHeader } from "@/components/admin/page-header";

export default function StoreShellPage() {
  return (
    <div>
      <PageHeader
        title="Store"
        subtitle="Merchandising surfaces ship in V1.1 — MVP keeps this shell only ([NAV-AC-5])."
      />
      <p className="text-muted-foreground text-sm">
        Coming later: catalog slices, featured rows, bundles ([§B2.5]).
      </p>
    </div>
  );
}
