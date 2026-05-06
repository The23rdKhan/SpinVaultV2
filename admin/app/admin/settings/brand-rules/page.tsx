import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";

export default function BrandRulesPage() {
  return (
    <div>
      <PageHeader
        title="Brand rules"
        subtitle="Machine-layer boundaries live in repo docs — dashboard cannot edit global shell ([§B])."
      />
      <p className="text-muted-foreground mt-4 text-sm">
        Read{" "}
        <Link
          href="https://github.com/"
          className="text-primary underline-offset-4 hover:underline"
        >
          docs/theme-branding-rules.md
        </Link>{" "}
        in the SpinVault repository (link placeholder — open locally in your editor).
      </p>
    </div>
  );
}
