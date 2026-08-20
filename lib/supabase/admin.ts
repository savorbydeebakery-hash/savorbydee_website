import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client.
 * SERVER ONLY — bypasses RLS. NEVER import this into client components.
 * Used for: guest order retrieval verification, cron watchdog, webhooks,
 * admin account management, seed scripts.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}