import { AiImageStudio } from "@/components/ai/ai-image-studio";
import { AiKeysBanner } from "@/components/ai/ai-keys-banner";
import { PageHeader } from "@/components/admin/page-header";

export default function AiImagesPage() {
  return (
    <div>
      <PageHeader
        title="Image generation"
        subtitle="Provider-backed art with estimate + confirm ([NAV-AC-3])."
      />
      <div className="mt-6 space-y-6">
        <AiKeysBanner kind="image" />
        <AiImageStudio />
      </div>
    </div>
  );
}
