import { AiKeysBanner } from "@/components/ai/ai-keys-banner";
import { AiSoundStudio } from "@/components/ai/ai-sound-studio";
import { PageHeader } from "@/components/admin/page-header";

export default function AiSoundsPage() {
  return (
    <div>
      <PageHeader
        title="Sound generation"
        subtitle="ElevenLabs SFX adapter — integration stubbed until keys + API wiring land."
      />
      <div className="mt-6 space-y-6">
        <AiKeysBanner kind="sound" />
        <AiSoundStudio />
      </div>
    </div>
  );
}
