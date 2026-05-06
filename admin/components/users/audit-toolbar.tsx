"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuditToolbar({
  initialAction,
  initialEntity,
}: {
  initialAction: string;
  initialEntity: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState(initialAction);
  const [entity, setEntity] = useState(initialEntity);

  function apply() {
    const params = new URLSearchParams();
    if (action.trim()) {
      params.set("action", action.trim());
    }
    if (entity.trim()) {
      params.set("entity", entity.trim());
    }
    const qs = params.toString();
    router.push(qs ? `/admin/users/audit-log?${qs}` : "/admin/users/audit-log");
  }

  return (
    <div className="mt-6 flex max-w-2xl flex-wrap gap-2">
      <Input
        placeholder="Filter action contains…"
        value={action}
        onChange={(e) => setAction(e.target.value)}
      />
      <Input
        placeholder="Filter entity type/id contains…"
        value={entity}
        onChange={(e) => setEntity(e.target.value)}
      />
      <Button type="button" variant="secondary" onClick={apply}>
        Apply
      </Button>
    </div>
  );
}
