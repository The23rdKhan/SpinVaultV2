import { TriangleAlertIcon } from "lucide-react";

/** Server-only — reads provider secrets from the Node env (never bundled to the client). */
export function AiKeysBanner({
  kind,
}: {
  kind: "image" | "sound";
}) {
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
  const hasEleven = Boolean(process.env.ELEVENLABS_API_KEY);

  const ok = kind === "image" ? hasOpenAi : hasEleven;
  if (ok) {
    return null;
  }

  const label =
    kind === "image" ? "OPENAI_API_KEY" : "ELEVENLABS_API_KEY";

  return (
    <div
      className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-50"
      role="status"
    >
      <TriangleAlertIcon className="size-5 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">Provider key missing</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed dark:text-amber-100/90">
          Add <code className="font-mono">{label}</code> to{" "}
          <code className="font-mono">admin/.env.local</code> and restart{" "}
          <code className="font-mono">npm run dev</code>. No billable calls ship from CI —
          verify spend locally ([§B2.1] cost gates).
        </p>
      </div>
    </div>
  );
}
