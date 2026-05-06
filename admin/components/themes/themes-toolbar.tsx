"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ThemesToolbar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function apply() {
    const params = new URLSearchParams();
    if (value.trim()) {
      params.set("q", value.trim());
    }
    const qs = params.toString();
    router.push(qs ? `/admin/content/themes?${qs}` : "/admin/content/themes");
  }

  return (
    <div className="mt-6 flex max-w-md flex-wrap gap-2">
      <Input
        placeholder="Search slug or title…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            apply();
          }
        }}
      />
      <Button type="button" variant="secondary" onClick={apply}>
        Search
      </Button>
    </div>
  );
}
