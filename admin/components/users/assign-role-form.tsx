"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { assignRoleAction } from "@/lib/actions/role-actions";
import { ADMIN_ROLES, type AdminRole } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AssignRoleForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await assignRoleAction({
      userId: String(fd.get("userId")),
      role: String(fd.get("role")) as AdminRole,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Role assigned");
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="bg-card mt-8 max-w-xl space-y-4 rounded-xl border p-6"
    >
      <h2 className="text-lg font-semibold">Assign role</h2>
      <div className="space-y-2">
        <Label htmlFor="userId">User UUID</Label>
        <Input id="userId" name="userId" required placeholder="auth.users.id" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
        >
          {ADMIN_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Grant role"}
      </Button>
    </form>
  );
}
