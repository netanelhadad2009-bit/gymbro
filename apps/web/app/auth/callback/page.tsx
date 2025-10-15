"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOnboardingData, clearOnboardingData } from "@/lib/onboarding-storage";

export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session) {
        // Check if there's onboarding data to save
        const onboardingData = getOnboardingData();

        if (Object.keys(onboardingData).length > 0) {
          // Save onboarding data to user metadata
          await supabase.auth.updateUser({
            data: onboardingData
          });
          // Clear localStorage after saving
          clearOnboardingData();
          // Redirect to dashboard since onboarding is complete
          router.replace("/dashboard");
        } else {
          // No onboarding data, start onboarding
          router.replace("/onboarding/gender");
        }
      } else {
        router.replace("/login");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  return <p dir="rtl" className="p-4 text-center">מתחבר…</p>;
}