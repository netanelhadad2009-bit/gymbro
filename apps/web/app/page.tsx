"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import MobileShell from "@/components/MobileShell";
import { openExternal } from "@/lib/openExternal";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legalLinks";
import { BRAND_NAME } from "@/lib/brand";

// Constant to prevent any possibility of empty CTA text
const CTA_LABEL = "התחל את השאלון";

export default function HomePage() {
  // Force re-render when returning from external browser
  const [, forceUpdate] = useState(0);

  // Debug logging to track renders
  useEffect(() => {
    console.log("[HomePage] Mounted/Updated - CTA label:", CTA_LABEL);

    // Listen for external browser close event
    const handleBrowserClosed = () => {
      console.log("[HomePage] External browser closed, forcing re-render");
      forceUpdate(prev => prev + 1);
    };

    window.addEventListener('external-browser-closed', handleBrowserClosed);
    window.addEventListener('focus', handleBrowserClosed);

    return () => {
      window.removeEventListener('external-browser-closed', handleBrowserClosed);
      window.removeEventListener('focus', handleBrowserClosed);
    };
  }, []);

  // Footer content - not memoized to ensure event handlers stay fresh
  const footer = (
    <div className="w-full flex flex-col gap-3">
      {/* CTA */}
      <Link
        href="/onboarding/gender"
        className="block w-full text-center rounded-full py-4 text-black text-lg font-bold bg-[#E2F163] active:translate-y-1 active:brightness-90 transition no-underline"
        style={{
          color: '#000000',
          opacity: 1,
          visibility: 'visible',
          fontSize: '18px',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        <span style={{ color: '#000000', opacity: 1, visibility: 'visible', textDecoration: 'none' }}>
          {CTA_LABEL}
        </span>
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

      {/* Legal disclaimer with improved styling */}
      <p className="text-base text-center text-gray-400 mt-3 leading-relaxed max-w-[85%] mx-auto">
        בלחיצה על <span className="font-semibold text-white">התחל את השאלון</span>, אתה מסכים ל־
        <button
          type="button"
          onClick={(e) => {
            console.log("[HomePage] Terms button clicked", e);
            e.preventDefault();
            e.stopPropagation();
            openExternal(TERMS_URL);
          }}
          className="underline text-white mx-1 bg-transparent border-none p-0 cursor-pointer font-medium"
          style={{ touchAction: 'manipulation' }}
        >
          תנאי השימוש
        </button>
        ו־
        <button
          type="button"
          onClick={(e) => {
            console.log("[HomePage] Privacy button clicked", e);
            e.preventDefault();
            e.stopPropagation();
            openExternal(PRIVACY_URL);
          }}
          className="underline text-white mx-1 bg-transparent border-none p-0 cursor-pointer font-medium"
          style={{ touchAction: 'manipulation' }}
        >
          מדיניות הפרטיות
        </button>
        שלנו.
      </p>
    </div>
  );

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
      footer={footer}
    >
      {/* CONTENT (scrollable) */}
      <div className="w-full px-5 pt-20 flex flex-col items-center text-center text-white">
        <h1 className="text-4xl font-extrabold drop-shadow">{BRAND_NAME}</h1>
        <div className="w-16 h-1 bg-[#E2F163] rounded-full mt-3 mb-6" />
        <p className="text-lg leading-relaxed drop-shadow-sm">
          המאמן הדיגיטלי שלך — מותאם אישית אליך.
        </p>

        {/* Logo */}
        <motion.div
          className="mt-8 mb-6 w-full max-w-[220px]"
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 70,
            damping: 18,
            delay: 0.3
          }}
        >
          <img
            src="/logo.webp"
            alt={`${BRAND_NAME} Logo`}
            className="w-full h-auto"
          />
        </motion.div>
      </div>
    </MobileShell>
  );
}