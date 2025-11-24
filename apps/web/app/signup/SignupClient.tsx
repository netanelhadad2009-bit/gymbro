"use client";

import SocialAuthButtons from "@/components/SocialAuthButtons";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { getOnboardingDataOrNull } from "@/lib/onboarding-storage";
import { translateAuthError, validateEmail, validatePassword, validatePasswordMatch } from "@/lib/i18n/authHe";
import { usePlatform } from "@/lib/platform";
import { runPostAuthFlow } from "@/lib/auth/post-auth";

export default function SignupClient() {
  const { storage } = usePlatform();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptMarketing, setAcceptMarketing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);

  // Force re-render when returning from external browser (iOS Simulator fix)
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handleBrowserClosed = () => {
      console.log("[SignupClient] Browser closed, forcing re-render");
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

    const matchError = validatePasswordMatch(password, confirm);
    if (matchError) {
      setError(matchError);
      return;
    }

    setLoading(true);

    // Get onboarding data from localStorage
    const onboardingData = getOnboardingDataOrNull();

    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            accept_marketing: acceptMarketing,
            ...onboardingData, // Include all onboarding data
          }
        },
      });

      if (err) {
        setError(translateAuthError(err, 'sign_up'));
        setLoading(false);
      } else if (data?.user) {
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          setError("האימייל כבר רשום במערכת.");
          setLoading(false);
        } else if (data.session) {
          // Session is available immediately (no email confirmation required)
          console.log('[Signup] Session available, starting post-auth flow');
          setMigrating(true);

          try {
            // Run unified post-auth flow
            const targetRoute = await runPostAuthFlow({
              user: data.user,
              session: data.session,
              provider: 'email',
              storage,
              supabase,
              onboardingDataOverride: onboardingData,
            });

            setMigrating(false);

            // Navigate to appropriate page based on profile completeness
            console.log("[Signup] Redirecting to:", targetRoute);
            window.location.href = targetRoute;
          } catch (err) {
            console.error('[Signup] Post-auth flow failed:', err);
            setMigrating(false);
            setError('ההרשמה הושלמה, אך אירעה שגיאה בהכנת התוכנית שלך. נסה להתחבר שוב.');
            setLoading(false);
          }
      } else {
        // Email confirmation required
        setError("נשלח לך מייל אימות. אנא בדוק את תיבת הדואר שלך.");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    } catch (err) {
      setError(translateAuthError(err, 'sign_up'));
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#0D0E0F] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md py-10">
        {/* Social Auth Buttons */}
        <SocialAuthButtons size="lg" variant="signup" />

        {/* Divider */}
        <div className="my-6 flex items-center gap-3 text-white/60">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-sm">או</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[#d9dee3]">אימייל</label>
            <input
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-12 w-full rounded-xl bg-white/5 text-white placeholder-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/20 px-4"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#d9dee3]">סיסמה</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl bg-white/5 text-white placeholder-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/20 px-4"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#d9dee3]">אשר סיסמה</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 w-full rounded-xl bg-white/5 text-white placeholder-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/20 px-4"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm pt-1">{error}</p>
          )}

          {/* Marketing Consent Checkbox */}
          <div className="flex items-center gap-3 pt-2">
            <div className="relative flex items-center justify-center shrink-0">
              <input
                type="checkbox"
                id="marketing-consent"
                checked={acceptMarketing}
                onChange={(e) => setAcceptMarketing(e.target.checked)}
                className="w-6 h-6 rounded cursor-pointer appearance-none border-2 border-white/40 bg-transparent checked:bg-[#E2F163] checked:border-[#E2F163] transition-all"
              />
              {acceptMarketing && (
                <svg
                  className="absolute w-4 h-4 pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="black"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <label htmlFor="marketing-consent" className="text-sm text-white/80 cursor-pointer leading-relaxed">
              אני מאשר/ת לקבל טיפים ומידע שימושי בתחום הכושר והתזונה למייל.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || migrating}
            className="mt-6 h-14 w-full rounded-full bg-[#E2F163] text-black font-bold text-lg transition-transform active:scale-98 active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migrating ? "שומר את התוכנית שלך..." : loading ? "רושם..." : "הרשמה"}
          </button>
        </form>

      </div>
    </main>
  );
}
