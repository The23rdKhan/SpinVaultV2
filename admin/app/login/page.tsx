import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-muted/40 px-4 py-16">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-xl border p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">SpinVault Admin</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Sign in with a magic link sent to your email.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={<p className="text-muted-foreground text-sm">Loading sign-in…</p>}
          >
            <LoginForm />
          </Suspense>
        </div>
        <p className="text-muted-foreground mt-8 text-center text-xs">
          First-time environment? Run{" "}
          <Link href="/setup" className="text-primary underline-offset-4 hover:underline">
            one-time setup
          </Link>{" "}
          with your admin token.
        </p>
      </div>
    </div>
  );
}
