import type { AdminRole } from "./types";

/** Shared helper — safe for client components ([§C] UI gates). */
export function hasAnyRole(
  roles: readonly AdminRole[],
  allowed: readonly AdminRole[],
): boolean {
  return roles.some((r) => allowed.includes(r));
}
