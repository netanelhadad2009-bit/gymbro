/**
 * Premium Paywall Page - Production Premium Gate
 *
 * This is the main paywall that non-premium users see after onboarding.
 * Premium users are automatically redirected to /journey.
 */

"use client";

import { useAuth } from "@/contexts/AuthProvider";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { openExternal } from "@/lib/openExternal";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legalLinks";
import Image from "next/image";
import { purchaseAppleSubscription, initializeStore, type PlanType } from "@/lib/subscription/purchase";
import { saveAppleSubscription } from "@/lib/subscription/client";
import { Dialog } from "@capacitor/dialog";
import { Capacitor } from "@capacitor/core";
import { track } from "@/lib/mixpanel";
import AppsFlyer from "@/lib/appsflyer";
import { getDeviceId } from "@/lib/storage";

export default function PremiumPage() {
  const router = useRouter();
  const { user, loading, isPremium, isSubscriptionLoading, refreshSubscription } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const hasTrackedPaywallView = useRef(false);

  // If user is premium, immediately redirect to /journey (no delay, no UI flash)
  useEffect(() => {
    if (isPremium && user) {
      console.log("[PremiumPurchase] User is premium, immediately redirecting to /journey");
      router.replace("/journey");
    }
  }, [isPremium, user, router]);

  // Redirect to login if not authenticated (after loading)
  useEffect(() => {
    if (!loading && !isSubscriptionLoading && !user) {
      console.log("[PremiumPurchase] No user, redirecting to /login");
      router.replace("/login");
    }
  }, [loading, isSubscriptionLoading, user, router]);

  // Initialize IAP store on mount (only on iOS - Android has billing library compatibility issues)
  useEffect(() => {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      console.log("[PremiumPurchase] Initializing IAP store...");
      initializeStore().then((success) => {
        console.log("[PremiumPurchase] Store initialization result:", success);
      });
    } else if (Capacitor.getPlatform() === 'android') {
      console.log("[PremiumPurchase] Skipping IAP store initialization on Android (billing library compatibility issue)");
    }
  }, []);

  // Track paywall view (only once per mount, only for non-premium users)
  useEffect(() => {
    if (!loading && !isSubscriptionLoading && user && !isPremium && !hasTrackedPaywallView.current) {
      hasTrackedPaywallView.current = true;
      track("paywall_viewed", { source: "in_app" });
      AppsFlyer.logEvent("paywall_viewed", { source: "in_app" });
    }
  }, [loading, isSubscriptionLoading, user, isPremium]);

  // Handle CTA click - Real Apple IAP purchase
  const handleSubscribe = async () => {
    if (isPurchasing) return;

    // [analytics] Track subscribe click with plan details
    track("subscribe_click", {
      plan: selectedPlan,
      is_recommended: selectedPlan === "yearly",
    });
    AppsFlyer.logEvent("subscribe_click", {
      plan: selectedPlan,
      is_recommended: selectedPlan === "yearly",
    });

    console.log(`[PremiumPurchase] Subscribe button clicked - Plan: ${selectedPlan}`);
    setIsPurchasing(true);

    // [analytics] Track subscription purchase started
    track("subscription_purchase_started", {
      plan: selectedPlan,
      platform: Capacitor.isNativePlatform() ? "ios" : "web",
    });
    AppsFlyer.logEvent("subscription_purchase_started", {
      plan: selectedPlan,
      platform: Capacitor.isNativePlatform() ? "ios" : "web",
    });

    try {
      const result = await purchaseAppleSubscription(selectedPlan);

      console.log("[PremiumPurchase] Purchase result:", result);

      if (result.success) {
        // Calculate revenue based on plan for analytics
        const revenue = selectedPlan === "yearly" ? 949 : 249.90;

        // [analytics] Track subscription purchase success
        track("subscription_purchase_success", {
          plan: selectedPlan,
          platform: "ios",
          transaction_id: result.transactionId,
          revenue,
          currency: "ILS",
        });
        AppsFlyer.logEvent("subscription_purchase_success", {
          plan: selectedPlan,
          platform: "ios",
          transaction_id: result.transactionId,
          // AppsFlyer standard revenue fields for ROI tracking
          af_revenue: revenue,
          af_currency: "ILS",
        });

        console.log("[PremiumPurchase] Purchase successful, saving subscription to Supabase");

        // Save subscription to Supabase
        if (user && result.transactionId) {
          const savedSub = await saveAppleSubscription(
            user.id,
            selectedPlan,
            result.transactionId
          );
          if (savedSub) {
            console.log("[PremiumPurchase] Subscription saved to Supabase:", savedSub.id);

            // Send admin notification email (fire-and-forget, best-effort)
            fetch("/api/admin/notify-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: savedSub.userId,
                plan: savedSub.plan,
                status: savedSub.status,
                appleOriginalTransactionId: result.transactionId,
                appleProductId: result.productId ?? null,
                createdAt: new Date().toISOString(),
              }),
            }).catch((err) => {
              console.error("[PremiumPurchase] Failed to notify admin:", err);
            });

            // [sheets] Fire-and-forget: Log subscription to Google Sheets
            fetch("/api/admin/sheets-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: user.id,
                email: user.email,
                device_id: getDeviceId(),
                plan: selectedPlan,
                status: "active",
              }),
            }).catch(() => {}); // Ignore errors - best effort
          } else {
            console.error("[PremiumPurchase] Failed to save subscription to Supabase");
          }
        }

        // Show success message
        if (Capacitor.isNativePlatform()) {
          await Dialog.alert({
            title: "הצלחה!",
            message: "המנוי הופעל בהצלחה. ברוכים הבאים!",
            buttonTitle: "המשך",
          });
        } else {
          alert("המנוי הופעל בהצלחה. ברוכים הבאים!");
        }

        // Refresh subscription status and redirect
        if (refreshSubscription) {
          await refreshSubscription();
        }
        router.replace("/journey");
      } else {
        // Show error message (unless user cancelled)
        if (result.error && result.error !== "הרכישה בוטלה") {
          // [analytics] Track subscription purchase failed
          track("subscription_purchase_failed", {
            plan: selectedPlan,
            platform: "ios",
            error_type: "purchase_error",
          });
          AppsFlyer.logEvent("subscription_purchase_failed", {
            plan: selectedPlan,
            platform: "ios",
            error_type: "purchase_error",
          });

          console.error("[PremiumPurchase] Purchase failed:", result.error);
          if (Capacitor.isNativePlatform()) {
            await Dialog.alert({
              title: "שגיאה",
              message: result.error,
              buttonTitle: "סגור",
            });
          } else {
            alert(result.error);
          }
        } else {
          // [analytics] Track subscription purchase cancelled
          track("subscription_purchase_cancelled", {
            plan: selectedPlan,
            platform: "ios",
          });
          AppsFlyer.logEvent("subscription_purchase_cancelled", {
            plan: selectedPlan,
            platform: "ios",
          });
          console.log("[PremiumPurchase] Purchase cancelled by user");
        }
      }
    } catch (error: any) {
      // [analytics] Track subscription purchase failed with exception
      track("subscription_purchase_failed", {
        plan: selectedPlan,
        platform: "ios",
        error_type: "exception",
        error_code: error?.code ?? null,
      });
      AppsFlyer.logEvent("subscription_purchase_failed", {
        plan: selectedPlan,
        platform: "ios",
        error_type: "exception",
        error_code: error?.code ?? null,
      });

      // Enhanced error logging
      console.error("[PremiumPurchase] Unexpected error caught in handleSubscribe");
      console.error("[PremiumPurchase] Error type:", typeof error);
      console.error("[PremiumPurchase] Error constructor:", error?.constructor?.name);
      console.error("[PremiumPurchase] Error message:", error?.message);
      console.error("[PremiumPurchase] Error code:", error?.code);
      console.error("[PremiumPurchase] Error name:", error?.name);

      if (error && typeof error === 'object') {
        console.error("[PremiumPurchase] Error keys:", Object.keys(error));
        try {
          console.error("[PremiumPurchase] Error JSON:", JSON.stringify(error, null, 2));
        } catch (e) {
          console.error("[PremiumPurchase] Error cannot be stringified");
        }
      }

      if (error?.stack) {
        console.error("[PremiumPurchase] Error stack:", error.stack);
      }

      const errorMessage = error?.message || "אירעה שגיאה בלתי צפויה. נסה שוב.";

      if (Capacitor.isNativePlatform()) {
        await Dialog.alert({
          title: "שגיאה",
          message: errorMessage,
          buttonTitle: "סגור",
        });
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsPurchasing(false);
    }
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

  // If premium, show loading and redirect immediately (no success message flash)
  if (isPremium) {
    return (
      <div className="min-h-screen bg-[#0b0d0e] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-lime-400 animate-spin" />
        <p className="text-white/60 text-sm">מעביר אותך לאפליקציה…</p>
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
              disabled={isPurchasing}
              className={`w-full py-4 px-6 rounded-full bg-[#E2F163] text-black font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                isPurchasing ? "opacity-70 cursor-not-allowed" : "active:scale-[0.98]"
              }`}
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  מעבד רכישה...
                </>
              ) : (
                "התחל את השינוי שלך עכשיו"
              )}
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
