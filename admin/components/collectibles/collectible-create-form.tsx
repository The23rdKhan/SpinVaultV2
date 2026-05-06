"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createCollectibleAction } from "@/lib/actions/content-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const categories = [
  "collectible",
  "avatar",
  "frame",
  "badge",
  "title",
  "pet",
  "cabinet",
  "room",
  "car",
  "chest_drop",
  "seasonal_bundle",
] as const;

export function CollectibleCreateForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await createCollectibleAction({
      slug: String(fd.get("slug") ?? ""),
      displayName: String(fd.get("displayName") ?? ""),
      description: String(fd.get("description") ?? ""),
      category: String(fd.get("category") ?? "collectible"),
      equipSlot: String(fd.get("equipSlot") ?? "none"),
      rarity: "common",
      priceCoins: fd.get("priceCoins")
        ? Number(fd.get("priceCoins"))
        : null,
      storeCopy: {
        tagline: String(fd.get("tagline") ?? ""),
        shortDescription: String(fd.get("shortDescription") ?? ""),
        longDescription: String(fd.get("longDescription") ?? ""),
      },
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Collectible draft created");
    router.push(`/admin/content/collectibles/${fd.get("slug")}`);
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" required placeholder="gold-frame-seasonal" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" required maxLength={32} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
          defaultValue="collectible"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="equipSlot">Equip slot</Label>
        <select
          id="equipSlot"
          name="equipSlot"
          className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
          defaultValue="none"
        >
          {[
            "none",
            "avatar",
            "frame",
            "badge",
            "title",
            "pet",
            "cabinet_skin",
            "room_bg",
            "car",
          ].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Internal description</Label>
        <Input id="description" name="description" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="priceCoins">Price (coins)</Label>
        <Input id="priceCoins" name="priceCoins" type="number" min={0} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tagline">Store tagline</Label>
        <Input id="tagline" name="tagline" maxLength={40} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create draft"}
      </Button>
    </form>
  );
}
