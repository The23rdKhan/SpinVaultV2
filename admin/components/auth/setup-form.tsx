"use client";

import { useActionState } from "react";
import Link from "next/link";

import { verifySetupToken, type SetupVerifyState } from "@/app/setup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: SetupVerifyState = { ok: false, message: "" };

export function SetupForm() {
  const [state, action, pending] = useActionState(verifySetupToken, initial);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token">Setup token</Label>
          <Input
            id="token"
            name="token"
            type="password"
            autoComplete="off"
            required
            placeholder="From ADMIN_SETUP_TOKEN"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Checking…" : "Verify token"}
        </Button>
        {!state.ok && state.message ? (
          <p className="text-destructive text-center text-sm" role="alert">
            {state.message}
          </p>
        ) : null}
      </form>

      {state.ok ? (
        <div className="bg-muted/60 space-y-3 rounded-lg border p-4 text-sm">
          <p className="font-medium">Token verified.</p>
          <p className="text-muted-foreground">
            Continue to sign in with the same email you&apos;ll use as the first super admin.
            After the magic link completes, this browser session will receive{" "}
            <code className="text-xs">super_admin</code>.
          </p>
          <Button asChild className="w-full">
            <Link href="/login?next=/admin/dashboard">Go to sign in</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
