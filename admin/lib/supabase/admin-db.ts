import type { SupabaseClient } from "@supabase/supabase-js";

import { ADMIN_SCHEMA } from "@/lib/supabase/admin-schema";

/**
 * Typed escape hatch for queries against the private `admin` schema via PostgREST.
 */
export function adminSchema(client: SupabaseClient) {
  return client.schema(ADMIN_SCHEMA);
}
