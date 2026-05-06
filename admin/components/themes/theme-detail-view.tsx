"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  archiveContentItemAction,
  updateContentItemAction,
  updateThemeTokensAction,
} from "@/lib/actions/content-items";
import {
  approveLegalAction,
  approveQaAction,
  publishItemAction,
  rejectLegalAction,
  rejectQaAction,
  submitForQaAction,
} from "@/lib/actions/review-actions";
import { DangerConfirmDialog } from "@/components/admin/danger-confirm-dialog";
import { DisabledReason } from "@/components/admin/disabled-reason";
import { PageHeader } from "@/components/admin/page-header";
import { RoleGated } from "@/components/admin/role-gated";
import { StatusChip, type WorkflowStatus } from "@/components/admin/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MACHINE_OVERRIDE_KEYS } from "@/lib/constants/theme-tokens";
import { publishStatusToChip } from "@/lib/publish-status-map";
import type { AdminRole } from "@/lib/auth/types";

export type ThemeDetailModel = {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  publish_status: string;
  qa_status: string;
  legal_status: string;
  preview_image_url: string | null;
  thumbnail_url: string | null;
  full_image_url: string | null;
  theme_items: {
    tokens_dark: Record<string, string>;
    tokens_light: Record<string, string>;
  } | null;
};

