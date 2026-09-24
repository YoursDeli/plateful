import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Browser client for "use client" components. Uses the anon key only.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
