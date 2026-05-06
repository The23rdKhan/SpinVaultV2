import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminSchema } from "@/lib/supabase/admin-db";

async function countWhere(filters: Record<string, string>) {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = adminSchema(supabase);
    let q = admin.from("content_items").select("*", {
      count: "exact",
      head: true,
    });
    for (const [col, val] of Object.entries(filters)) {
      q = q.eq(col, val);
    }
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function DashboardPage() {
  const qa = await countWhere({ publish_status: "qa_review" });
  const legal = await countWhere({ publish_status: "legal_review" });
  const rejected = await countWhere({ publish_status: "rejected" });
  const ready = await countWhere({
    qa_status: "approved",
    legal_status: "approved",
    publish_status: "approved",
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Today's pipeline — review, publish, and safe releases."
        primaryAction={
          <Button asChild>
            <Link href="/admin/content/themes/new">Create theme</Link>
          </Button>
        }
        secondaryAction={
          <Button variant="outline" asChild>
            <Link href="/admin/content/collectibles/new">Create collectible</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">QA queue</p>
          <p className="mt-2 text-3xl font-semibold">{qa}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">Legal queue</p>
          <p className="mt-2 text-3xl font-semibold">{legal}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">Approved (pre-publish)</p>
          <p className="mt-2 text-3xl font-semibold">{ready}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <p className="text-muted-foreground text-sm">Rejected</p>
          <p className="mt-2 text-3xl font-semibold">{rejected}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h2 className="font-semibold">Quick actions</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" asChild variant="secondary">
              <Link href="/admin/ai/images">Generate image</Link>
            </Button>
            <Button size="sm" asChild variant="secondary">
              <Link href="/admin/ai/sounds">Generate sound</Link>
            </Button>
            <Button size="sm" asChild variant="secondary">
              <Link href="/admin/publishing/catalog">Publish catalog</Link>
            </Button>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h2 className="font-semibold">Review shortcuts</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/reviews/qa">QA</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/reviews/legal">Legal</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/reviews/ready-to-publish">Ready</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
