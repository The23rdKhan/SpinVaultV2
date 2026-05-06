import Link from "next/link";

import { SetupForm } from "@/components/auth/setup-form";
import { adminSchema } from "@/lib/supabase/admin-db";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export default async function SetupPage() {
  let completed = false;
  try {
    const service = createSupabaseServiceClient();
    const admin = adminSchema(service);
    const { data } = await admin
      .from("bootstrap_state")
      .select("completed_at")
      .eq("id", 1)
      .maybeSingle();
    completed = Boolean(data?.completed_at);
  } catch {
    // Missing `SUPABASE_*` at build/prerender or DB unreachable — show bootstrap form.
  }

  if (completed) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-muted/40 px-4 py-16">
        <div className="bg-card text-card-foreground w-full max-w-md rounded-xl border p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Setup already completed</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            This environment has already been bootstrapped. Sign in to access the admin
            dashboard.
          </p>
          <Link
            href="/login"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex h-9 w-full items-center justify-center rounded-md px-4 text-sm font-medium"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-muted/40 px-4 py-16">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-xl border p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Admin bootstrap</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          One-time setup for the first <code className="text-xs">super_admin</code>. Requires{" "}
          <code className="text-xs">ADMIN_SETUP_TOKEN</code> in{" "}
          <code className="text-xs">.env.local</code>.
        </p>
        <div className="mt-8">
          <SetupForm />
        </div>
      </div>
    </div>
  );
}
