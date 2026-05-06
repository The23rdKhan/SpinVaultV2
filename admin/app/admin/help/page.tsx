import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        title="Help / Docs"
        subtitle="Authoritative engineering plan + branding references."
      />
      <ul className="mt-6 space-y-3 text-sm">
        <li>
          <Link className="text-primary underline-offset-4 hover:underline" href="/admin/dashboard">
            Dashboard
          </Link>
        </li>
        <li>
          Sprint plan (repo):{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">
            docs/admin-content-dashboard-sprint-plan.md
          </code>
        </li>
        <li>
          Smoke checklist:{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">
            docs/admin-smoke-checklist.md
          </code>
        </li>
      </ul>
    </div>
  );
}
