import { PageHeader } from "@/components/admin/page-header";

export default function ProviderSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Provider settings"
        subtitle="Secrets stay in `.env.local` / Supabase Vault — this page lists non-secret toggles only ([§L])."
      />
      <ul className="text-muted-foreground mt-4 list-inside list-disc text-sm">
        <li>OpenAI image adapter — configured via OPENAI_API_KEY</li>
        <li>ElevenLabs SFX — configured via ELEVENLABS_API_KEY</li>
      </ul>
    </div>
  );
}
