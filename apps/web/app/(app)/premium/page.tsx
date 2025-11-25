/**
 * Premium Paywall Page - Production Premium Gate
 *
 * This is the main paywall that non-premium users see after onboarding.
 * Premium users are automatically redirected to /journey.
 */

"use client";

import { useAuth } from "@/contexts/AuthProvider";
import {
  Crown,
  Loader2,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Heart,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { openExternal } from "@/lib/openExternal";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legalLinks";

export default function PremiumPage() {
  const router = useRouter();
  const { user, loading, isPremium, isSubscriptionLoading, subscription } =
    useAuth();
  const [autoRedirectCountdown, setAutoRedirectCountdown] = useState(800);

  // If user is premium, auto-redirect to /journey after a short delay
  useEffect(() => {
    if (isPremium && user) {
      console.log("[Premium] User is premium, auto-redirecting to /journey");

      const timer = setTimeout(() => {
        router.replace("/journey");
      }, 800);

      // Countdown timer for visual feedback
      const countdownInterval = setInterval(() => {
        setAutoRedirectCountdown((prev) => Math.max(0, prev - 100));
      }, 100);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [isPremium, user, router]);

  // Redirect to login if not authenticated (after loading)
  useEffect(() => {
    if (!loading && !isSubscriptionLoading && !user) {
      console.log("[Premium] No user, redirecting to /login");
      router.replace("/login");
    }
  }, [loading, isSubscriptionLoading, user, router]);

  // Handle immediate redirect to journey (for premium users who don't want to wait)
  const handleGoToApp = () => {
    router.replace("/journey");
  };

  // Handle CTA click (stub for Apple IAP integration)
  const handleSubscribe = () => {
    console.log("[Premium] Subscribe button clicked - Apple IAP integration pending");
    // Show production-ready message
    alert("מעבד את הבקשה... תוכל להפעיל את המנוי דרך הגדרות ה-App Store.");
  };

  // Show loading state while checking subscription
  if (loading || isSubscriptionLoading) {
    return (
      <div className="min-h-screen bg-[#0b0d0e] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-lime-400 animate-spin" />
        <p className="text-white/60 text-sm">טוען את מצב המנוי שלך…</p>
      </div>
    );
  }

  // If no user, show nothing (redirect is happening)
  if (!user) {
    return null;
  }

  // If premium, show success message and redirect
  if (isPremium) {
    return (
      <div className="min-h-screen bg-[#0b0d0e] text-white flex flex-col items-center justify-center px-6 pb-safe">
        {/* Success Icon */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-lime-400/20 blur-3xl rounded-full" />
          <div className="relative p-6 rounded-full bg-lime-400/10 border-2 border-lime-400/30">
            <Crown className="w-16 h-16 text-lime-400" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-center mb-3">
          יש לך כבר מנוי פעיל 🎉
        </h1>

        {/* Subscription Details */}
        {subscription && (
          <p className="text-white/60 text-center mb-8">
            {subscription.plan === "yearly" ? "מנוי שנתי" : "מנוי חודשי"}
            {subscription.currentPeriodEnd &&
              ` • תוקף עד ${new Date(
                subscription.currentPeriodEnd
              ).toLocaleDateString("he-IL")}`}
          </p>
        )}

        {/* Auto-redirect message */}
        <p className="text-white/40 text-sm text-center mb-6">
          מעביר אותך למסע הכושר שלך...
        </p>

        {/* Immediate CTA */}
        <button
          onClick={handleGoToApp}
          className="px-8 py-4 rounded-2xl bg-lime-400 text-black font-semibold text-lg hover:bg-lime-500 transition-colors active:scale-95"
        >
          להיכנס עכשיו לאפליקציה
        </button>
      </div>
    );
  }

  // Handle back navigation to trial page
  const handleGoBack = () => {
    router.push("/trial");
  };

  // Not premium - show paywall
  return (
    <div className="min-h-screen bg-[#0b0d0e] text-white pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0b0d0e]/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={handleGoBack}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="חזור"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">שדרוג לפרימיום</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="px-6 py-8 max-w-md mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-lime-400/20 to-emerald-400/20 border border-lime-400/30 mb-6">
            <Crown className="w-12 h-12 text-lime-400" />
          </div>

          <h2 className="text-2xl font-bold mb-3 leading-snug">
            פתח מנוי לפרימיום
            <br />
            ותקבל גישה מלאה למסע הכושר שלך
          </h2>

          <p className="text-white/60 text-base mb-2">
            כל מה שאתה צריך כדי להגיע ליעדי הכושר שלך במקום אחד
          </p>

          <p className="text-white/50 text-sm">
            הכל נשמר בחשבון האישי שלך – המפה, המדדים, היומן וההתקדמות שלך בכל המכשירים
          </p>
        </div>

        {/* Benefits List */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="p-2 rounded-lg bg-lime-400/10 shrink-0">
              <Sparkles className="w-5 h-5 text-lime-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">מפת המסע האינטראקטיבית</h3>
              <p className="text-sm text-white/60">
                עקוב אחרי ההתקדמות שלך במפה ויזואלית ומרגשת
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="p-2 rounded-lg bg-lime-400/10 shrink-0">
              <TrendingUp className="w-5 h-5 text-lime-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">מעקב תזונה חכם</h3>
              <p className="text-sm text-white/60">
                סריקת ברקוד, חישוב קלוריות אוטומטי ומעקב מאקרו מתקדם
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="p-2 rounded-lg bg-lime-400/10 shrink-0">
              <Zap className="w-5 h-5 text-lime-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">צ׳אט עם מאמן AI ללא הגבלה</h3>
              <p className="text-sm text-white/60">
                קבל תשובות מיידיות לכל שאלה על אימונים, תזונה והרגלים
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="p-2 rounded-lg bg-lime-400/10 shrink-0">
              <Heart className="w-5 h-5 text-lime-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">תוכניות אימון מותאמות אישית</h3>
              <p className="text-sm text-white/60">
                תוכניות שנבנות במיוחד בשבילך על בסיס היעדים והיכולות שלך
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="p-2 rounded-lg bg-lime-400/10 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-lime-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Streaks ומוטיבציה יומית</h3>
              <p className="text-sm text-white/60">
                שמור על רצף ההצלחות שלך וקבל תגמולים על עקביות
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Options */}
        <div className="mb-6 space-y-3">
          {/* Monthly Plan */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-lime-400/10 to-emerald-400/10 border border-lime-400/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-white font-semibold text-lg">מנוי חודשי</h4>
                <p className="text-white/60 text-sm">ניתן לביטול בכל עת</p>
              </div>
              <div className="text-left">
                <p className="text-3xl font-bold text-lime-400">₪249.90</p>
                <p className="text-white/60 text-xs">לחודש</p>
              </div>
            </div>
          </div>

          {/* Yearly Plan - Best Value */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-lime-400/20 to-emerald-400/20 border-2 border-lime-400/50 relative">
            <div className="absolute -top-3 right-4 px-3 py-1 bg-lime-400 text-black text-xs font-bold rounded-full">
              החיסכון הכי גדול 💰
            </div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-white font-semibold text-lg">מנוי שנתי</h4>
                <p className="text-white/60 text-sm">חסכון של ₪2,050 בשנה</p>
              </div>
              <div className="text-left">
                <p className="text-3xl font-bold text-lime-400">₪949.00</p>
                <p className="text-white/60 text-xs">לשנה</p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <p className="text-center text-white/60 text-xs mt-3">
            התשלום מתבצע באופן מאובטח דרך App Store וניתן לביטול בכל עת בהגדרות Apple ID שלך
          </p>
        </div>

        {/* Legal & Subscription Details (Apple Guidelines 3.1.2 & 5.1.1) */}
        <div className="mb-6 space-y-2 text-center text-[11px] leading-relaxed text-white/50">
          <p>
            מנוי חודשי ושנתי מתחדש אוטומטית ונגבה מחשבון ה-Apple ID שלך. ניתן לבטל את החידוש האוטומטי בכל עת
            דרך הגדרות המנויים ב-App Store, עד 24 שעות לפני מועד החידוש הבא.
          </p>
          <p>
            המנוי מקושר לחשבון האישי שלך באפליקציה, כדי לשמור את המפה שלך, ההתקדמות, המדדים ויומן התזונה בכל
            המכשירים שלך.
          </p>
          <p className="mt-2">
            בלחיצה על &quot;להפעיל מנוי&quot; אתה מאשר את{" "}
            <button
              onClick={() => openExternal(PRIVACY_URL)}
              className="underline decoration-dotted text-white/70 hover:text-white transition-colors inline"
            >
              מדיניות הפרטיות
            </button>
            {" ו-"}
            <button
              onClick={() => openExternal(TERMS_URL)}
              className="underline decoration-dotted text-white/70 hover:text-white transition-colors inline"
            >
              תנאי השימוש
            </button>
            .
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleSubscribe}
          className="w-full py-4 px-6 rounded-2xl bg-lime-400 text-black font-bold text-lg hover:bg-lime-500 transition-all active:scale-[0.98] shadow-lg shadow-lime-400/25"
        >
          להפעיל מנוי עכשיו
        </button>

        {/* Footer Note */}
        <p className="text-center text-white/40 text-xs mt-4">
          תשלום מאובטח דרך Apple • ביטול מיידי בהגדרות
        </p>

        {/* Debug info (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 rounded-xl bg-white/5 p-4 text-xs text-white/40 space-y-1">
            <p className="font-semibold text-white/60 mb-2">Debug Info:</p>
            <p>User ID: {user?.id?.slice(0, 8)}...</p>
            <p>isPremium: {String(isPremium)}</p>
            <p>Subscription ID: {subscription?.id ?? "none"}</p>
            <p>Status: {subscription?.status ?? "none"}</p>
          </div>
        )}
      </main>
    </div>
  );
}
