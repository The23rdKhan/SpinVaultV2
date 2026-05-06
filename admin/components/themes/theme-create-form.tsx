"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createThemeAction } from "@/lib/actions/content-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ThemeCreateForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await createThemeAction({
      slug: String(fd.get("slug") ?? ""),
      displayName: String(fd.get("displayName") ?? ""),
      description: String(fd.get("description") ?? ""),
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
    toast.success("Theme draft created");
    router.push(`/admin/content/themes/${fd.get("slug")}`);
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" required placeholder="neon-nights" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" required maxLength={32} />
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
      <div className="space-y-2">
        <Label htmlFor="shortDescription">Short description</Label>
        <Input id="shortDescription" name="shortDescription" maxLength={80} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="longDescription">Long description</Label>
        <Input id="longDescription" name="longDescription" maxLength={200} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create draft"}
      </Button>
    </form>
  );
}
