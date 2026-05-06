import type { WorkflowStatus } from "@/components/admin/status-chip";

/** Maps DB `publish_status` to compact header chips ([§B2.6]). */
export function publishStatusToChip(status: string): WorkflowStatus {
  switch (status) {
    case "qa_review":
      return "qa";
    case "legal_review":
      return "legal";
    case "approved":
    case "scheduled":
      return "approved";
    case "published":
      return "published";
    case "archived":
      return "archived";
    case "rejected":
      return "blocked";
    default:
      return "draft";
  }
}
