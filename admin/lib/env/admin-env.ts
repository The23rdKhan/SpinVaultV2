/**
 * Display-only environment chip ([§B2.2]). Never surface secrets.
 */
export function getAdminEnvLabel(): "Local" | "Staging" | "Production" {
  const raw = (process.env.NEXT_PUBLIC_ADMIN_ENV ?? "local").toLowerCase();
  if (raw === "production" || raw === "prod") {
    return "Production";
  }
  if (raw === "staging" || raw === "stage") {
    return "Staging";
  }
  return "Local";
}
