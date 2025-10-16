"use client";

import Image from "next/image";
import MobileShell from "@/components/MobileShell";
import Link from "next/link";

export default function LandingPage() {
  return (
    <MobileShell
      noHeaderShadow
      footer={
        <div className="w-full space-y-3">
          <Link
            href="/onboarding/gender"
            className="block w-full text-center rounded-full py-4 font-bold text-black bg-[#E2F163] active:scale-[0.98] transition"
          >
            התחל את השאלון
          </Link>

          <Link
            href="/login"
            className="block w-full text-center rounded-full py-4 font-semibold text-white/90 border border-white/10 bg-white/5 active:scale-[0.98] transition"
          >
            כבר יש לך משתמש? התחבר עכשיו
          </Link>
        </div>
      }
    >
      <div className="px-4 pt-6 pb-4 space-y-6">
        {/* Hero image */}
        <div className="relative w-full overflow-hidden rounded-2xl aspect-[16/9] bg-white/5">
          <Image
            src="/image 4.svg"
            alt="Hero"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>

        {/* Title & subtitle */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight">GymBro</h1>
          <div className="w-16 h-1 bg-[#E2F163] mx-auto rounded-full" />
          <p className="text-lg text-white/90">
            המאמן הדיגיטלי שלך — מותאם אישית אליך.
          </p>
        </div>

        {/* Terms */}
        <p className="text-xs text-white/60 leading-relaxed text-center">
          בלחיצה על 'התחל את השאלון', אתה מסכים ל
          <Link href="/terms" className="underline mx-1 text-[#E2F163]">תנאי השימוש</Link>
          ו
          <Link href="/privacy" className="underline mr-1 text-[#E2F163]">מדיניות הפרטיות</Link>
          שלנו.
        </p>
      </div>
    </MobileShell>
  );
}
