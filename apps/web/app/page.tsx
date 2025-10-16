"use client";

import Link from "next/link";
import Image from "next/image";
import MobileShell from "@/components/MobileShell";

export default function HomePage() {
  return (
    <MobileShell
      noHeaderShadow
      disableScroll={true}
      background={
        <Image
          src="/image 4.svg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      }
      overlayClass="bg-black/45"
      footer={
        <div className="w-full flex flex-col gap-3">
          {/* CTA */}
          <Link
            href="/onboarding/gender"
            className="block w-full text-center rounded-full py-4 text-black text-lg font-bold bg-[#E2F163] active:scale-[0.98] transition"
          >
            התחל את השאלון
          </Link>

          {/* Login text (NOT a button) */}
          <p className="text-center text-white/90">
            כבר יש לך משתמש?{" "}
            <Link
              href="/login"
              className="text-[#E2F163]"
            >
              התחבר עכשיו
            </Link>
          </p>

          {/* Legal line — stick to very bottom with small font */}
          <p className="text-center text-xs text-white/80 leading-relaxed mt-1">
            בלחיצה על <span className="mx-1">'התחל את השאלון'</span>, אתה מסכים ל
            <Link href="/terms" className="underline mx-1">תנאי השימוש</Link>
            {" "}ו{" "}
            <Link href="/privacy" className="underline mx-1">מדיניות הפרטיות</Link>
            שלנו.
          </p>
        </div>
      }
    >
      {/* CONTENT (scrollable) */}
      <div className="w-full px-5 pt-20 flex flex-col items-center text-center text-white">
        <h1 className="text-4xl font-extrabold drop-shadow">GymBro</h1>
        <div className="w-16 h-1 bg-[#E2F163] rounded-full mt-3 mb-6" />
        <p className="text-lg leading-relaxed drop-shadow-sm">
          המאמן הדיגיטלי שלך — מותאם אישית אליך.
        </p>
      </div>
    </MobileShell>
  );
}
