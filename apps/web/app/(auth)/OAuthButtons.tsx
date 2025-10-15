"use client";

import SocialAuthButton from "@/components/SocialAuthButton";
import { supabase } from "@/lib/supabase";

export function OAuthButtons({
  mode = "signin", // "signin" | "signup" (for text)
}: { mode?: "signin" | "signup" }) {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : undefined;

  const googleText = mode === "signup" ? "הרשמה באמצעות Google" : "התחברות באמצעות Google";
  const appleText  = mode === "signup" ? "הרשמה באמצעות Apple"  : "התחברות באמצעות Apple";

  return (
    <>
      <SocialAuthButton
        provider="google"
        text={googleText}
        onClick={() =>
          supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
        }
        className="w-full shadow-lg"
      />
      <SocialAuthButton
        provider="apple"
        text={appleText}
        onClick={() =>
          supabase.auth.signInWithOAuth({ provider: "apple", options: { redirectTo } })
        }
        className="w-full shadow-lg"
      />
    </>
  );
}