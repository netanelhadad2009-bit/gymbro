import { createClient } from "@supabase/supabase-js";

/**
 * Anonymous client for public/server operations (no session persistence).
 */
export const supabaseAnon = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Service client for server-side admin operations (NEVER expose to frontend).
 */
export const supabaseService = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
