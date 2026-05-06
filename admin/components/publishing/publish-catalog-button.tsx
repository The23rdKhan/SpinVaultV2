"use client";

import { useState } from "react";
import { toast } from "sonner";

import { publishCatalogAction } from "@/lib/actions/catalog-actions";
import { Button } from "@/components/ui/button";

export function PublishCatalogButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const res = await publishCatalogAction();
        setPending(false);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }
        toast.success(`Catalog v${res.data.version} published`);
      }}
    >
      {pending ? "Publishing…" : "Rebuild catalog"}
    </Button>
  );
}
