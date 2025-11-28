"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function TrialPage() {
  const [isNavigating, setIsNavigating] = useState(false);
  const navigatingRef = useRef(false);

  // Prevent back navigation to signup/registration pages
  useEffect(() => {
    // Replace the current history entry to prevent going back
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      // Prevent back navigation by pushing the current state again
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleStartJourney = () => {
    // Use ref for immediate check (no React re-render delay)
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    setIsNavigating(true);

    // Navigate immediately
    window.location.href = "/premium";
  };

  return (
    <main
      dir="rtl"
      className="min-h-[100dvh] bg-[#0D0E0F] text-white flex flex-col pt-safe pb-safe overflow-hidden"
    >
      {/* Top section - Title & Subtitle */}
      <div className="pt-8 pb-1 text-center shrink-0 px-4">
        <h1 className="text-4xl font-bold mb-3 leading-tight">
          התחל את המסע שלך<br />עם ניסיון חינמי
        </h1>
        <p className="text-base text-white/70 leading-snug px-2">
          מסע כושר ותזונה מותאם אישית רק בשבילך. תראה את האפליקציה והמדדים שלך בפעולה. המאמן האישי שלך כבר מוכן – בואו נתחיל!
        </p>
      </div>

      {/* Middle section - Mockup image */}
      <div className="flex-1 relative w-full min-h-0 -my-2 px-16">
        <Image
          src="/images/fitjourney-trial-mockup-large.webp"
          alt="מסכי הדוגמה של FitJourney"
          fill
          className="object-contain scale-[1.15]"
          priority
        />
      </div>

      {/* Bottom section - CTA button */}
      <div className="pt-1 pb-3 shrink-0 px-4">
        <button
          onClick={handleStartJourney}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleStartJourney();
          }}
          disabled={isNavigating}
          className="w-full py-4 rounded-full bg-[#E2F163] text-black font-bold text-lg transition-transform active:scale-[0.98] shadow-lg disabled:opacity-70 touch-manipulation"
        >
          {isNavigating ? "טוען..." : "אני רוצה להתחיל את המסע"}
        </button>
      </div>
    </main>
  );
}
