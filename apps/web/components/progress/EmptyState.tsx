"use client";

import Link from "next/link";
import { TrendingUp, Utensils, BarChart3 } from "lucide-react";

type EmptyStateProps = {
  type: "weight" | "nutrition" | "all";
};

export function EmptyState({ type }: EmptyStateProps) {
  const messages = {
    weight: {
      title: "אין נתוני שקילה",
      description: "התחל לעקוב אחר המשקל שלך כדי לראות את ההתקדמות",
      cta: "הוסף שקילה",
      href: "/weigh-ins",
      icon: TrendingUp,
    },
    nutrition: {
      title: "אין נתוני תזונה",
      description: "תעד את הארוחות שלך כדי לעקוב אחר התזונה",
      cta: "הוסף ארוחה",
      href: "/nutrition/add-manual",
      icon: Utensils,
    },
    all: {
      title: "אין עדיין נתונים",
      description: "התחל לתעד ארוחות ושקילות כדי לראות את ההתקדמות שלך",
      cta: "התחל עכשיו",
      href: "/nutrition",
      icon: BarChart3,
    },
  };

  const msg = messages[type];
  const Icon = msg.icon;

  return (
    <div className="relative bg-[#141516] border border-white/5 rounded-2xl p-12 text-center">
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl pointer-events-none" />

      <div className="relative flex flex-col items-center">
        {/* Icon */}
        <div className="w-20 h-20 mb-6 flex items-center justify-center bg-[#E2F163]/10 border border-[#E2F163]/20 rounded-full">
          <Icon size={36} className="text-[#E2F163]" strokeWidth={1.5} />
        </div>

        {/* Text */}
        <h2 className="text-xl font-bold text-white mb-2">{msg.title}</h2>
        <p className="text-[#A5A7AA] mb-8 max-w-xs leading-relaxed">
          {msg.description}
        </p>

        {/* CTA */}
        <Link
          href={msg.href}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#E2F163] text-black font-semibold rounded-full hover:bg-[#d4e14e] active:scale-95 transition-all shadow-lg shadow-[#E2F163]/20"
        >
          {msg.cta}
        </Link>
      </div>
    </div>
  );
}
