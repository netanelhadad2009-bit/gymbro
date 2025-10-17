"use client";

import Link from "next/link";
import { MessageCircleMore } from "lucide-react";
import texts from "@/lib/assistantTexts";

export default function WhatsappSupportCard() {
  const dir = typeof document !== "undefined"
    ? document.documentElement.getAttribute("dir") ?? "rtl"
    : "rtl";

  const number = process.env.NEXT_PUBLIC_WA_NUMBER ?? "972509999999";
  const preset = encodeURIComponent("היי GymBro, יש לי שאלה:");
  const href = number ? `https://wa.me/${number}?text=${preset}` : "#";

  const Content = (
    <div
      className="
        w-full rounded-2xl
        bg-gradient-to-b from-[#25D366] to-[#128C7E]
        px-5 py-4
        shadow-[0_8px_24px_rgba(0,0,0,0.25)]
        text-white
        active:scale-[0.98] active:opacity-95
        transition-transform
      "
    >
      <div className={`flex items-center ${dir === "rtl" ? "flex-row-reverse" : ""} gap-4`}>
        <div className="shrink-0 rounded-full bg-white/10 ring-1 ring-white/15 p-2">
          <MessageCircleMore className="w-9 h-9 text-white" />
        </div>
        <p className="font-semibold leading-7">
          {texts.profile.whatsappHelp}
        </p>
      </div>
    </div>
  );

  // Make entire card tappable
  return number ? (
    <Link href={href} target="_blank" rel="noopener" aria-label="Contact us on WhatsApp" className="block">
      {Content}
    </Link>
  ) : (
    Content
  );
}
