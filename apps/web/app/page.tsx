"use client";

import MobileShell from "@/components/MobileShell";
import MobileHeader from "@/components/MobileHeader";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();

  return (
    <MobileShell
      header={<MobileHeader title="GymBro" />}
      footer={
        <div className="grid gap-3 px-4 pb-3 pt-3">
          <button
            onClick={() => router.push("/onboarding/gender")}
            className="btn w-full rounded-full py-3 text-black font-bold bg-[#E2F163] text-center active:opacity-90"
          >
            התחל את השאלון
          </button>
          <button
            onClick={() => router.push("/login")}
            className="btn w-full rounded-full py-3 border border-white/15 text-white text-center active:opacity-90"
          >
            כבר יש לך משתמש? התחבר עכשיו
          </button>
        </div>
      }
    >
      {/* Content area — no fixed buttons here */}
      <section className="py-4 flex flex-col items-center justify-center min-h-full">
        {/* Replace hero background with contained image to avoid overlap */}
        <div className="rounded-2xl overflow-hidden w-full max-w-md mb-6">
          <img
            src="/image 4.svg"
            alt=""
            className="w-full h-48 object-cover"
            draggable={false}
          />
        </div>

        <div className="text-center space-y-4 max-w-md">
          <div className="mb-4">
            <h2 className="text-4xl font-extrabold tracking-tight mb-2">GymBro</h2>
            <div className="w-16 h-1 bg-[#E2F163] mx-auto rounded-full" />
          </div>
          <p className="text-lg text-white leading-relaxed">
            המאמן הדיגיטלי שלך — מותאם אישית אליך.
          </p>
          <p className="text-xs text-white/70 leading-relaxed pt-4">
            בלחיצה על 'התחל את השאלון', אתה מסכים ל
            <a href="/terms" className="underline mx-1">תנאי השימוש</a>
            ו
            <a href="/privacy" className="underline mr-1">מדיניות הפרטיות</a>
            שלנו.
          </p>
        </div>
      </section>
    </MobileShell>
  );
}
