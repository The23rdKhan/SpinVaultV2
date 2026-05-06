"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  archiveContentItemAction,
  updateContentItemAction,
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
import { publishStatusToChip } from "@/lib/publish-status-map";
import type { AdminRole } from "@/lib/auth/types";

export type CollectibleDetailModel = {
  id: string;
  slug: string;
  display_name: string;
  publish_status: string;
  qa_status: string;
  legal_status: string;
  preview_image_url: string | null;
  thumbnail_url: string | null;
  full_image_url: string | null;
  store_copy: { tagline?: string; shortDescription?: string; longDescription?: string };
  collectible_items: { equip_slot: string } | null;
};

export function CollectibleDetailView({
  item,
  roles,
}: {
  item: CollectibleDetailModel;
  roles: readonly AdminRole[];
}) {
  const router = useRouter();
  const chip = publishStatusToChip(item.publish_status) as WorkflowStatus;
  const [rejectNotes, setRejectNotes] = useState("");
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

  async function saveCopy(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await updateContentItemAction({
      id: item.id,
      storeCopy: {
        tagline: String(fd.get("tagline") ?? ""),
        shortDescription: String(fd.get("shortDescription") ?? ""),
        longDescription: String(fd.get("longDescription") ?? ""),
      },
    });
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Store copy saved");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={item.display_name}
        subtitle={`Collectible • ${item.slug} • slot ${item.collectible_items?.equip_slot ?? "—"}`}
        chips={<StatusChip status={chip} />}
        secondaryAction={
          <Button variant="outline" asChild>
            <Link href="/admin/help">Compliance copy</Link>
          </Button>
        }
        primaryAction={
          <DangerConfirmDialog
            title="Archive collectible?"
            description="Archiving removes the item from active pipelines."
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
              router.push("/admin/content/collectibles");
              router.refresh();
            }}
          />
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="asset">Asset</TabsTrigger>
          <TabsTrigger value="copy">Copy</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
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

        <TabsContent value="asset" className="mt-6">
          <p className="text-muted-foreground text-sm">
            Asset uploads: use AI Studio or paste URLs on Overview for MVP.
          </p>
        </TabsContent>

        <TabsContent value="copy" className="mt-6">
          <form onSubmit={(e) => void saveCopy(e)} className="max-w-xl space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                name="tagline"
                maxLength={40}
                defaultValue={item.store_copy.tagline ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short description</Label>
              <Input
                id="shortDescription"
                name="shortDescription"
                maxLength={80}
                defaultValue={item.store_copy.shortDescription ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longDescription">Long description</Label>
              <Input
                id="longDescription"
                name="longDescription"
                maxLength={200}
                defaultValue={item.store_copy.longDescription ?? ""}
              />
            </div>
            <RoleGated
              roles={roles}
              allow={["super_admin", "content_manager", "economy_manager"]}
            >
              <Button type="submit">Save copy</Button>
            </RoleGated>
          </form>
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <p className="text-muted-foreground text-sm">
            Adjust pricing via Overview URLs + economy validators on save — dedicated pricing editor V1.1.
          </p>
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
          <Input
            placeholder="QA rejection notes"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
          />
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
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <p className="text-muted-foreground text-sm">
            See Users → Audit Log for immutable trail ([§M]).
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
