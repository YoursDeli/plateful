import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Service-role client: bypasses RLS. Only for trusted server contexts
// (Paystack webhook, admin bulk actions) — never import from client code.
// Admin CRUD deliberately does NOT use this; it goes through the user's
// session client so RLS stays a second line of defence.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
