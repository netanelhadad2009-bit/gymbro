"use client";

import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();

  return (
    <main
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-between p-8 text-center text-white relative"
      style={{
        backgroundImage: "url('/image 4.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* Content wrapper with z-index */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
        <div className="mb-12">
          <h1 className="text-6xl font-extrabold tracking-tight mb-2 drop-shadow-lg">GymBro</h1>
          <div className="w-16 h-1 bg-[#E2F163] mx-auto rounded-full" />
        </div>
        <p className="text-xl text-white leading-relaxed max-w-md drop-shadow-md">
          המאמן הדיגיטלי שלך — מותאם אישית אליך.
        </p>
      </div>

      {/* Action buttons */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/onboarding/gender")}
          className="w-full bg-[#E2F163] text-black text-lg font-bold py-4 rounded-full transition hover:bg-[#d4e350] active:scale-[0.98] shadow-lg"
        >
          התחל את השאלון
        </button>
        <button
          onClick={() => router.push("/login")}
          className="text-white text-base font-normal hover:text-white/80 transition"
        >
          כבר יש לך משתמש?{" "}
          <span className="text-[#E2F163] underline">התחבר עכשיו</span>
        </button>
      </div>

      {/* Legal text */}
      <p className="relative z-10 text-xs text-white/80 leading-relaxed max-w-md drop-shadow-md">
        בלחיצה על 'התחל את השאלון', אתה מסכים ל
        <a href="/terms" className="underline mx-1">תנאי השימוש</a>
        ו
        <a href="/privacy" className="underline mr-1">מדיניות הפרטיות</a>
        שלנו.
      </p>
    </main>
  );
}
