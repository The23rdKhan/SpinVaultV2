"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { estimateElevenLabsSfxCostUsd } from "@/lib/ai/elevenlabs-sfx-cost-estimate";

export function AiSoundStudio() {
  const [prompt, setPrompt] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const estimate = estimateElevenLabsSfxCostUsd({ prompt });

  async function runJob() {
    setPending(true);
    try {
      const res = await fetch("/api/ai/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "sound",
          assetType: "theme.sfx",
          prompt,
          count: 1,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || body.ok === false) {
        toast.error(body.error ?? "Generation failed");
        return;
      }
      toast.success("Sound job finished or queued — check History");
      setConfirmOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid max-w-xl gap-4">
        <div className="space-y-2">
          <Label htmlFor="prompt">SFX prompt</Label>
          <textarea
            id="prompt"
            className="border-input bg-background min-h-[120px] w-full rounded-md border px-3 py-2 text-sm"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={prompt.trim().length < 4}
          onClick={() => setConfirmOpen(true)}
        >
          Review cost…
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm paid generation</DialogTitle>
            <DialogDescription>
              Estimated spend ≈ ${estimate.toFixed(2)} USD (placeholder curve). ElevenLabs adapter is partially wired — expect failures until integration is completed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} onClick={() => void runJob()}>
              {pending ? "Running…" : "Confirm & generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
