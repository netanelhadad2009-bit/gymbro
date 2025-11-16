import { createBrowserClient } from "@supabase/ssr";

// Capacitor Preferences storage adapter
const createCapacitorStorage = () => {
  // Only import Capacitor on the client side
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    // Check if we're running in Capacitor
    if (!(window as any).Capacitor) {
      return undefined;
    }

    // Dynamic import to avoid SSR issues
    const { Preferences } = require("@capacitor/preferences");

    return {
      getItem: async (key: string) => {
        const { value } = await Preferences.get({ key });
        return value;
      },
      setItem: async (key: string, value: string) => {
        await Preferences.set({ key, value });
      },
      removeItem: async (key: string) => {
        await Preferences.remove({ key });
      },
    };
  } catch (error) {
    console.warn("[Supabase] Capacitor Preferences not available, using default storage");
    return undefined;
  }
};

const capacitorStorage = createCapacitorStorage();

/**
 * Browser Supabase client with auth persistence
 *
 * Features:
 * - Persists session across page reloads
 * - Auto-refreshes tokens
 * - Uses Capacitor Preferences in mobile app
 * - Uses browser localStorage in web
 * - PKCE flow for security
 *
 * IMPORTANT: This client carries the user's session/JWT.
 * All RLS policies are enforced based on auth.uid() from this session.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,        // Save session to storage
      autoRefreshToken: true,      // Refresh before expiry
      detectSessionInUrl: typeof window !== "undefined" && !(window as any).Capacitor, // Disable URL detection in Capacitor
      flowType: "pkce",            // Secure auth flow
      storage: capacitorStorage,   // Use Capacitor storage if available, fallback to localStorage
    },
  }
);