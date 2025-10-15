"use client";

import SocialAuthButtons from "@/components/SocialAuthButtons";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import texts from "@/lib/assistantTexts";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (err) {
      setError(err.message);
    } else if (data?.user) {
      // Success - redirect to onboarding
      router.push("/onboarding/gender");
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white flex items-center justify-center">
      <div className="w-full max-w-md px-5 py-10">
        {/* Social Auth Buttons */}
        <SocialAuthButtons size="lg" variant="login" />

        {/* Divider */}
        <div className="my-6 flex items-center gap-3 text-white/60">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-sm">{texts.general.or}</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
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
            <p className="text-red-400 text-sm pt-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 h-14 w-full rounded-full bg-[#E2F163] text-black font-bold text-lg transition hover:bg-[#d5e35b] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? texts.login.loggingIn : texts.login.loginButton}
          </button>
        </form>
      </div>
    </main>
  );
}
