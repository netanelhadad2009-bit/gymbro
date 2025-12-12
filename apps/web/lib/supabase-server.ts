import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};

/**
 * Create Supabase client with support for both cookie-based and Bearer token authentication
 * Checks Authorization header first, then falls back to cookies
 * Use this in API routes that need to support programmatic access (e.g., mobile app, E2E tests)
 */
export const createServerSupabaseClientWithAuth = async () => {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  // Check for Bearer token first (mobile app sends access_token as Bearer token)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Wrap getUser to use the token directly
    // This ensures auth.getUser() works with Bearer tokens
    const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
    supabase.auth.getUser = async () => {
      return originalGetUser(token);
    };

    return supabase;
  }

  // Fall back to cookie-based authentication
  return createServerSupabaseClient();
};

export const getServerSession = async () => {
  const supabase = await createServerSupabaseClient();
  return await supabase.auth.getSession();
};

/**
 * Synchronous version for API routes (Route Handlers)
 * Use this in app/api routes where cookies() is not async
 */
export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(key: string) {
          return cookieStore.get(key)?.value;
        },
        set(key: string, value: string, options: any) {
          try {
            cookieStore.set(key, value, options);
          } catch {
            // Can be called from Server Component - ignore
          }
        },
        remove(key: string, options: any) {
          try {
            cookieStore.set(key, "", { ...options, maxAge: 0 });
          } catch {
            // Can be called from Server Component - ignore
          }
        },
      },
    }
  );
}