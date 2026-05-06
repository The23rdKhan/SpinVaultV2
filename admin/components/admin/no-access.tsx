import Link from "next/link";

import { Button } from "@/components/ui/button";

export type NoAccessProps = {
  email: string;
};

/** Shown when `admin_users` exists but no `admin_roles` rows ([§C]). */
export function NoAccess({ email }: NoAccessProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-6">
      <div className="bg-card max-w-md rounded-xl border p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Access pending</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Signed in as <span className="text-foreground font-medium">{email}</span>, but no admin role is assigned yet.
          Ask a <code className="text-xs">super_admin</code> to grant access in{" "}
          <Link href="/admin/users/admins" className="text-primary underline-offset-4 hover:underline">
            Admin Users
          </Link>
          .
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
