"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readProgramDraft, type ProgramDraft } from "@/lib/program-draft";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";

export default function PreviewPage() {
  const router = useRouter();
  const { getGenderedText } = useOnboardingGender();
  const [draft, setDraft] = useState<ProgramDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const programDraft = readProgramDraft();
    
    if (!programDraft) {
      console.log("[Preview] No draft found, redirecting to generating");
      router.push("/onboarding/generating");
      return;
    }

    console.log("[Preview] draft loaded", {
      hasWorkout: !!programDraft.workoutText,
      hasNutrition: !!programDraft.nutritionJson,
    });

    setDraft(programDraft);
    setLoading(false);
  }, [router]);

  if (loading || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e0f12]" dir="rtl">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#E2F163] border-t-transparent" />
          <p className="mt-4 text-sm text-white/60">טוען תוכנית...</p>
        </div>
      </div>
    );
  }

  // Extract stats
  const days = draft.days;
  const caloriesTarget = draft.nutritionJson?.meta?.calories_target;
  const proteinTarget = draft.nutritionJson?.meta?.protein_target_g;
  const mealsCount = draft.nutritionJson?.meals_flat?.length
    ? new Set(draft.nutritionJson.meals_flat.map((m) => m.order)).size
    : 5;

  // Extract workout days
  const workoutDays = extractWorkoutDays(draft.workoutText || "");

  // Extract first day workout snippet
  const firstDayWorkout = extractFirstDayWorkout(draft.workoutText || "");

  // Get sample meals for preview (first 5 meals)
  const sampleMeals = draft.nutritionJson?.meals_flat?.slice(0, 5) || [];

  // Get one meal for feature card (order 3 = lunch)
  const lunchMeal = draft.nutritionJson?.meals_flat?.find((m) => m.order === 3);

  return (
    <div className="min-h-screen bg-[#0e0f12]" dir="rtl">
      <div className="mx-auto max-w-screen-md px-4 py-8 md:px-6 md:py-12 lg:px-8">
        {/* Header */}
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl" role="heading" aria-level={1}>
            התוכנית {getGenderedText("שלך", "שלך", "שלך")} כמעט מוכנה
          </h1>
          <p className="text-base text-white/70 md:text-lg">
            עוד רגע {getGenderedText("נכיר לך", "נכיר לך", "נכיר לך")} את התהליך המדויק{" "}
            {getGenderedText("שלך", "שלך", "שלך")} – אימונים, תזונה, ולוח זמנים ברור.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 md:mt-10 md:grid-cols-4 md:gap-4">
          <StatCard
            title="משך התהליך (ימים)"
            value={days.toString()}
            icon="📅"
          />
          <StatCard
            title="יעד יומי קלורי"
            value={caloriesTarget ? Math.round(caloriesTarget).toString() : "יחושב בהתחלה"}
            icon="🔥"
          />
          <StatCard
            title="חלבון ליום (גרם)"
            value={proteinTarget ? Math.round(proteinTarget).toString() : "יחושב בהתחלה"}
            icon="💪"
          />
          <StatCard
            title="מס' ארוחות ביום"
            value={mealsCount.toString()}
            icon="🍽️"
          />
        </div>

        {/* Features Section */}
        <div className="mt-8 space-y-4 md:mt-12 md:space-y-6">
          <h2 className="text-center text-2xl font-bold text-white" role="heading" aria-level={2}>
            מה מחכה {getGenderedText("לך", "לך", "לך")} בפנים
          </h2>

          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            {/* Feature 1: Workout Plan */}
            <FeatureCard
              title="תוכנית אימונים מותאמת אישית"
              icon="🏋️"
            >
              <div className="flex flex-wrap gap-2">
                {workoutDays.length > 0 ? (
                  workoutDays.map((day, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-[#E2F163]/10 px-3 py-1 text-xs font-medium text-[#E2F163]"
                    >
                      {day}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-white/60">
                    {draft.workoutText ? "תוכנית אימונים מלאה" : "ממתין לתוכנית"}
                  </span>
                )}
              </div>
            </FeatureCard>

            {/* Feature 2: Nutrition Plan */}
            <FeatureCard
              title="תזונה מדויקת בסגנון ישראלי"
              icon="🥗"
            >
              {lunchMeal ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-white">
                    {lunchMeal.title}
                  </div>
                  <div className="text-xs text-white/60">{lunchMeal.time}</div>
                  <div className="flex flex-wrap gap-1">
                    {lunchMeal.desc.split(",").slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-[#E2F163]/10 px-2 py-0.5 text-xs text-[#E2F163]"
                      >
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/60">
                  תפריט מותאם אישית לאורך כל התהליך
                </p>
              )}
            </FeatureCard>

            {/* Feature 3: Daily Tracking */}
            <FeatureCard
              title="מעקב יומי ותזכורות"
              icon="📊"
            >
              <p className="text-sm text-white/60">
                שקילה בוקר, מדדים חכמים, ותזכורות {getGenderedText("שמניעות אותך", "שמניעות אותך", "שמניעות אותך")} קדימה.
              </p>
            </FeatureCard>

            {/* Feature 4: Continuous Adaptation */}
            <FeatureCard
              title="התאמה מתמשכת"
              icon="⚡"
            >
              <p className="text-sm text-white/60">
                אנחנו מעדכנים עצימות ונפחים לפי ההתקדמות בפועל.
              </p>
            </FeatureCard>
          </div>
        </div>

        {/* Preview Accordions */}
        <div className="mt-8 space-y-4 md:mt-10">
          {firstDayWorkout && (
            <Accordion title="הצצה לאימון לדוגמה" icon="💪">
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white/5 p-4 font-mono text-xs text-white/80">
                {firstDayWorkout}
              </pre>
            </Accordion>
          )}

          {sampleMeals.length > 0 && (
            <Accordion title="הצצה לארוחות היום" icon="🍽️">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <th className="px-4 py-2 text-right font-medium text-white/80">
                        ארוחה
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-white/80">
                        זמן
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-white/80">
                        קלוריות
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleMeals.map((meal, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="px-4 py-2 text-white">
                          {meal.title}
                        </td>
                        <td className="px-4 py-2 text-white/60">
                          {meal.time}
                        </td>
                        <td className="px-4 py-2 text-white/60">
                          {Math.round(meal.kcal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Accordion>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-10 space-y-4 rounded-2xl bg-white/5 p-6 text-center border border-white/10 md:mt-12 md:p-8">
          <h2 className="text-2xl font-bold text-white" role="heading" aria-level={2}>
            {getGenderedText("מוכן", "מוכנה", "מוכן/ה")} להתחיל?
          </h2>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => {
                console.log("[Preview] go to signup");
                router.push("/signup");
              }}
              className="rounded-full bg-[#E2F163] px-8 py-3 font-bold text-black transition hover:bg-[#d4e350] focus:outline-none focus:ring-2 focus:ring-[#E2F163] focus:ring-offset-2 focus:ring-offset-[#0e0f12]"
              aria-label="המשך להרשמה"
            >
              המשך להרשמה
            </button>

            <button
              onClick={() => {
                router.push("/onboarding/summary");
              }}
              className="rounded-full border border-white/20 bg-transparent px-8 py-3 font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#0e0f12]"
              aria-label="חזרה לשאלון"
            >
              חזרה לשאלון
            </button>
          </div>

          <p className="text-xs text-white/50">
            נשמור את התוכנית {getGenderedText("שלך", "שלך", "שלך")} ו{getGenderedText("תוכל", "תוכלי", "תוכל/י")} לערוך הכול גם אחר כך.
          </p>
        </div>
      </div>
    </div>
  );
}

// Subcomponents

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-xs text-white/60">{title}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function FeatureCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-base font-bold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Accordion({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-right transition hover:bg-white/10"
        aria-expanded={open}
        aria-label={title}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-white">{title}</span>
        </div>
        <svg
          className={`h-5 w-5 text-white/60 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-white/10 p-5">{children}</div>}
    </div>
  );
}

// Helper functions

function extractWorkoutDays(workoutText: string): string[] {
  const hebrewDays = [
    "יום ראשון",
    "יום שני",
    "יום שלישי",
    "יום רביעי",
    "יום חמישי",
    "יום שישי",
    "יום שבת",
  ];

  const found: string[] = [];
  for (const day of hebrewDays) {
    if (workoutText.includes(day) && found.length < 5) {
      found.push(day);
    }
  }

  return found;
}

function extractFirstDayWorkout(workoutText: string): string {
  if (!workoutText) return "";

  // Find the first day section
  const firstDayMatch = workoutText.match(/יום ראשון[:\s]+([\s\S]*?)(?=יום |$)/);
  if (firstDayMatch && firstDayMatch[1]) {
    return "יום ראשון:\n" + firstDayMatch[1].trim().substring(0, 500) + "...";
  }

  // Fallback: just show first 500 chars
  return workoutText.substring(0, 500) + "...";
}
