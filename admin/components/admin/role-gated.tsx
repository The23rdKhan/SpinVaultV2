"use client";

import { cloneElement, type ReactElement } from "react";

import type { AdminRole } from "@/lib/auth/types";
import { hasAnyRole } from "@/lib/auth/permissions-shared";

import { DisabledReason } from "./disabled-reason";

export type RoleGatedProps = {
  roles: readonly AdminRole[];
  allow: readonly AdminRole[];
  reason?: string;
  children: ReactElement<{ disabled?: boolean }>;
};

/** Client-side affordance gate; server actions still enforce {@link requirePermission}. */
export function RoleGated({
  roles,
  allow,
  reason = "Your role cannot perform this action.",
  children,
}: RoleGatedProps) {
  const ok = hasAnyRole(roles, allow);
  if (ok) {
    return children;
  }
  return (
    <DisabledReason reason={reason}>
      {cloneElement(children, { disabled: true })}
    </DisabledReason>
  );
}
