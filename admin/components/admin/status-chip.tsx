import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type WorkflowStatus =
  | "draft"
  | "qa"
  | "legal"
  | "approved"
  | "published"
  | "archived"
  | "blocked";

const styles: Record<WorkflowStatus, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  qa: "bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30",
  legal: "bg-violet-500/15 text-violet-900 dark:text-violet-100 border-violet-500/30",
  approved: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 border-emerald-500/30",
  published: "bg-sky-500/15 text-sky-900 dark:text-sky-100 border-sky-500/30",
  archived: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-200 border-zinc-500/25",
  blocked: "bg-destructive/15 text-destructive border-destructive/40",
};

const labels: Record<WorkflowStatus, string> = {
  draft: "Draft",
  qa: "QA",
  legal: "Legal",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
  blocked: "Blocked",
};

export type StatusChipProps = {
  status: WorkflowStatus;
  className?: string;
};

/** Shared workflow chip for lists, headers, and queues ([§B2.6]). */
export function StatusChip({ status, className }: StatusChipProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium capitalize", styles[status], className)}
    >
      {labels[status]}
    </Badge>
  );
}
