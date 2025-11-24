"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readProgramDraft } from "@/lib/program-draft";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";
import { usePlatform } from "@/lib/platform";
import { motion, AnimatePresence } from "framer-motion";
import { openExternal } from "@/lib/openExternal";

const SOURCES = [
  {
    title: "שיעור חילוף חומרים בסיסי",
    url: "https://pubmed.ncbi.nlm.nih.gov/2305711/",
  },
  {
    title: "ספירת קלוריות - הרווארד",
    url: "https://pubmed.ncbi.nlm.nih.gov/6721853/",
  },
  {
    title: "ערכי צריכה תזונתיים מומלצים",
    url: "https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables.html",
  },
  {
    title: "האגודה הבינלאומית לתזונת ספורט",
    url: "https://journals.lww.com/acsm-msse/Fulltext/2011/07000/Quantity_and_Quality_of_Exercise_for_Developing.26.aspx",
  },
  {
    title: "ארגון הבריאות העולמי",
    url: "https://www.who.int/publications/i/item/9789240015128",
  },
];

export default function PreviewPage() {
  const router = useRouter();
  const { storage, haptics } = usePlatform();
  const { getGenderedText } = useOnboardingGender();
  const [loading, setLoading] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const programDraft = await readProgramDraft(storage);

      if (!programDraft) {
        console.error('[Preview] No draft found - showing error instead of redirect');
        setDraftError('לא נמצאה טיוטת תוכנית להצגה');
        setLoading(false);

        // Analytics: log missing draft
        if (typeof window !== 'undefined' && 'gtag' in window && typeof (window as any).gtag === 'function') {
          (window as any).gtag('event', 'preview_draft_missing', {
            reason: 'missing_or_invalid',
            timestamp: new Date().toISOString(),
          });
        }
        return;
      }

      console.log("[Preview] draft loaded", {
        hasWorkout: !!programDraft.workoutText,
        hasNutrition: !!programDraft.nutritionJson,
        version: programDraft.version,
        createdAt: programDraft.createdAt ? new Date(programDraft.createdAt).toISOString() : 'unknown',
      });

      setLoading(false);

      // Analytics: paywall view
      if (typeof window !== 'undefined' && 'gtag' in window && typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'paywall_view', {
          page: 'pre_pricing_paywall',
          timestamp: new Date().toISOString(),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPricing = async (source: string = 'sticky_cta') => {
    console.log(`[Analytics] paywall_cta_click: ${source}`);
    if (typeof window !== 'undefined' && 'gtag' in window && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'paywall_cta_click', { source });
    }
    await haptics.selection();
    router.push('/signup');
  };

  const handleCardClick = async (cardName: string) => {
    console.log(`[Analytics] paywall_card_click: ${cardName}`);
    if (typeof window !== 'undefined' && 'gtag' in window && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'paywall_card_click', { card_name: cardName });
    }
    await haptics.selection();
    goToPricing('locked_card');
  };

  const handleSourceClick = async (url: string) => {
    await openExternal(url);
  };

  const features = [
    {
      id: 'map',
      icon: '🗺️',
      title: 'מפת המסע המלאה',
      description: 'מפה אינטראקטיבית עם כל השלבים והמשימות במסך אחד.',
    },
    {
      id: 'stages',
      icon: '🎯',
      title: 'כל השלבים והמשימות',
      description: getGenderedText(
        'מעקב מלא מכל משימה ועד היעד הסופי שלך.',
        'מעקב מלא מכל משימה ועד היעד הסופי שלך.',
        'מעקב מלא מכל משימה ועד היעד הסופי שלך.'
      ),
    },
    {
      id: 'nutrition',
      icon: '🥗',
      title: 'תזונה מותאמת אישית',
      description: getGenderedText(
        'תפריט תזונה מותאם אישית לפי הנתונים והיעדים שלך.',
        'תפריט תזונה מותאם אישית לפי הנתונים והיעדים שלך.',
        'תפריט תזונה מותאם אישית לפי הנתונים והיעדים שלך.'
      ),
    },
    {
      id: 'progress',
      icon: '🏆',
      title: 'מעקב והתקדמות',
      description: getGenderedText(
        'נקודות, מדדים ושמירה של כל התהליך שלך.',
        'נקודות, מדדים ושמירה של כל התהליך שלך.',
        'נקודות, מדדים ושמירה של כל התהליך שלך.'
      ),
    },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1C1C22]" dir="rtl">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#E2F163] border-t-transparent" />
          <p className="mt-4 text-sm text-white/60">טוען תוכנית...</p>
        </div>
      </div>
    );
  }

  // Error state - show friendly message instead of redirect
  if (draftError) {
    return (
      <div className="min-h-screen bg-[#1C1C22] flex items-center justify-center px-4" dir="rtl">
        <div className="max-w-md text-center space-y-6">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-white">לא נמצאה תוכנית</h1>
          <p className="text-zinc-400 leading-relaxed">
            לא נמצאה טיוטת תוכנית להצגה. ייתכן שהתוכנית פגה תוקף (48 שעות) או נמחקה.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => {
                console.log('[Preview] User clicked return to generation');
                router.push('/onboarding/generating');
              }}
              className="rounded-full bg-[#E2F163] px-8 py-3 font-bold text-black transition hover:bg-[#d4e350] focus:outline-none focus:ring-2 focus:ring-[#E2F163] focus:ring-offset-2 focus:ring-offset-[#0e0f12]"
              aria-label="חזרה ליצירת תוכנית"
            >
              חזרה ליצירת תוכנית
            </button>
            <button
              onClick={() => {
                console.log('[Preview] User clicked return to summary');
                router.push('/onboarding/summary');
              }}
              className="rounded-full border border-white/20 bg-transparent px-8 py-3 font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#0e0f12]"
              aria-label="חזרה לשאלון"
            >
              חזרה לשאלון
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main paywall - pre-pricing screen
  return (
    <div className="min-h-[100dvh] overflow-y-auto overscroll-contain bg-[#1C1C22] pb-32" dir="rtl">
      {/* Header */}
      <header className="px-4 pb-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-black tracking-tight text-white leading-tight mb-3">
            {getGenderedText(
              'מסע הכושר שלך מוכן — בואו נתחיל!',
              'מסע הכושר שלך מוכן — בואי נתחיל!',
              'מסע הכושר שלך מוכן — בואו נתחיל!'
            )}
          </h1>
          <p className="text-zinc-400 leading-relaxed mb-4">
            יצרנו {getGenderedText('לך', 'לך', 'לך')} מסע אישי עם משימות מדויקות, תזונה מותאמת לפי היעדים {getGenderedText('שלך', 'שלך', 'שלך')} ומעקב התקדמות.
          </p>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{
              backgroundColor: '#E2F16320',
              color: '#E2F163',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>המסע האישי {getGenderedText('שלך', 'שלך', 'שלך')} נוצר ומחכה {getGenderedText('לך', 'לך', 'לך')}!</span>
          </div>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-8">
        {/* Features Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4"
        >
          {features.map((feature, index) => (
            <motion.button
              key={feature.id}
              onClick={() => handleCardClick(feature.id)}
              className="w-full text-right rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900/70 active:scale-[0.98] relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.05 }}
              aria-label={feature.title}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl" role="img" aria-hidden="true">
                  {feature.icon}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.section>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-sm text-zinc-500"
        >
          ✨ מצטרפים חדשים השבוע
        </motion.div>

        {/* Information Sources */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="space-y-4"
        >
          <h2 className="text-base font-semibold text-white/80 text-center">
            התוכנית מבוססת על המקורות הבאים, בין היתר מחקרים רפואיים שנבדקו:
          </h2>
          <div className="space-y-2">
            {SOURCES.map((source, index) => (
              <button
                key={index}
                onClick={() => handleSourceClick(source.url)}
                className="w-full bg-zinc-900/50 hover:bg-zinc-900/70 rounded-xl p-4 text-right transition-colors active:scale-[0.98] flex items-center justify-between group border border-zinc-800"
              >
                <span className="text-white/90 text-sm">{source.title}</span>
                <svg
                  className="w-4 h-4 text-white/40 group-hover:text-[#E2F163] transition-colors flex-shrink-0 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Bottom Spacer */}
        <div className="h-8" aria-hidden="true" />
      </main>

      {/* Sticky Bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1C1C22] via-[#1C1C22] to-transparent"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <button
            onClick={() => goToPricing('sticky_cta')}
            className="w-full py-4 rounded-2xl font-bold text-lg text-black transition-all active:scale-[0.98] shadow-lg"
            style={{
              backgroundColor: '#E2F163',
            }}
            aria-label="בואו נתחיל"
          >
            בואו נתחיל
          </button>
        </motion.div>
      </div>
    </div>
  );
}
