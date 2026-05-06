import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-muted/30 px-6 py-16">
      <main className="max-w-lg text-center">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          SpinVault
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Admin Content Dashboard
        </h1>
        <p className="text-muted-foreground mt-4 text-base leading-relaxed">
          Internal Next.js app — sign in with Supabase magic link, manage themes & collectibles,
          run gated AI jobs, publish catalog JSON.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="bg-primary text-primary-foreground inline-flex h-10 items-center rounded-md px-5 text-sm font-medium"
          >
            Sign in
          </Link>
          <Link
            href="/setup"
            className="border-input bg-background inline-flex h-10 items-center rounded-md border px-5 text-sm font-medium"
          >
            Bootstrap
          </Link>
        </div>
        <p className="text-muted-foreground mt-10 text-xs">
          Reference:{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.7rem]">
            docs/admin-content-dashboard-sprint-plan.md
          </code>
        </p>
      </main>
    </div>
  );
}
