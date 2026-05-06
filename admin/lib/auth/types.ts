export const ADMIN_ROLES = [
  "super_admin",
  "content_manager",
  "qa_reviewer",
  "legal_compliance",
  "economy_manager",
  "artist_designer",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}
