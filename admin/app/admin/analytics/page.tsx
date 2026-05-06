import { PageHeader } from "@/components/admin/page-header";

export default function AnalyticsPlaceholderPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Insights dashboards are phased ([§B2.5] — V2.0)."
      />
      <p className="text-muted-foreground text-sm">
        Disabled in MVP navigation per NAV-AC-5; route exists for direct URL testing only.
      </p>
    </div>
  );
}
