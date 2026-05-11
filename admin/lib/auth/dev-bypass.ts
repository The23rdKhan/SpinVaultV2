/**
 * Local-only auth bypass. Never enable in production.
 *
 * Set in `admin/.env.local`:
 *   ADMIN_SKIP_AUTH=1
 *
 * Requires `NODE_ENV=development` (e.g. `npm run dev`). Uses the service-role
 * client for DB access and skips `/login` + permission checks.
 */

const DEV_USER_ID = "00000000-0000-4000-8000-0000000000b1";

export function isAdminAuthBypass(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ADMIN_SKIP_AUTH === "1"
  );
}

/** Synthetic identity for UI / permission bypass only — not a real `auth.users` row. */
export const ADMIN_DEV_BYPASS_USER = {
  id: DEV_USER_ID,
  email: "dev@local",
} as const;

/** Use for nullable `admin.admin_users` FKs — synthetic dev user is not in that table. */
export function adminUsersFkOrNull(userId: string): string | null {
  if (isAdminAuthBypass()) {
    return null;
  }
  return userId;
}
