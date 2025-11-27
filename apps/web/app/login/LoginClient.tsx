"use client";

import SocialAuthButtons from "@/components/SocialAuthButtons";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import texts from "@/lib/assistantTexts";
import { translateAuthError, validateEmail, validatePassword } from "@/lib/i18n/authHe";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Force re-render when returning from external browser (iOS Simulator fix)
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handleBrowserClosed = () => {
      console.log("[LoginClient] Browser closed, forcing re-render");
      forceUpdate(prev => prev + 1);
    };

    window.addEventListener('external-browser-closed', handleBrowserClosed);
    window.addEventListener('focus', handleBrowserClosed);

    return () => {
      window.removeEventListener('external-browser-closed', handleBrowserClosed);
      window.removeEventListener('focus', handleBrowserClosed);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);

      if (err) {
        setError(translateAuthError(err, 'sign_in'));
      } else if (data?.user) {
        console.log("[LoginClient] Login successful, redirecting to /journey");
        // Success - redirect to journey (middleware will handle if onboarding needed)
        router.push("/journey");
      }
    } catch (err) {
      setLoading(false);
      setError(translateAuthError(err, 'sign_in'));
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#0D0E0F] text-white px-4">
      {/* Back Button */}
      <div className="pt-safe pt-4 pb-1 max-w-md mx-auto flex justify-end">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="חזור"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="w-full max-w-md mx-auto py-6 flex items-center min-h-[calc(100vh-80px)]">
        <div className="w-full">
          {/* Social Auth Buttons */}
          <SocialAuthButtons size="lg" variant="login" />

        {/* Divider */}
        <div className="my-6 flex items-center gap-3 text-white/60">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-sm">{texts.general.or}</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-[#d9dee3]">{texts.login.emailLabel}</label>
            <input
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={texts.login.emailPlaceholder}
              className="h-12 w-full rounded-xl bg-white/5 text-white placeholder-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/20 px-4"
            />
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-sm text-[#d9dee3]">{texts.login.passwordLabel}</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl bg-white/5 text-white placeholder-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/20 px-4"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm pt-1 mt-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-10 h-14 w-full rounded-full bg-[#E2F163] text-black font-bold text-lg transition-transform active:scale-98 active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? texts.login.loggingIn : texts.login.loginButton}
          </button>
        </form>
        </div>
      </div>
    </main>
  );
}
