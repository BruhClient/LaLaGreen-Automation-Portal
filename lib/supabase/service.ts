import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client using the service_role key, which bypasses RLS.
 * Never import this from a client component or from lib/supabase/client.ts.
 * Only use inside "use server" actions, after an explicit getSession() check.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
