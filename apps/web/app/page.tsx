"use client";

import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative w-full h-[100svh] overflow-hidden">
      {/* Background image spans the entire viewport */}
      <Image
        src="/image 4.svg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* Readability gradient - stronger at bottom for CTA visibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />

      {/* Overlay content centered, with safe areas */}
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
        <div className="w-full pt-[env(safe-area-inset-top)] pb-[calc(180px+env(safe-area-inset-bottom))]">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">GymBro</h1>
          <div className="w-16 h-1 bg-[#E2F163] mx-auto rounded-full my-2" />
          <p className="text-white/90 text-base">
            המאמן הדיגיטלי שלך — מותאם אישית אליך.
          </p>

          {/* fine print */}
          <p className="mt-6 text-xs text-white/70 leading-relaxed">
            בלחיצה על 'התחל את השאלון', אתה מסכים ל
            <Link href="/terms" className="underline mx-1 text-[#E2F163]">תנאי השימוש</Link>
            ו
            <Link href="/privacy" className="underline mr-1 text-[#E2F163]">מדיניות הפרטיות</Link>
            שלנו.
          </p>
        </div>
      </div>

      {/* Fixed bottom CTAs - positioned absolutely over the hero */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[env(safe-area-inset-bottom)] pt-4 pb-4">
        <div className="w-full max-w-md mx-auto space-y-3">
          <Link
            href="/onboarding/gender"
            className="block w-full text-center rounded-full py-4 font-bold text-black bg-[#E2F163] active:scale-[0.98] transition shadow-lg"
          >
            התחל את השאלון
          </Link>
          <Link
            href="/login"
            className="block w-full text-center rounded-full py-4 font-semibold text-white/90 border border-white/20 bg-white/10 backdrop-blur-sm active:scale-[0.98] transition"
          >
            כבר יש לך משתמש? התחבר עכשיו
          </Link>
        </div>
      </div>
    </main>
  );
}
