/**
 * Premium Page - Subscription status and upgrade placeholder
 *
 * Shows premium status for authenticated users.
 * Placeholder for future Apple/Google subscription integration.
 */

"use client";

import { useAuth } from "@/contexts/AuthProvider";
import { ArrowRight, Crown, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PremiumPage() {
  const router = useRouter();
  const { user, isPremium, subscription, isSubscriptionLoading } = useAuth();

  // Show loading state while checking subscription
  if (isSubscriptionLoading) {
    return (
      <div className="min-h-screen bg-[#0b0d0e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d0e] text-white pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0b0d0e]/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -mr-2 text-white/60 hover:text-white transition-colors"
            aria-label="חזרה"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">שדרוג לפרימיום</h1>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Premium Status Card */}
        <div
          className={`rounded-2xl p-6 ${
            isPremium
              ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30"
              : "bg-white/5 border border-white/10"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`p-3 rounded-full ${
                isPremium ? "bg-amber-500/20" : "bg-white/10"
              }`}
            >
              <Crown
                className={`w-6 h-6 ${
                  isPremium ? "text-amber-400" : "text-white/40"
                }`}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isPremium ? "פרימיום פעיל" : "חשבון רגיל"}
              </h2>
              {subscription && (
                <p className="text-sm text-white/60">
                  {subscription.plan === "yearly" ? "מנוי שנתי" : "מנוי חודשי"}
                </p>
              )}
            </div>
          </div>

          {isPremium ? (
            <div className="space-y-3">
              <p className="text-white/80">יש לך מנוי פעיל בפרימיום 🎉</p>
              {subscription?.currentPeriodEnd && (
                <p className="text-sm text-white/60">
                  תוקף עד:{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                    "he-IL"
                  )}
                </p>
              )}

              {/* Premium features */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>גישה לכל התכונות המתקדמות</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>תמיכה מועדפת</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>ללא פרסומות</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-white/80">
                שדרג לפרימיום כדי לקבל גישה לכל התכונות המתקדמות של FitJourney.
              </p>

              {/* Benefits list */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>תוכניות אימון מותאמות אישית</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>מעקב תזונה מתקדם</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>צ׳אט עם מאמן AI ללא הגבלה</span>
                </div>
              </div>

              {/* Coming soon button */}
              <button
                disabled
                className="w-full mt-4 py-3 px-4 rounded-xl bg-amber-500/20 text-amber-400 font-medium text-center opacity-60 cursor-not-allowed"
              >
                בקרוב: תשלום דרך Apple
              </button>

              <p className="text-xs text-white/40 text-center">
                אפשרות הרכישה תהיה זמינה בקרוב
              </p>
            </div>
          )}
        </div>

        {/* Debug info (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="rounded-xl bg-white/5 p-4 text-xs text-white/40 space-y-1">
            <p>Debug Info:</p>
            <p>User ID: {user?.id?.slice(0, 8)}...</p>
            <p>isPremium: {String(isPremium)}</p>
            <p>Subscription ID: {subscription?.id ?? "none"}</p>
            <p>Status: {subscription?.status ?? "none"}</p>
            <p>Provider: {subscription?.provider ?? "none"}</p>
          </div>
        )}
      </main>
    </div>
  );
}
