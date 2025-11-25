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
      className="min-h-[100dvh] bg-[#0D0E0F] text-white flex flex-col px-6 pb-safe"
    >
      {/* Top section - Title & Subtitle */}
      <div className="pt-12 pb-8 text-center">
        <h1 className="text-4xl font-bold mb-6 leading-tight">
          קבל ניסוי חינמי למסע שלך
        </h1>
        <p className="text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
          אנחנו בונים עבורך מסע כושר ותזונה מותאם אישית, צעד אחר צעד.
          תראה איך נראה היום-יום באפליקציה, איך נראים המדדים שלך ואיך המאמן האישי מדבר איתך – עוד לפני שאתה מחליט על מנוי.
        </p>
      </div>

      {/* Middle section - Mockup image */}
      <div className="flex-1 flex items-center justify-center mb-8">
        <div className="relative w-full max-w-[420px] aspect-[9/16]">
          <Image
            src="/images/fitjourney-trial-mockup.webp"
            alt="מסכי הדוגמה של FitJourney"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Bottom section - CTA button */}
      <div className="pb-8">
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
