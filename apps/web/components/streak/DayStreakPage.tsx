/**
 * DayStreakPage - Main streak tracking page
 *
 * Shows user's current streak, weekly activity, milestones, and CTA to mark today.
 * RTL Hebrew layout, no keyboard emojis, custom SVG icons.
 * Handles inline streak bump celebrations via URL params or localStorage flag.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Info, Check, AlertCircle } from "lucide-react";
import { FlameIcon } from "@/components/icons/FlameIcon";
import FlameClean from "@/components/streak/FlameClean";
import { StreakInlineHighlight } from "./StreakInlineHighlight";
import { getBumpFlag, clearBumpFlag, getTodayYMD } from "@/lib/streak/storage";
import { supabase } from "@/lib/supabase";
import type { StreakSummary, DayStatus } from "@/lib/streak";

interface DayStreakPageProps {
  initialData?: StreakSummary;
}

const HEBREW_DAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]; // Sun-Sat

// Mapping from JS getDay() to HEBREW_DAYS index
// JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
// HEBREW_DAYS: 0=א(Sun), 1=ב(Mon), 2=ג(Tue), 3=ד(Wed), 4=ה(Thu), 5=ו(Fri), 6=ש(Sat)
const jsToHebrewIndex: Record<number, number> = {
  0: 0, // Sunday → א
  1: 1, // Monday → ב
  2: 2, // Tuesday → ג
  3: 3, // Wednesday → ד
  4: 4, // Thursday → ה
  5: 5, // Friday → ו
  6: 6, // Saturday → ש
};

export default function DayStreakPage({ initialData }: DayStreakPageProps) {
  const [data, setData] = useState<StreakSummary | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [showInfo, setShowInfo] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [highlightData, setHighlightData] = useState<{ current: number; prev: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const streakSectionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get user ID
  useEffect(() => {
    const getUserId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error("[StreakPage] Error getting user:", error);
      }
    };

    getUserId();
  }, []);

  // Check for bump flag or URL params on mount
  useEffect(() => {
    if (!userId || !data) return;

    const highlight = searchParams.get("highlight");
    const bump = searchParams.get("bump");
    const todayYMD = getTodayYMD();

    // Check URL params or localStorage flag
    const shouldHighlight = highlight === "true" && bump === "1";
    const bumpFlag = getBumpFlag(userId, todayYMD);

    if (shouldHighlight || bumpFlag) {
      const current = bumpFlag?.current ?? data.current;
      const prev = bumpFlag?.prev ?? data.current - 1;

      console.log("[Streak] highlight start", {
        current,
        prev,
        ymd: todayYMD,
        source: bumpFlag ? "localStorage" : "URL",
      });

      setHighlightData({ current, prev });
      setShowHighlight(true);

      // Scroll to streak section
      setTimeout(() => {
        streakSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [userId, data, searchParams]);

  // Listen for streak:bump custom event (when already on page)
  useEffect(() => {
    const handleStreakBump = (event: Event) => {
      const customEvent = event as CustomEvent<{ current: number; prev: number }>;
      const { current, prev } = customEvent.detail;

      console.log("[Streak] highlight start (via event)", {
        current,
        prev,
        ymd: getTodayYMD(),
      });

      setHighlightData({ current, prev });
      setShowHighlight(true);

      // Scroll to streak section
      setTimeout(() => {
        streakSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    };

    window.addEventListener("streak:bump", handleStreakBump);

    return () => {
      window.removeEventListener("streak:bump", handleStreakBump);
    };
  }, []);

  // Handle highlight done
  const handleHighlightDone = () => {
    if (!userId) return;

    const todayYMD = getTodayYMD();

    console.log("[Streak] highlight done → clearing flag", {
      userId,
      ymd: todayYMD,
    });

    // Clear localStorage flag
    clearBumpFlag(userId, todayYMD);

    // Clear URL params
    router.replace("/streak", { scroll: false });

    // Hide highlight
    setShowHighlight(false);
    setHighlightData(null);
  };

  // Fetch streak data
  useEffect(() => {
    if (!initialData) {
      fetchStreak();
    }
  }, [initialData]);

  async function fetchStreak() {
    try {
      setLoading(true);
      const res = await fetch("/api/streak");
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to fetch streak");
      }

      setData(json.data);
    } catch (err) {
      console.error("[Streak] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0e0f12] to-[#1a1b20] flex items-center justify-center" dir="rtl">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <FlameIcon size={48} className="text-[#E2F163]" />
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0e0f12] to-[#1a1b20] flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white/80">שגיאה בטעינת נתוני הרצף</p>
          <button
            onClick={fetchStreak}
            className="mt-4 px-6 py-2 rounded-full bg-[#E2F163] text-black font-semibold"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  const progressPct = Math.round(data.nextMilestone.progress01 * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0e0f12] to-[#1a1b20]" dir="rtl">
      {/* Header */}
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-4 flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full bg-white/5 backdrop-blur flex items-center justify-center hover:bg-white/10 transition"
        >
          <ArrowRight className="w-5 h-5 text-white" />
        </button>

        <h1 className="text-2xl font-extrabold text-white">רצף ימים</h1>

        <button
          onClick={() => setShowInfo(true)}
          className="w-10 h-10 rounded-full bg-white/5 backdrop-blur flex items-center justify-center hover:bg-white/10 transition"
        >
          <Info className="w-5 h-5 text-white" />
        </button>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32" style={{ overflow: 'visible' }}>
        <div className="max-w-md mx-auto space-y-8" style={{ overflow: 'visible' }}>
          {/* Hero Section - Flame and Number */}
          <motion.div
            ref={streakSectionRef}
            id="streak-section"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center"
            style={{
              overflow: 'visible',
              paddingTop: 20,
              paddingBottom: 20
            }}
          >
            {/* Flame */}
            <div
              className="relative"
              style={{ overflow: 'visible' }}
            >
              <FlameClean width={280} />
            </div>

            {/* Number below flame - with optional highlight */}
            {showHighlight && highlightData ? (
              <StreakInlineHighlight
                current={highlightData.current}
                prev={highlightData.prev}
                onDone={handleHighlightDone}
              />
            ) : (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-8xl font-extrabold text-white mt-4"
              >
                {data.current}
              </motion.div>
            )}

            <p className="mt-2 text-white/60 text-lg">
              ימים ברצף
            </p>
          </motion.div>

          {/* Meta Row */}
          <div className="flex items-center justify-around px-4 py-4 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
            <div className="text-center">
              <div className="text-xs text-white/50 mb-1">התחלת רצף</div>
              <div className="text-white font-semibold">
                {data.startedOn
                  ? new Date(data.startedOn).toLocaleDateString("he-IL", {
                      day: "numeric",
                      month: "short",
                    })
                  : "---"}
              </div>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="text-center">
              <div className="text-xs text-white/50 mb-1">שיא רצף</div>
              <div className="text-white font-semibold text-xl">{data.max}</div>
            </div>
          </div>

          {/* This Week */}
          <div className="px-4 py-4 rounded-2xl bg-white/5 backdrop-blur border border-white/10" dir="rtl">
            <h2 className="text-white font-bold text-lg mb-4 text-right">השבוע</h2>
            <div className="flex items-center justify-center gap-3">
                {(() => {
                  // Get today's index first
                  const jsDay = new Date().getDay();
                  const todayHebrewIndex = jsToHebrewIndex[jsDay];

                  // Calculate which days are part of current streak
                  // Only show flames on days that are actually part of the active streak
                  const currentStreakDays = new Set<string>();

                  if (data.current >= 0) {
                    // Streak is 0-indexed, so current=0 means 1 day, current=1 means 2 days, etc.
                    const maxStreakDays = data.current + 1;
                    let streakCount = 0;

                    // Work backwards from TODAY's index (not from end of week)
                    for (let i = todayHebrewIndex; i >= 0 && streakCount < maxStreakDays; i--) {
                      const day = data.thisWeek[i];
                      if (day.done) {
                        currentStreakDays.add(day.date);
                        streakCount++;
                      } else {
                        // Streak broken, stop counting
                        break;
                      }
                    }
                  }

                  // Debug logging
                  console.log('[WeekStreak] Streak calculation:', {
                    currentStreak: data.current,
                    todayIndex: todayHebrewIndex,
                    todayLabel: HEBREW_DAYS[todayHebrewIndex],
                    maxStreakDays: data.current + 1,
                    currentStreakDays: Array.from(currentStreakDays),
                    thisWeek: data.thisWeek.map((d, i) => ({
                      idx: i,
                      label: HEBREW_DAYS[i],
                      date: d.date,
                      done: d.done,
                      isToday: i === todayHebrewIndex,
                      inCurrentStreak: currentStreakDays.has(d.date),
                    })),
                  });

                  return data.thisWeek.map((day, idx) => {
                    const isToday = idx === todayHebrewIndex;
                    const isCurrentStreakDay = currentStreakDays.has(day.date);

                    return (
                      <DayCircle
                        key={day.date}
                        day={day}
                        label={HEBREW_DAYS[idx]}
                        isToday={isToday}
                        isCurrentStreakDay={isCurrentStreakDay}
                      />
                    );
                  });
                })()}
            </div>
          </div>

          {/* Milestone Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#E2F163]/10 to-transparent border border-[#E2F163]/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#E2F163]/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-[#E2F163]">{data.nextMilestone.target}</span>
              </div>
              <div>
                <div className="text-white font-bold">היעד הבא</div>
                <div className="text-white/60 text-sm">
                  עוד {data.nextMilestone.remainingDays} ימים
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#E2F163] to-[#c7ff4a]"
              />
            </div>
            <div className="mt-2 text-left text-xs text-white/40 font-bold">{progressPct}%</div>
          </div>
        </div>
      </main>

      {/* Info Sheet */}
      <AnimatePresence>
        {showInfo && (
          <InfoSheet onClose={() => setShowInfo(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* Day Circle Component */
function DayCircle({
  day,
  label,
  isToday,
  isCurrentStreakDay
}: {
  day: DayStatus;
  label: string;
  isToday: boolean;
  isCurrentStreakDay: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs text-white/50">{label}</div>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={[
          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
          isCurrentStreakDay
            ? "bg-[#E2F163]/20 border-2 border-[#E2F163] shadow-[0_0_12px_rgba(226,241,99,0.5)]"
            : "bg-white/5 border border-white/10",
          isToday && "ring-2 ring-[#E2F163]/50 ring-offset-2 ring-offset-[#0e0f12]",
        ].join(" ")}
      >
        {isCurrentStreakDay ? (
          <FlameIcon size={20} className="text-[#E2F163]" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-white/20" />
        )}
      </motion.div>
    </div>
  );
}

/* Info Sheet Component */
function InfoSheet({ onClose }: { onClose: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[119] bg-black/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[120] rounded-t-3xl bg-[#1a1b20] border-t border-white/10 p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
        dir="rtl"
      >
        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />

        <h2 className="text-2xl font-bold text-white mb-4">איך עובד הרצף?</h2>

        <div className="space-y-4 text-white/80 leading-relaxed">
          <p>הרצף נבנה מימים רצופים של כניסה לאפליקציה:</p>

          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-[#E2F163] flex-shrink-0 mt-0.5" />
              <span>היכנס לאפליקציה כל יום</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-[#E2F163] flex-shrink-0 mt-0.5" />
              <span>הרצף נספר אוטומטית בכל כניסה</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-[#E2F163] flex-shrink-0 mt-0.5" />
              <span>שמור על רצף רצוף לתוצאות הטובות ביותר</span>
            </li>
          </ul>

          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-orange-400 text-sm font-semibold">
              שים לב: דילוג על יום אחד מאפס את הרצף!
            </p>
          </div>

          <p className="text-sm">רצפים ארוכים פותחים הישגים מיוחדים ומעניקים נקודות בונוס.</p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-xl bg-[#E2F163] text-black font-bold hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all"
        >
          הבנתי
        </button>
      </motion.div>
    </>
  );
}
