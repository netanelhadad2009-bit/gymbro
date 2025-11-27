"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import PrimaryButton from "@/components/PrimaryButton";
import { useOnboardingContext } from "../OnboardingContext";
import { getPushStatus } from '@/lib/notifications/permissions';
import { saveOnboardingData } from "@/lib/onboarding-storage";

export default function RatingPage() {
  const router = useRouter();
  const { progress, handleBack } = useOnboardingContext();
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsButtonEnabled(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = async () => {
    if (!isButtonEnabled) return;

    // Check if notifications are already granted
    const permissionStatus = await getPushStatus();

    if (permissionStatus === 'granted') {
      // Already granted - skip reminders page and go straight to generating
      console.log('[RatingPage] Notifications already granted, skipping reminders page');
      saveOnboardingData({ notifications_opt_in: true });
      router.push("/onboarding/generating");
    } else {
      // Not granted - show reminders page to request permission
      router.push("/onboarding/reminders");
    }
  };

  return (
    <div dir="rtl" className="flex flex-col h-screen bg-[#0B0D0E]">
      {/* Fixed header with progress bar only */}
      <div className="flex-shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4 px-5 pb-3 pt-5">
          {/* Progress Bar */}
          <div className="flex-1" dir="ltr">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleBack}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-white/70 active:text-white active:scale-95 transition"
            aria-label="חזור"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {/* Title - scrollable with content */}
        <div className="pt-4 pb-6">
          <h1 className="text-[32px] font-bold text-white text-center">
            תן לנו דירוג
          </h1>
        </div>

        {/* Static 5-Star Rating Display */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 mb-4">
          <div className="flex items-center justify-center gap-2 pointer-events-none select-none">
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <defs>
                <linearGradient id="starGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#f9f871', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#d4c84e', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="starShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
                </filter>
              </defs>
            </svg>
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className="w-12 h-12"
                viewBox="0 0 20 20"
                style={{ filter: 'url(#starShadow)', pointerEvents: 'none' }}
              >
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  fill="url(#starGradient)"
                />
              </svg>
            ))}
          </div>
        </div>

        {/* Subtitle below stars */}
        <h2 className="text-[28px] font-bold text-white text-center mb-8">
          FitJourney נבנתה
          <br />
          עבור אנשים כמוך
        </h2>

        {/* Social Proof Section */}
        <div className="flex flex-col items-center gap-3 mb-8">
          {/* Overlapping Avatars with real photos */}
          <div className="flex items-center justify-center" dir="ltr">
            <div className="w-16 h-16 rounded-full border-2 border-[#0B0D0E] overflow-hidden z-30">
              <Image
                src="https://i.pravatar.cc/150?img=12"
                alt="User avatar"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-16 h-16 rounded-full border-2 border-[#0B0D0E] overflow-hidden -ml-5 z-20">
              <Image
                src="https://i.pravatar.cc/150?img=33"
                alt="User avatar"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-16 h-16 rounded-full border-2 border-[#0B0D0E] overflow-hidden -ml-5 z-10">
              <Image
                src="https://i.pravatar.cc/150?img=59"
                alt="User avatar"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <p className="text-sm text-neutral-400 text-center">
            אלפי משתמשים כבר בתהליך עם FitJourney
          </p>
        </div>

        {/* Testimonials */}
        <div className="space-y-4 mb-8">
          {/* Testimonial 1 */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3" dir="rtl">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src="https://i.pravatar.cc/150?img=12"
                  alt="יוסי כהן"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <p className="text-white font-semibold text-base">יוסי כהן</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="w-4 h-4 text-[#e2f163]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-neutral-300 text-sm leading-relaxed text-right">
              "האפליקציה עזרה לי להגיע ליעדים שלי בצורה מדויקת ופשוטה. התוכנית מותאמת אישית ונותנת לי בדיוק את מה שאני צריך."
            </p>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3" dir="rtl">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src="https://i.pravatar.cc/150?img=33"
                  alt="דני לוי"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <p className="text-white font-semibold text-base">דני לוי</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="w-4 h-4 text-[#e2f163]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-neutral-300 text-sm leading-relaxed text-right">
              "חוויית משתמש מעולה! הכל מאוד אינטואיטיבי וקל לשימוש. אני מרגיש שהאפליקציה באמת מבינה אותי ואת הצרכים שלי."
            </p>
          </div>
        </div>
      </div>

      {/* Footer with CTA button */}
      <div className="flex-shrink-0 px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
        <PrimaryButton
          onClick={handleContinue}
          disabled={!isButtonEnabled}
          className={`h-14 text-lg transition-opacity ${!isButtonEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          הבא
        </PrimaryButton>
      </div>
    </div>
  );
}
