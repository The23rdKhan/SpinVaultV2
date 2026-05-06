import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">Forbidden</h1>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        Your role cannot access this resource. Server actions enforce the same matrix ([§C]).
      </p>
      <Link href="/admin/dashboard" className="text-primary text-sm underline-offset-4 hover:underline">
        Dashboard
      </Link>
    </div>
  );
}
