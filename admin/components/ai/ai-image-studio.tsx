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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { estimateOpenAiImageCostUsd } from "@/lib/ai/openai-image-cost-estimate";

/**
 * Paid generation UX — estimate + explicit confirm ([NAV-AC-3]).
 */
export function AiImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [count, setCount] = useState<1 | 2 | 4>(1);
  const [assetType, setAssetType] = useState("theme.preview");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const estimate = estimateOpenAiImageCostUsd({
    prompt,
    negativePrompt: negative,
    count,
    aspectRatio: "1024x1024",
  });

  async function runJob() {
    setPending(true);
    try {
      const res = await fetch("/api/ai/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "image",
          assetType,
          prompt,
          negativePrompt: negative || undefined,
          aspectRatio: "1024x1024",
          count,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; jobId?: string };
      if (!res.ok || body.ok === false) {
        toast.error(body.error ?? "Generation failed");
        return;
      }
      toast.success(`Job started (${body.jobId ?? "?"}) — check History`);
      setConfirmOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid max-w-xl gap-4">
        <div className="space-y-2">
          <Label htmlFor="assetType">Asset type</Label>
          <Input
            id="assetType"
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prompt">Prompt</Label>
          <textarea
            id="prompt"
            className="border-input bg-background min-h-[120px] w-full rounded-md border px-3 py-2 text-sm"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="negative">Negative prompt</Label>
          <Input
            id="negative"
            value={negative}
            onChange={(e) => setNegative(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Candidate count</Label>
          <div className="flex gap-2">
            {([1, 2, 4] as const).map((n) => (
              <Button
                key={n}
                type="button"
                variant={count === n ? "default" : "outline"}
                size="sm"
                onClick={() => setCount(n)}
              >
                {n}
              </Button>
            ))}
          </div>
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
              Estimated spend ≈ ${estimate.toFixed(2)} USD for {count} candidate
              {count > 1 ? "s" : ""}. This charges your org&apos;s OpenAI account.
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
