"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect } from "react";

export default function TrialPage() {
  const router = useRouter();

  // Prevent back navigation to signup/registration pages
  useEffect(() => {
    // Replace the current history entry to prevent going back
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      // Prevent back navigation by pushing the current state again
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleStartJourney = () => {
    router.push("/premium");
  };

  return (
    <main
      dir="rtl"
      className="min-h-[100dvh] bg-[#0D0E0F] text-white flex flex-col px-4 pt-safe pb-safe"
    >
      {/* Top section - Title & Subtitle */}
      <div className="pt-4 pb-2 text-center">
        <h1 className="text-2xl font-bold mb-1.5 leading-tight">
          התחל את המסע שלך<br />עם ניסיון חינמי
        </h1>
        <p className="text-sm text-white/70 leading-snug px-2">
          מסע כושר ותזונה מותאם אישית רק בשבילך. תראה את האפליקציה והמדדים שלך בפעולה. המאמן האישי שלך כבר מוכן – בואו נתחיל!
        </p>
      </div>

      {/* Middle section - Mockup image */}
      <div className="flex-1 flex items-center justify-center min-h-0 -my-2">
        <div className="relative w-full max-w-[96%] aspect-[9/16]">
          <Image
            src="/images/fitjourney-trial-mockup-large.webp"
            alt="מסכי הדוגמה של FitJourney"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Bottom section - CTA button */}
      <div className="pt-2 pb-4">
        <button
          onClick={handleStartJourney}
          className="w-full py-4 rounded-full bg-[#E2F163] text-black font-bold text-lg transition-transform active:scale-[0.98] shadow-lg"
        >
          אני רוצה להתחיל את המסע
        </button>
      </div>
    </main>
  );
}