export function ThemeDetailView({
  item,
  roles,
}: {
  item: ThemeDetailModel;
  roles: readonly AdminRole[];
}) {
  const router = useRouter();
  const chip = publishStatusToChip(item.publish_status) as WorkflowStatus;
  const [rejectNotes, setRejectNotes] = useState("");

  const defaultDark = useMemo(() => {
    const base: Record<string, string> = {};
    for (const k of MACHINE_OVERRIDE_KEYS) {
      base[k] = item.theme_items?.tokens_dark?.[k] ?? "#000000";
    }
    return base;
  }, [item.theme_items]);

  const defaultLight = useMemo(() => {
    const base: Record<string, string> = {};
    for (const k of MACHINE_OVERRIDE_KEYS) {
      base[k] = item.theme_items?.tokens_light?.[k] ?? "#ffffff";
    }
    return base;
  }, [item.theme_items]);

  const gatesReady =
    item.qa_status === "approved" && item.legal_status === "approved";

  async function saveOverview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await updateContentItemAction({
      id: item.id,
      displayName: String(fd.get("displayName") ?? ""),
      thumbnailUrl: String(fd.get("thumbnailUrl") ?? "") || null,
      fullImageUrl: String(fd.get("fullImageUrl") ?? "") || null,
      previewImageUrl: String(fd.get("previewImageUrl") ?? "") || null,
    });
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Saved");
    router.refresh();
  }

  async function saveTokens(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dark: Record<string, string> = {};
    const light: Record<string, string> = {};
    for (const k of MACHINE_OVERRIDE_KEYS) {
      dark[k] = String(fd.get(`dark_${k}`) ?? "");
      light[k] = String(fd.get(`light_${k}`) ?? "");
    }
    const res = await updateThemeTokensAction({
      contentItemId: item.id,
      tokensDark: dark as never,
      tokensLight: light as never,
    });
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Tokens saved ([SCR-4] bounded keys)");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={item.display_name}
        subtitle={`Machine theme • ${item.slug}`}
        chips={<StatusChip status={chip} />}
        secondaryAction={
          <Button variant="outline" asChild>
            <Link href="/admin/help">Theme rules</Link>
          </Button>
        }
        primaryAction={
          <DangerConfirmDialog
            title="Archive theme?"
            description="Archiving removes the item from active pipelines. Catalog must be rebuilt separately."
            confirmLabel="Archive"
            match={item.slug}
            trigger={<Button variant="destructive">Archive</Button>}
            onConfirm={async () => {
              const res = await archiveContentItemAction({ id: item.id });
              if (!res.ok) {
                toast.error(res.error.message);
                return;
              }
              toast.success("Archived");
              router.push("/admin/content/themes");
              router.refresh();
            }}
          />
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="qa">QA</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
          <TabsTrigger value="publish">Publish</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <form onSubmit={(e) => void saveOverview(e)} className="max-w-xl space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={item.display_name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previewImageUrl">Preview URL</Label>
              <Input
                id="previewImageUrl"
                name="previewImageUrl"
                defaultValue={item.preview_image_url ?? ""}
                placeholder="https://"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
              <Input
                id="thumbnailUrl"
                name="thumbnailUrl"
                defaultValue={item.thumbnail_url ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullImageUrl">Hero URL</Label>
              <Input
                id="fullImageUrl"
                name="fullImageUrl"
                defaultValue={item.full_image_url ?? ""}
              />
            </div>
            <RoleGated
              roles={roles}
              allow={["super_admin", "content_manager", "artist_designer"]}
            >
              <Button type="submit">Save overview</Button>
            </RoleGated>
          </form>
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          <p className="text-muted-foreground text-sm">
            Upload generated candidates via AI Studio, then paste signed URLs here on Overview for MVP.
          </p>
        </TabsContent>

        <TabsContent value="tokens" className="mt-6">
          <form onSubmit={(e) => void saveTokens(e)} className="grid max-w-3xl gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Dark tokens</h3>
              <div className="space-y-3">
                {MACHINE_OVERRIDE_KEYS.map((k) => (
                  <div key={`dark-${k}`} className="space-y-1">
                    <Label htmlFor={`dark_${k}`}>{k}</Label>
                    <Input
                      id={`dark_${k}`}
                      name={`dark_${k}`}
                      defaultValue={defaultDark[k]}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold">Light tokens</h3>
              <div className="space-y-3">
                {MACHINE_OVERRIDE_KEYS.map((k) => (
                  <div key={`light-${k}`} className="space-y-1">
                    <Label htmlFor={`light_${k}`}>{k}</Label>
                    <Input
                      id={`light_${k}`}
                      name={`light_${k}`}
                      defaultValue={defaultLight[k]}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
            <RoleGated
              roles={roles}
              allow={["super_admin", "content_manager", "artist_designer"]}
            >
              <Button type="submit" className="md:col-span-2">
                Save tokens
              </Button>
            </RoleGated>
          </form>
        </TabsContent>

        <TabsContent value="qa" className="mt-6 space-y-4">
          <RoleGated roles={roles} allow={["super_admin", "content_manager", "artist_designer"]}>
            <Button
              type="button"
              onClick={async () => {
                const res = await submitForQaAction(item.id);
                if (!res.ok) {
                  toast.error(res.error.message);
                  return;
                }
                toast.success("Submitted to QA");
                router.refresh();
              }}
            >
              Submit for QA
            </Button>
          </RoleGated>
          <RoleGated roles={roles} allow={["super_admin", "qa_reviewer"]}>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const res = await approveQaAction(item.id);
                  if (!res.ok) {
                    toast.error(res.error.message);
                    return;
                  }
                  toast.success("QA approved");
                  router.refresh();
                }}
              >
                Approve QA
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  const res = await rejectQaAction(item.id, rejectNotes || "Rejected");
                  if (!res.ok) {
                    toast.error(res.error.message);
                    return;
                  }
                  toast.success("QA rejected");
                  router.refresh();
                }}
              >
                Reject QA
              </Button>
            </div>
          </RoleGated>
          <div className="space-y-2">
            <Label htmlFor="rejectQaNotes">QA rejection notes</Label>
            <Input
              id="rejectQaNotes"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
          </div>
        </TabsContent>

        <TabsContent value="legal" className="mt-6 space-y-4">
          <RoleGated roles={roles} allow={["super_admin", "legal_compliance"]}>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const res = await approveLegalAction(item.id);
                  if (!res.ok) {
                    toast.error(res.error.message);
                    return;
                  }
                  toast.success("Legal approved");
                  router.refresh();
                }}
              >
                Approve Legal
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  const res = await rejectLegalAction(item.id, rejectNotes || "Rejected");
                  if (!res.ok) {
                    toast.error(res.error.message);
                    return;
                  }
                  toast.success("Legal rejected");
                  router.refresh();
                }}
              >
                Reject Legal
              </Button>
            </div>
          </RoleGated>
        </TabsContent>

        <TabsContent value="publish" className="mt-6 space-y-4">
          {!gatesReady ? (
            <DisabledReason reason="Requires QA + Legal approved ([NAV-AC-2]).">
              <Button disabled>Publish item</Button>
            </DisabledReason>
          ) : (
            <RoleGated roles={roles} allow={["super_admin", "content_manager"]}>
              <Button
                type="button"
                onClick={async () => {
                  const res = await publishItemAction(item.id);
                  if (!res.ok) {
                    toast.error(res.error.message);
                    return;
                  }
                  toast.success("Item marked published");
                  router.refresh();
                }}
              >
                Mark published
              </Button>
            </RoleGated>
          )}
          <p className="text-muted-foreground text-xs">
            Publishing the catalog JSON is separate — see Publishing → Catalog ([§L.6]).
          </p>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <p className="text-muted-foreground text-sm">
            Audit entries appear in Users → Audit Log filtered by this slug in V1.1 filters; MVP uses global audit.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
