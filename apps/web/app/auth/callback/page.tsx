"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/mixpanel";
import AppsFlyer from "@/lib/appsflyer";
import { syncProfileAfterLogin } from "@/lib/profile/sync";
import { getDeviceId } from "@/lib/storage";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("מתחבר...");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

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
        if (mounted) setStatus("מקבל הרשאה...");

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
          if (mounted) {
            setError("שגיאה בהתחברות. אנא נסה שוב.");
            setTimeout(() => router.replace("/login"), 3000);
          }
          return;
        }

        if (!session) {
          console.log('[Auth Callback] ❌ No session found, redirecting to login');
          if (mounted) {
            setError("לא נמצא חיבור פעיל. מפנה להתחברות...");
            setTimeout(() => router.replace("/login"), 2000);
          }
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
        if (mounted) setStatus("בודק פרופיל...");

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is expected for new users
          console.error('[Auth Callback] ⚠️ Error checking profile:', profileError);
          // Non-critical error, continue flow
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
          if (mounted) setStatus("יוצר פרופיל...");

          // Get user metadata from OAuth provider
          const metadata = user.user_metadata || {};
          console.log('[Auth Callback] OAuth user metadata:', {
            full_name: metadata.full_name || metadata.name || '(none)',
            avatar_url: metadata.avatar_url || metadata.picture || '(none)',
            provider: metadata.provider || provider,
          });

          // Create profile for new user with retry logic
          let profileCreated = false;
          let attempts = 0;
          const maxAttempts = 3;

          while (!profileCreated && attempts < maxAttempts) {
            attempts++;
            console.log(`[Auth Callback] Profile creation attempt ${attempts}/${maxAttempts}`);

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
                console.warn('[Auth Callback] ⚠️ Profile already exists (race condition)');
                profileCreated = true; // Profile exists, continue
              } else if (attempts < maxAttempts) {
                console.warn(`[Auth Callback] ⚠️ Profile creation failed (attempt ${attempts}), retrying...`, insertError);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
              } else {
                console.error('[Auth Callback] ❌ Failed to create profile after all attempts:', insertError);
                if (mounted) {
                  setError("שגיאה ביצירת פרופיל. ממשיך בכל זאת...");
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              }
            } else {
              console.log('[Auth Callback] ✅ Profile created successfully');
              profileCreated = true;
            }
          }

          // Run profile sync to apply any pending onboarding data
          console.log('[Auth Callback] Running profile sync for new user...');
          if (mounted) setStatus("מסנכרן נתונים...");

          try {
            const syncResult = await syncProfileAfterLogin(user.id);
            console.log('[Auth Callback] Profile sync result:', syncResult);
          } catch (syncError) {
            console.error('[Auth Callback] ⚠️ Profile sync failed:', syncError);
            // Non-critical, continue flow
          }

          // [analytics] Track signup completed for OAuth (new user)
          track("signup_completed", { method: provider });
          AppsFlyer.logEvent("signup_completed", { method: provider });

          // [sheets] Log signup to Google Sheets - best effort, don't block navigation
          if (mounted) setStatus("שומר פרטים...");
          fetch("/api/admin/sheets-signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: user.id,
              email: user.email,
              full_name: metadata.full_name || metadata.name || null,
              device_id: getDeviceId(),
              created_at: new Date().toISOString(),
              source: provider,
            }),
          }).catch(err => {
            console.warn('[Auth Callback] ⚠️ Sheets logging failed (non-critical):', err);
          });

          // Wait a moment to ensure all async operations complete
          await new Promise(resolve => setTimeout(resolve, 500));

          // New users always need onboarding
          console.log('[Auth Callback] 🎯 Redirecting new user to onboarding');
          if (mounted) {
            setStatus("מכין את החוויה שלך...");
            // Small delay to ensure state is visible
            await new Promise(resolve => setTimeout(resolve, 300));
            router.replace("/onboarding/gender");
          }
        } else {
          // ============================================================
          // EXISTING USER FLOW - Sync profile and route accordingly
          // ============================================================
          console.log('[Auth Callback] 👤 EXISTING USER - Running profile sync');
          if (mounted) setStatus("מסנכרן פרופיל...");

          // [analytics] Track login completed for existing OAuth users
          track("login_completed", { method: provider });
          AppsFlyer.logEvent("login_completed", { method: provider });

          // CRITICAL: Run profile sync BEFORE checking onboarding status
          // This ensures fresh onboarding data overwrites old profile data
          let syncResult;
          try {
            syncResult = await syncProfileAfterLogin(user.id);
            console.log('[Auth Callback] Profile sync result:', syncResult);
          } catch (syncError) {
            console.error('[Auth Callback] ⚠️ Profile sync failed:', syncError);
            // Continue flow even if sync fails - use existing profile data
            syncResult = { action: 'failed' };
          }

          // Re-fetch profile after sync to get updated status
          if (mounted) setStatus("בודק סטטוס...");
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .select('has_completed_onboarding')
            .eq('id', user.id)
            .maybeSingle();

          const onboardingComplete = updatedProfile?.has_completed_onboarding || profile.has_completed_onboarding;
          console.log('[Auth Callback] Onboarding status after sync:', {
            has_completed_onboarding: onboardingComplete,
            syncAction: syncResult.action,
          });

          // Wait a moment before navigation
          await new Promise(resolve => setTimeout(resolve, 300));

          if (onboardingComplete) {
            console.log('[Auth Callback] ✅ Onboarding complete → redirecting to /journey');
            if (mounted) {
              setStatus("מעביר למסך הבית...");
              await new Promise(resolve => setTimeout(resolve, 300));
              router.replace("/journey");
            }
          } else {
            console.log('[Auth Callback] ⏳ Onboarding incomplete → redirecting to /onboarding/gender');
            if (mounted) {
              setStatus("מכין הכנות ראשוניות...");
              await new Promise(resolve => setTimeout(resolve, 300));
              router.replace("/onboarding/gender");
            }
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

        if (!mounted) return;

        // Retry logic for unexpected errors
        if (retryCount < MAX_RETRIES) {
          console.log(`[Auth Callback] Retrying... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(retryCount + 1);
          setError(`שגיאה זמנית. מנסה שוב... (${retryCount + 1}/${MAX_RETRIES})`);

          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));

          // Trigger re-run by clearing error
          setError(null);
          setStatus("מנסה שנית...");

          // The useEffect will re-run automatically
          return;
        }

        // Max retries reached, show error and redirect
        setError("אירעה שגיאה. מפנה להתחברות...");
        setTimeout(() => {
          if (mounted) {
            router.replace("/login");
          }
        }, 3000);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router, retryCount]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#0D0E0F] flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center space-y-4 max-w-md">
        {/* Loading spinner */}
        {!error && (
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Error icon */}
        {error && (
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        {/* Status text */}
        <p className={`text-lg font-medium ${error ? 'text-red-400' : 'text-white'}`}>
          {error || status}
        </p>

        {/* Additional info for errors */}
        {error && retryCount < MAX_RETRIES && (
          <p className="text-sm text-gray-400 text-center">
            ממתין לחיבור...
          </p>
        )}

        {/* Progress indicator */}
        {!error && (
          <div className="w-full max-w-xs">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
