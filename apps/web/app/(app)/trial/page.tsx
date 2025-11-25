"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function TrialPage() {
  const router = useRouter();

  const handleStartJourney = () => {
    router.push("/premium");
  };

  return (
    <main
      dir="rtl"
      className="min-h-[100dvh] bg-[#0D0E0F] text-white flex flex-col px-4 pb-safe"
    >
      {/* Top section - Title & Subtitle */}
      <div className="pt-8 pb-4 text-center">
        <h1 className="text-3xl font-bold mb-3 leading-snug">
          התחל את המסע שלך<br />עם ניסיון חינמי
        </h1>
        <p className="text-base text-white/70 leading-relaxed px-2">
          מסע כושר ותזונה מותאם אישית רק בשבילך. תראה את האפליקציה והמדדים שלך בפעולה. המאמן האישי שלך כבר מוכן – בואו נתחיל!
        </p>
      </div>

      {/* Middle section - Mockup image */}
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="relative w-full max-w-[85%] aspect-[9/16]">
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
      <div className="pb-6">
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
