"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DangerConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  /** User must type this exact string (e.g. item slug). */
  match: string;
  onConfirm: () => void | Promise<void>;
};

/** Double-confirm destructive flows ([§B2], archive / publish guards). */
export function DangerConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  match,
  onConfirm,
}: DangerConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);

  const enabled = value.trim() === match;

  async function handleConfirm() {
    if (!enabled) {
      return;
    }
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
      setValue("");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="danger-match">
            Type <code className="text-xs">{match}</code> to confirm
          </Label>
          <Input
            id="danger-match"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!enabled || pending}
            onClick={() => void handleConfirm()}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
