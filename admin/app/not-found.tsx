import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link href="/admin/dashboard" className="text-primary text-sm underline-offset-4 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
