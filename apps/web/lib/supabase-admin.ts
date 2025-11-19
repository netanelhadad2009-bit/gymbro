import { createClient } from '@supabase/supabase-js';
import { serverEnv, clientEnv } from '@/lib/env';

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
  // Use centralized env validation (throws if missing)
  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
