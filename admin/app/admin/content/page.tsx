import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";

export default function ContentHubPage() {
  return (
    <div>
      <PageHeader
        title="Content"
        subtitle="Themes and collectibles that ship to the mobile catalog."
        primaryAction={
          <Button asChild>
            <Link href="/admin/content/themes/new">New theme</Link>
          </Button>
        }
        secondaryAction={
          <Button variant="outline" asChild>
            <Link href="/admin/content/collectibles/new">New collectible</Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/content/themes"
          className="bg-card hover:bg-muted/60 rounded-xl border p-6 shadow-sm transition-colors"
        >
          <h2 className="text-lg font-semibold">Themes</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Machine skins — bounded tokens only ([SCR-4]).
          </p>
        </Link>
        <Link
          href="/admin/content/collectibles"
          className="bg-card hover:bg-muted/60 rounded-xl border p-6 shadow-sm transition-colors"
        >
          <h2 className="text-lg font-semibold">Collectibles</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Profile / store cosmetics with rarity + pricing guards.
          </p>
        </Link>
      </div>
    </div>
  );
}
