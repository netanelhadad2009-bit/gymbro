"use client";

import { useState } from "react";
import { translateAuthError } from "@/lib/i18n/authHe";
import { startGoogleSignIn, startAppleSignIn } from "@/lib/auth/oauth";
import { usePlatform } from "@/lib/platform";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { runPostAuthFlow } from "@/lib/auth/post-auth";
import { isNative } from "@/lib/platform/isNative";
import { getOnboardingDataOrNull } from "@/lib/onboarding-storage";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

type Size = "lg" | "md";
type Variant = "signup" | "login";

/**
 * Wait for Supabase session to become available after OAuth
 *
 * OAuth flow on native can have a race condition where the session
 * is not immediately available after signInWithIdToken succeeds.
 * This helper polls for the session with retries before giving up.
 *
 * @param supabase Supabase client instance
 * @param opts Retry configuration { retries: 10, delayMs: 150 }
 * @returns Session object if found, null if not available after retries
 */
async function waitForSession(
  supabase: SupabaseClient,
  opts: { retries?: number; delayMs?: number } = {}
): Promise<Session | null> {
  const { retries = 10, delayMs = 150 } = opts;

  for (let i = 0; i < retries; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      console.log('[SocialAuthButtons] ✅ Session available after OAuth (attempt', i + 1, ')');
      return data.session;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.warn('[SocialAuthButtons] ⚠️  No session available after OAuth (after', retries, 'retries)');
  return null;
}

export default function SocialAuthButtons({
  size = "lg",
  variant = "signup",
}: {
  size?: Size;
  variant?: Variant;
}) {
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const platform = usePlatform();
  const { toast } = useToast();

  const haptics = platform?.haptics;

  // Unified label for both signup and login - OAuth handles both flows automatically
  const title = "המשך באמצעות";

  async function handleGoogle() {
    if (loading) return;

    console.log("[SocialAuthButtons] Google button clicked");
    setLoading("google");

    try {
      // Haptic feedback on button press
      console.log("[SocialAuthButtons] Triggering selection haptic");
      await haptics?.selection?.();

      // Start OAuth flow (automatically selects native vs web)
      console.log("[SocialAuthButtons] Starting Google sign-in");
      const oauthResult = await startGoogleSignIn();

      // On web: browser redirects to Google OAuth, code below never executes
      // On native: we have session data and need to run post-auth flow

      console.log("[SocialAuthButtons] OAuth result received, checking for session...");

      if (isNative()) {
        console.log("[SocialAuthButtons] Native platform detected, running post-auth flow");

        // Wait for session to become available (handles race condition)
        const session = await waitForSession(supabase, { retries: 10, delayMs: 150 });

        if (!session || !session.user) {
          // Session not available after retries - navigate to main app anyway
          // The session should be available, and if not, AuthProvider will redirect to login
          console.warn('[SocialAuthButtons] Session not immediately available after native OAuth');
          console.warn('[SocialAuthButtons] Navigating to /journey anyway - session should be available');
          setLoading(null);
          window.location.href = '/journey';
          return;
        }

        // Success haptic
        console.log("[SocialAuthButtons] Triggering success haptic");
        await haptics?.success?.();

        console.log("[SocialAuthButtons] Running post-auth flow for Google OAuth");

        // Load onboarding data to pass to post-auth flow
        const onboardingData = getOnboardingDataOrNull();
        console.log("[SocialAuthButtons] Onboarding data loaded:", !!onboardingData);
        if (onboardingData) {
          console.log("[SocialAuthButtons] Onboarding summary:", {
            goal: onboardingData.goals?.[0],
            height: onboardingData.height_cm,
            weight: onboardingData.weight_kg,
            gender: onboardingData.gender,
            diet: onboardingData.diet,
            activity: onboardingData.activity,
            birthdate: onboardingData.birthdate, // ADD birthdate to log
            hasBirthdate: !!onboardingData.birthdate,
          });
        } else {
          console.log("[SocialAuthButtons] WARNING: No onboarding data found!");
        }

        // Run unified post-auth flow
        const targetRoute = await runPostAuthFlow({
          user: session.user,
          session,
          provider: 'google',
          storage: platform.storage,
          supabase,
          onboardingDataOverride: onboardingData,
        });

        console.log("[SocialAuthButtons] Post-auth flow completed, navigating to:", targetRoute);
        window.location.href = targetRoute;
      } else {
        console.log("[SocialAuthButtons] Web platform - redirect should have occurred");
        // On web, redirect happens automatically, this code shouldn't execute
      }
    } catch (err: any) {
      console.error("[SocialAuthButtons] ❌ Google OAuth error");
      console.error("[SocialAuthButtons] Error type:", err?.constructor?.name || typeof err);
      console.error("[SocialAuthButtons] Error message:", err?.message);
      console.error("[SocialAuthButtons] Error name:", err?.name);
      console.error("[SocialAuthButtons] Error status:", (err as any)?.status);
      console.error("[SocialAuthButtons] Error code:", (err as any)?.code);
      console.error("[SocialAuthButtons] Error stack:", err?.stack);
      console.error("[SocialAuthButtons] Full error object:", JSON.stringify(err, null, 2));

      // Error haptic (triple vibration)
      try {
        await haptics?.error?.();
      } catch (hapticErr) {
        console.error("[SocialAuthButtons] Haptic error feedback failed:", hapticErr);
      }

      // Show error toast with REAL error message (temporarily for debugging)
      try {
        const hebrewError = translateAuthError(err, variant === 'signup' ? 'sign_up' : 'sign_in');

        // TEMPORARY: Show both translated message AND raw error for debugging
        const debugMessage = `${hebrewError}\n\n[DEBUG] ${err?.message || err?.name || 'Unknown error'}`;

        toast({
          title: "שגיאה בהתחברות עם Google",
          description: debugMessage,
          variant: "destructive",
          duration: 10000, // Show longer for debugging
        });
      } catch (toastErr) {
        console.error("[SocialAuthButtons] Toast error:", toastErr);
        alert(`שגיאת התחברות Google:\n${err?.message || err?.name || "לא הצלחנו להשלים את ההתחברות"}`);
      }

      // Re-enable buttons
      console.log("[SocialAuthButtons] Re-enabling buttons");
      setLoading(null);
    }
  }

  async function handleApple() {
    if (loading) return;

    console.log("[SocialAuthButtons] Apple button clicked");
    setLoading("apple");

    try {
      // Haptic feedback on button press
      console.log("[SocialAuthButtons] Triggering selection haptic");
      await haptics?.selection?.();

      // Start OAuth flow (automatically selects native vs web)
      console.log("[SocialAuthButtons] Starting Apple sign-in");
      const oauthResult = await startAppleSignIn();

      // On web: browser redirects to Apple OAuth, code below never executes
      // On native: we have session data and need to run post-auth flow

      console.log("[SocialAuthButtons] OAuth result received, checking for session...");

      if (isNative()) {
        console.log("[SocialAuthButtons] Native platform detected, running post-auth flow");

        // Wait for session to become available (handles race condition)
        const session = await waitForSession(supabase, { retries: 10, delayMs: 150 });

        if (!session || !session.user) {
          // Session not available after retries - navigate to main app anyway
          // The session should be available, and if not, AuthProvider will redirect to login
          console.warn('[SocialAuthButtons] Session not immediately available after native OAuth');
          console.warn('[SocialAuthButtons] Navigating to /journey anyway - session should be available');
          setLoading(null);
          window.location.href = '/journey';
          return;
        }

        // Success haptic
        console.log("[SocialAuthButtons] Triggering success haptic");
        await haptics?.success?.();

        console.log("[SocialAuthButtons] Running post-auth flow for Apple OAuth");

        // Load onboarding data to pass to post-auth flow
        const onboardingData = getOnboardingDataOrNull();
        console.log("[SocialAuthButtons] Onboarding data loaded:", !!onboardingData);
        if (onboardingData) {
          console.log("[SocialAuthButtons] Onboarding summary:", {
            goal: onboardingData.goals?.[0],
            height: onboardingData.height_cm,
            weight: onboardingData.weight_kg,
            gender: onboardingData.gender,
            diet: onboardingData.diet,
            activity: onboardingData.activity,
            birthdate: onboardingData.birthdate, // ADD birthdate to log
            hasBirthdate: !!onboardingData.birthdate,
          });
        } else {
          console.log("[SocialAuthButtons] WARNING: No onboarding data found!");
        }

        // Run unified post-auth flow
        const targetRoute = await runPostAuthFlow({
          user: session.user,
          session,
          provider: 'apple',
          storage: platform.storage,
          supabase,
          onboardingDataOverride: onboardingData,
        });

        console.log("[SocialAuthButtons] Post-auth flow completed, navigating to:", targetRoute);
        window.location.href = targetRoute;
      } else {
        console.log("[SocialAuthButtons] Web platform - redirect should have occurred");
        // On web, redirect happens automatically, this code shouldn't execute
      }
    } catch (err: any) {
      console.error("[SocialAuthButtons] ❌ Apple OAuth error");
      console.error("[SocialAuthButtons] Error type:", err?.constructor?.name || typeof err);
      console.error("[SocialAuthButtons] Error message:", err?.message);
      console.error("[SocialAuthButtons] Error name:", err?.name);
      console.error("[SocialAuthButtons] Error status:", (err as any)?.status);
      console.error("[SocialAuthButtons] Error code:", (err as any)?.code);
      console.error("[SocialAuthButtons] Error stack:", err?.stack);
      console.error("[SocialAuthButtons] Full error object:", JSON.stringify(err, null, 2));

      // Error haptic (triple vibration)
      try {
        await haptics?.error?.();
      } catch (hapticErr) {
        console.error("[SocialAuthButtons] Haptic error feedback failed:", hapticErr);
      }

      // Show error toast with REAL error message (temporarily for debugging)
      try {
        const hebrewError = translateAuthError(err, variant === 'signup' ? 'sign_up' : 'sign_in');

        // TEMPORARY: Show both translated message AND raw error for debugging
        const debugMessage = `${hebrewError}\n\n[DEBUG] ${err?.message || err?.name || 'Unknown error'}`;

        toast({
          title: "שגיאה בהתחברות עם Apple",
          description: debugMessage,
          variant: "destructive",
          duration: 10000, // Show longer for debugging
        });
      } catch (toastErr) {
        console.error("[SocialAuthButtons] Toast error:", toastErr);
        alert(`שגיאת התחברות Apple:\n${err?.message || err?.name || "לא הצלחנו להשלים את ההתחברות"}`);
      }

      // Re-enable buttons
      console.log("[SocialAuthButtons] Re-enabling buttons");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Google Button */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={!!loading}
        className="w-full h-14 bg-white text-black font-bold text-lg rounded-full flex items-center justify-center gap-3 transition hover:bg-gray-100 disabled:opacity-50"
        dir="rtl"
      >
        <svg width="24" height="24" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.5 32.9 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.9 6.1 29.7 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 18.6-6.9 18.6-20c0-1.2-.1-2.3-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.9 6.1 29.7 4 24 4 15.3 4 7.8 9 4.6 16.2l1.7-1.5z"/>
          <path fill="#4CAF50" d="M24 44c5 0 9.5-1.9 12.9-5.1l-6-4.9C28.9 35.4 26.6 36 24 36c-5.2 0-9.6-3.1-11.6-7.6l-6.6 5C7.8 39 15.3 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.8 4.1-6.1 8-11.3 8-5.2 0-9.6-3.1-11.6-7.6l-6.6 5C7.8 39 15.3 44 24 44c11.1 0 20-8.9 20-20 0-1.2-.1-2.3-.4-3.5z"/>
        </svg>
        <span>{title} Google</span>
      </button>

      {/* Apple Button */}
      <button
        type="button"
        onClick={handleApple}
        disabled={!!loading}
        className="w-full h-14 bg-white text-black font-bold text-lg rounded-full flex items-center justify-center gap-3 transition hover:bg-gray-100 disabled:opacity-50"
        dir="rtl"
      >
        <svg width="20" height="24" viewBox="0 0 814 1000" fill="currentColor">
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
        </svg>
        <span>{title} Apple</span>
      </button>
    </div>
  );
}
