"use client";

import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type DisabledReasonProps = {
  /** Shown on hover/focus when the trigger is disabled */
  reason: string;
  children: ReactNode;
};

/**
 * Wraps disabled controls so admins always see *why* an action is blocked ([NAV-AC-2], gates).
 */
export function DisabledReason({ reason, children }: DisabledReasonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* span allows tooltip on disabled buttons */}
        <span className="inline-flex w-full">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {reason}
      </TooltipContent>
    </Tooltip>
  );
}
