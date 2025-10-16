"use client";

import Image from "next/image";
import MobileShell from "@/components/MobileShell";
import Link from "next/link";

export default function LandingPage() {
  return (
    <MobileShell
      title=""
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
      {/* HERO as background image */}
      <section className="relative w-full min-h-[260px] md:min-h-[320px] min-[0px]:min-h-[36vh] overflow-hidden">
        {/* safe-area padding so content won't sit under the notch */}
        <div className="pt-[env(safe-area-inset-top)]" />
        <Image
          src="/image 4.svg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* dark gradient for contrast */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-transparent" />
        {/* centered overlay text */}
        <div className="absolute inset-0 flex items-end justify-center pb-6">
          <div className="px-5 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">GymBro</h1>
            <div className="w-16 h-1 bg-[#E2F163] mx-auto rounded-full my-2" />
            <p className="text-white/90 text-base">
              המאמן הדיגיטלי שלך — מותאם אישית אליך.
            </p>
          </div>
        </div>
      </section>

      {/* body content under hero */}
      <div className="screen px-4 py-5">
        <p className="text-xs text-white/60 leading-relaxed">
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
