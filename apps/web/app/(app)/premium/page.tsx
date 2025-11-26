/**
 * Premium Paywall Page - Production Premium Gate
 *
 * This is the main paywall that non-premium users see after onboarding.
 * Premium users are automatically redirected to /journey.
 */

"use client";

import { useAuth } from "@/contexts/AuthProvider";
import { Crown, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { openExternal } from "@/lib/openExternal";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legalLinks";
import Image from "next/image";

export default function PremiumPage() {
  const router = useRouter();
  const { user, loading, isPremium, isSubscriptionLoading, subscription } =
    useAuth();
  const [autoRedirectCountdown, setAutoRedirectCountdown] = useState(800);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

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
    console.log(
      `[Premium] Subscribe button clicked - Plan: ${selectedPlan} - Apple IAP integration pending`
    );
    // Show production-ready message with selected plan
    alert(
      selectedPlan === "yearly"
        ? "מעבד את הבקשה... תוכל להפעיל מנוי שנתי דרך הגדרות ה-App Store."
        : "מעבד את הבקשה... תוכל להפעיל מנוי חודשי דרך הגדרות ה-App Store."
    );
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

  // Not premium - show redesigned paywall
  return (
    <div dir="rtl" className="min-h-screen bg-black text-white pb-safe">
      {/* Background Image - Top portion only */}
      <div className="absolute top-0 left-0 right-0 h-[40vh] z-0">
        <Image
          src="/images/premium-hero-bg.jpg"
          alt="Fitness Training"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header - Overlaid on image */}
        <header className="pt-safe">
          <div className="flex items-start justify-end px-4 py-4">
            <button
              onClick={handleGoBack}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-sm"
              aria-label="חזור"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Spacer to push content below image */}
        <div className="h-[calc(40vh-243px)]" />

        <main className="px-5 py-6 max-w-md mx-auto pb-24">

        {/* Hero Section - Below image */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold leading-tight">
            התחיל את ימי הניסיון שלך
            <br />
            חינם וללא התחייבות
          </h2>
        </div>

        {/* Benefits Section */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#E2F163] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">תוכנית אישית במקום עוד דיאטה</p>
              <p className="text-xs text-white/70">התאמה מלאה למבנה הגוף, למטרות ולסגנון החיים שלך.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#E2F163] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">שליטה מלאה במספרים</p>
              <p className="text-xs text-white/70">קלוריות, חלבון, מדדים וגרפים – הכל ברור ופשוט במסך אחד.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#E2F163] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">אתה לא לבד – האפליקציה איתך</p>
              <p className="text-xs text-white/70">האפליקציה מלווה אותך צעד־צעד, כדי שלא תתבלבל בדרך.</p>
            </div>
          </div>
        </div>

        {/* Plans Section */}
        <div className="mb-12">
          <p className="text-sm text-white/60 font-medium mb-4">
            בחר מסלול מנוי
          </p>

          <div className="space-y-3">
            {/* Yearly Plan - Recommended */}
            <button
              onClick={() => setSelectedPlan("yearly")}
              className={`w-full p-4 rounded-2xl transition-all relative ${
                selectedPlan === "yearly"
                  ? "bg-white/10 border-2 border-[#E2F163]"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              <div className="absolute -top-2 right-3 px-2 py-0.5 bg-[#E2F163] text-black text-[10px] font-semibold rounded-full">
                הכי משתלם
              </div>

              <div className="flex items-center justify-between gap-4">
                {/* Right side - Radio + Text */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedPlan === "yearly"
                        ? "border-[#E2F163] bg-[#E2F163]"
                        : "border-white/30"
                    }`}
                  >
                    {selectedPlan === "yearly" && (
                      <div className="w-2 h-2 bg-black rounded-full" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-white">שנתי</p>
                    <span className="px-2 py-0.5 bg-black text-white text-xs font-semibold rounded-full">
                      7 ימים בחינם
                    </span>
                  </div>
                </div>

                {/* Left side - Price */}
                <div className="text-left">
                  <p className="text-lg font-semibold text-white">₪949 לשנה</p>
                  <p className="text-xs text-white/50">(₪79.1/לחודש)</p>
                </div>
              </div>
            </button>

            {/* Monthly Plan */}
            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`w-full p-4 rounded-2xl transition-all ${
                selectedPlan === "monthly"
                  ? "bg-white/10 border-2 border-[#E2F163]"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Right side - Radio + Text */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedPlan === "monthly"
                        ? "border-[#E2F163] bg-[#E2F163]"
                        : "border-white/30"
                    }`}
                  >
                    {selectedPlan === "monthly" && (
                      <div className="w-2 h-2 bg-black rounded-full" />
                    )}
                  </div>

                  <p className="text-2xl font-bold text-white">חודשי</p>
                </div>

                {/* Left side - Price */}
                <div className="text-left">
                  <p className="text-lg font-semibold text-white">₪249.90/לחודש</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* CTA Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-safe">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle2 className="w-6 h-6 text-white" />
              <p className="text-white text-xl font-bold">
                ניתן לבטל בכל עת
              </p>
            </div>
            <button
              onClick={handleSubscribe}
              className="w-full py-4 px-6 rounded-full bg-[#E2F163] text-black font-bold text-lg transition-all active:scale-[0.98] shadow-lg"
            >
              התחל את השינוי שלך עכשיו
            </button>

            {/* Footer Links */}
            <div className="text-center text-white/50 text-sm mt-3">
              <button
                onClick={() => openExternal(PRIVACY_URL)}
                className="hover:text-white/70 transition-colors"
              >
                מדיניות פרטיות
              </button>
              <span className="mx-1">&</span>
              <button
                onClick={() => openExternal(TERMS_URL)}
                className="hover:text-white/70 transition-colors"
              >
                תנאי שימוש
              </button>
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
