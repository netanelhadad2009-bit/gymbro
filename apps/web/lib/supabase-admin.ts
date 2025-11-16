import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client using service role key
 *
 * WARNING: This client bypasses RLS. Use only for:
 * - Admin operations
 * - System tasks
 * - Dev diagnostics
 *
 * NEVER expose service role key to the client!
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE environment variables for admin client. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
