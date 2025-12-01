"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/mixpanel";
import AppsFlyer from "@/lib/appsflyer";

export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    (async () => {
      console.log('[Auth Callback] ========================================');
      console.log('[Auth Callback] Starting OAuth callback processing');
      console.log('[Auth Callback] ========================================');

      // Log URL and query parameters for debugging
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const params = Object.fromEntries(url.searchParams.entries());

        console.log('[Auth Callback] Current URL:', window.location.href);
        console.log('[Auth Callback] Query parameters:', params);
        console.log('[Auth Callback] Specific params:', {
          error: params.error || '(none)',
          error_description: params.error_description || '(none)',
          error_code: params.error_code || '(none)',
          provider: params.provider || '(none)',
          code: params.code ? 'present' : '(none)',
          access_token: params.access_token ? 'present' : '(none)',
        });
      }

      try {
        // Get the session after OAuth redirect
        console.log('[Auth Callback] Step 1: Getting session from Supabase...');
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();

        if (!mounted) {
          console.log('[Auth Callback] Component unmounted, aborting');
          return;
        }

        if (sessionError) {
          console.error('[Auth Callback] ❌ Session error:', sessionError);
          router.replace("/login");
          return;
        }

        if (!session) {
          console.log('[Auth Callback] ❌ No session found, redirecting to login');
          router.replace("/login");
          return;
        }

        const user = session.user;
        const provider = user.app_metadata?.provider || 'email';
        console.log('[Auth Callback] ✅ Session found for user:', {
          userId: user.id,
          email: user.email,
          provider: provider,
        });

        // Check if profile exists (determines if new or existing user)
        console.log('[Auth Callback] Checking if profile exists...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is expected for new users
          console.error('[Auth Callback] ⚠️ Error checking profile:', profileError);
        }

        const isNewUser = !profile;
        console.log('[Auth Callback] User status:', {
          type: isNewUser ? 'NEW_USER' : 'EXISTING_USER',
          hasProfile: !!profile,
        });

        if (isNewUser) {
          // ============================================================
          // NEW USER FLOW - Create profile and start onboarding
          // ============================================================
          console.log('[Auth Callback] 🆕 NEW USER - Creating profile');

          // Get user metadata from OAuth provider
          const metadata = user.user_metadata || {};
          console.log('[Auth Callback] OAuth user metadata:', {
            full_name: metadata.full_name || metadata.name || '(none)',
            avatar_url: metadata.avatar_url || metadata.picture || '(none)',
            provider: metadata.provider || provider,
          });

          // Create profile for new user
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: metadata.full_name || metadata.name,
              avatar_url: metadata.avatar_url || metadata.picture,
              provider: metadata.provider || provider,
            });

          if (insertError) {
            // Check if it's a duplicate key error (race condition)
            if (insertError.code === '23505') {
              console.warn('[Auth Callback] ⚠️ Profile already exists (race condition - another request created it)');
              // This is OK - the profile exists now, continue as existing user
            } else {
              console.error('[Auth Callback] ❌ Failed to create profile:', insertError);
              // Don't fail the auth flow, just log the error
              // User can still proceed to onboarding
            }
          } else {
            console.log('[Auth Callback] ✅ Profile created successfully');
          }

          // [analytics] Track signup completed for OAuth (new user)
          track("signup_completed", { method: provider });
          AppsFlyer.logEvent("signup_completed", { method: provider });

          // New users always need onboarding
          console.log('[Auth Callback] 🎯 Redirecting new user to onboarding');
          router.replace("/onboarding/gender");
        } else {
          // ============================================================
          // EXISTING USER FLOW - Check onboarding status and route accordingly
          // ============================================================
          console.log('[Auth Callback] 👤 EXISTING USER - Checking onboarding status');

          const onboardingComplete = profile.has_completed_onboarding;
          console.log('[Auth Callback] Onboarding status:', {
            has_completed_onboarding: onboardingComplete,
          });

          if (onboardingComplete) {
            console.log('[Auth Callback] ✅ Onboarding complete → redirecting to /journey');
            router.replace("/journey");
          } else {
            console.log('[Auth Callback] ⏳ Onboarding incomplete → redirecting to /onboarding/gender');
            router.replace("/onboarding/gender");
          }
        }

        console.log('[Auth Callback] ========================================');
        console.log('[Auth Callback] OAuth callback processing complete');
        console.log('[Auth Callback] ========================================');
      } catch (error: any) {
        console.error('[Auth Callback] ❌ Unexpected error:', error);
        console.error('[Auth Callback] Error details:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack?.split('\n').slice(0, 5),
        });
        if (mounted) {
          router.replace("/login");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#0D0E0F] flex items-center justify-center">
      <p className="text-white text-lg">מתחבר…</p>
    </div>
  );
}
