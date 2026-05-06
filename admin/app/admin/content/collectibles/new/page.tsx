import { PageHeader } from "@/components/admin/page-header";
import { CollectibleCreateForm } from "@/components/collectibles/collectible-create-form";

export default function NewCollectiblePage() {
  return (
    <div>
      <PageHeader
        title="Create collectible"
        subtitle="Vanity / profile-layer items — store copy is SCR-scanned on save."
      />
      <div className="mt-8">
        <CollectibleCreateForm />
      </div>
    </div>
  );
}
