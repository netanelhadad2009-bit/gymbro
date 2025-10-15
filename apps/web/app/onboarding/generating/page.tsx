"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDays, getWorkout, getNutrition, commitProgram as commitProgramAPI } from "@/lib/api-client";
import { saveProgramDraft } from "@/lib/program-draft";
import { getOnboardingData } from "@/lib/onboarding-storage";
import texts from "@/lib/assistantTexts";

const TOTAL_DURATION_MS = 25000; // Expected total time: 25 seconds (GPT-4o with pre-generation)
const FAST_DURATION_MS = 3000; // Fast completion when using pre-generated plans
const TICK_MS = 50;  // Update every 50ms

const getPHASES = () => [
  texts.generating.phases.calculating,     // 0–24%
  texts.generating.phases.creatingWorkouts,           // 25–54%
  texts.generating.phases.tuning, // 55–84%
  texts.generating.phases.syncing,              // 85–99%
  texts.generating.phases.ready            // 100%
];

function getPhaseIndex(percent: number) {
  if (percent >= 100) return 4;
  if (percent >= 85)  return 3;
  if (percent >= 55)  return 2;
  if (percent >= 25)  return 1;
  return 0;
}

export default function GeneratingPage() {
  const router = useRouter();
  const [uiProgress, setUiProgress] = useState(0);
  const [subtitle, setSubtitle] = useState<string>(texts.generating.starting);
  const [err, setErr] = useState<string | null>(null);
  const [backendDone, setBackendDone] = useState(false);
  const [startTime] = useState<number>(Date.now());
  const [usedPregenerated, setUsedPregenerated] = useState(false);
  const redirectPathRef = useRef<string | null>(null);

  // Phase text state
  const [phaseIndex, setPhaseIndex] = useState(0);

  // --- Uniform progress based purely on time elapsed ---
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const targetDuration = usedPregenerated ? FAST_DURATION_MS : TOTAL_DURATION_MS;
      const timeBasedProgress = Math.min(95, (elapsed / targetDuration) * 100);

      setUiProgress((p) => {
        if (backendDone) {
          // Sprint to 100 when done
          return Math.min(100, p + 2);
        }

        // Smoothly approach time-based target
        if (p < timeBasedProgress) {
          return Math.min(timeBasedProgress, p + 1);
        }
        return p;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [backendDone, startTime, usedPregenerated]);

  // --- Navigate when fully done ---
  useEffect(() => {
    if (backendDone && uiProgress >= 100 && redirectPathRef.current) {
      const t = setTimeout(() => router.replace(redirectPathRef.current!), 300);
      return () => clearTimeout(t);
    }
  }, [backendDone, uiProgress, router]);

  // --- Phase text updates based on progress ---
  useEffect(() => {
    const idx = getPhaseIndex(uiProgress);
    if (idx !== phaseIndex) {
      setPhaseIndex(idx);
    }
  }, [uiProgress, phaseIndex]);

  // --- Backend pipeline with robust parallel calls and retry ---
  useEffect(() => {
    let cancelled = false;

    const profile = getOnboardingData();
    if (!profile || !profile.height_cm) {
      setErr(texts.general.error);
      return;
    }

    // Calculate age from birthdate
    const age = profile.birthdate
      ? new Date().getFullYear() - new Date(profile.birthdate).getFullYear()
      : 28;

    // Map to API format
    const genderCode = profile.gender === "זכר" ? "male" : "female";
    const goalCode = profile.goals?.includes("ירידה במשקל") ? "loss" :
                     profile.goals?.includes("עלייה במסת שריר") ? "muscle" :
                     profile.goals?.includes("עלייה במשקל") ? "gain" : "loss";
    const activityCode = profile.activity === "מתחיל" ? "beginner" :
                        profile.activity === "בינוני" ? "intermediate" :
                        profile.activity === "מתקדם" ? "advanced" : "beginner";

    const todayISO = new Date().toISOString().slice(0, 10);

    (async () => {
      try {
        // 🚀 CHECK FOR PRE-GENERATED PLANS FIRST
        const pregeneratedRaw = localStorage.getItem("pregenerated_plans");
        if (pregeneratedRaw) {
          try {
            const pregenerated = JSON.parse(pregeneratedRaw);
            const age = Date.now() - pregenerated.timestamp;

            // Use if less than 5 minutes old
            if (age < 5 * 60 * 1000 && pregenerated.workout && pregenerated.nutrition) {
              console.log("[Pipeline] ⚡ Using pre-generated plans!");
              setUsedPregenerated(true); // Enable fast mode
              setSubtitle(texts.generating.loadingPlan);

              // Clear the cache
              localStorage.removeItem("pregenerated_plans");

              // Get user ID
              const { data: { user } } = await supabase.auth.getUser();

              // Commit to database
              if (user?.id) {
                setSubtitle(texts.generating.savingPlan);
                const commitRes = await commitProgramAPI({
                  userId: user.id,
                  days: pregenerated.days || 90,
                  workoutText: pregenerated.workout,
                  nutritionJson: pregenerated.nutrition,
                });

                if (commitRes.ok) {
                  console.log("[Pipeline] ✅ Pre-generated plans committed!");
                  setSubtitle(texts.generating.done);
                  redirectPathRef.current = "/program-ready";
                  setBackendDone(true);
                  return;
                }
              } else {
                // Save as draft
                saveProgramDraft({
                  days: pregenerated.days || 90,
                  workoutText: pregenerated.workout,
                  nutritionJson: pregenerated.nutrition,
                  createdAt: Date.now(),
                });
                redirectPathRef.current = "/program-ready";
                setBackendDone(true);
                return;
              }
            } else {
              console.log("[Pipeline] Pre-generated plans expired or incomplete, generating fresh");
              localStorage.removeItem("pregenerated_plans");
            }
          } catch (e) {
            console.log("[Pipeline] Failed to parse pre-generated plans, generating fresh");
            localStorage.removeItem("pregenerated_plans");
          }
        }

        // Step 1: Calculate days (fast, deterministic)
        setSubtitle(texts.generating.calculatingDays);
        const t0 = performance.now();

        const daysRes = await getDays({
          gender: genderCode,
          age: age,
          weight: profile.weight_kg || 75,
          targetWeight: profile.target_weight_kg || 70,
          heightCm: profile.height_cm || 170,
          goal: goalCode,
          activityLevel: activityCode,
        });

        console.log("[Pipeline] /ai/days completed in", Math.round(performance.now() - t0), "ms");
        if (cancelled) return;
        if (!daysRes.ok) throw new Error(daysRes.error || "שגיאה בחישוב ימים");

        // Step 2 & 3: Build workout + nutrition IN PARALLEL with allSettled
        setSubtitle(texts.generating.creatingParallel);
        const t1 = performance.now();

        // Get user ID from Supabase
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const userId = currentUser?.id || `guest-${Date.now()}`;

        const workoutPromise = getWorkout({
          userId: userId,
          gender: genderCode,
          age: age,
          weight: profile.weight_kg || 75,
          targetWeight: profile.target_weight_kg || 70,
          heightCm: profile.height_cm || 170,
          activityLevel: activityCode,
          experienceLevel: profile.experience || "בינוני",
          goal: profile.goals?.[0] || "שריפת שומן",
          workoutsPerWeek: profile.frequency || 3,
        });

        const nutritionPromise = getNutrition({
          gender: profile.gender || "זכר",
          age: age,
          heightCm: profile.height_cm || 170,
          weight: profile.weight_kg || 75,
          targetWeight: profile.target_weight_kg || 70,
          activityDisplay: profile.activity || "בינוני",
          goalDisplay: profile.goals?.[0] || "שריפת שומן",
          startDateISO: todayISO,
        });

        const results = await Promise.allSettled([workoutPromise, nutritionPromise]);
        console.log("[Pipeline] LLM calls completed in", Math.round(performance.now() - t1), "ms");

        if (cancelled) return;

        const workoutResult = results[0];
        const nutritionResult = results[1];

        let workoutText: string | null = null;
        let nutritionJson: any | null = null;
        let workoutError: string | null = null;
        let nutritionError: string | null = null;

        // Check if at least one succeeded
        const workoutOk = workoutResult.status === "fulfilled" && workoutResult.value.ok;
        const nutritionOk = nutritionResult.status === "fulfilled" && nutritionResult.value.ok;

        console.log("[Pipeline] Workout status:", workoutResult.status, "ok:", workoutOk);
        console.log("[Pipeline] Nutrition status:", nutritionResult.status, "ok:", nutritionOk);

        if (workoutResult.status === "rejected") {
          workoutError = workoutResult.reason?.message || String(workoutResult.reason);
          console.error("[Pipeline] Workout rejected:", workoutResult.reason);
        } else if (!workoutResult.value.ok) {
          workoutError = workoutResult.value.error || "שגיאה לא ידועה באימונים";
          console.error("[Pipeline] Workout failed:", workoutResult.value);
        }

        if (nutritionResult.status === "rejected") {
          nutritionError = nutritionResult.reason?.message || String(nutritionResult.reason);
          console.error("[Pipeline] Nutrition rejected:", nutritionResult.reason);
        } else if (!nutritionResult.value.ok) {
          nutritionError = nutritionResult.value.error || "שגיאה לא ידועה בתזונה";
          console.error("[Pipeline] Nutrition failed:", nutritionResult.value);
        }

        if (workoutOk) {
          workoutText = (workoutResult as PromiseFulfilledResult<any>).value.text;
          console.log("[Pipeline] Workout succeeded");
        }
        if (nutritionOk) {
          nutritionJson = (nutritionResult as PromiseFulfilledResult<any>).value.json;
          console.log("[Pipeline] Nutrition succeeded");
        }

        // Retry failed ones once
        if (!workoutOk) {
          console.warn("[Pipeline] Retrying workout...");
          setSubtitle(texts.generating.retryWorkout);
          try {
            const retryRes = await getWorkout({
              userId: userId,
              gender: genderCode,
              age: age,
              weight: profile.weight_kg || 75,
              targetWeight: profile.target_weight_kg || 70,
              heightCm: profile.height_cm || 170,
              activityLevel: activityCode,
              experienceLevel: profile.experience || "בינוני",
              goal: profile.goals?.[0] || "שריפת שומן",
              workoutsPerWeek: profile.frequency || 3,
            });
            if (retryRes.ok) {
              workoutText = retryRes.text || null;
              workoutError = null; // Clear error on success
              console.log("[Pipeline] Workout retry succeeded");
            } else {
              workoutError = retryRes.error || "שגיאה לא ידועה באימונים (ניסיון חוזר)";
            }
          } catch (e: any) {
            workoutError = e?.message || "שגיאה בניסיון חוזר לאימונים";
            console.error("[Pipeline] Workout retry failed:", e);
          }
        }

        if (!nutritionOk) {
          console.warn("[Pipeline] Retrying nutrition...");
          setSubtitle(texts.generating.retryNutrition);
          try {
            const retryRes = await getNutrition({
              gender: profile.gender || "זכר",
              age: age,
              heightCm: profile.height_cm || 170,
              weight: profile.weight_kg || 75,
              targetWeight: profile.target_weight_kg || 70,
              activityDisplay: profile.activity || "בינוני",
              goalDisplay: profile.goals?.[0] || "שריפת שומן",
              startDateISO: todayISO,
            });
            if (retryRes.ok) {
              nutritionJson = retryRes.json;
              nutritionError = null; // Clear error on success
              console.log("[Pipeline] Nutrition retry succeeded");
            } else {
              nutritionError = retryRes.error || "שגיאה לא ידועה בתזונה (ניסיון חוזר)";
            }
          } catch (e: any) {
            nutritionError = e?.message || "שגיאה בניסיון חוזר לתזונה";
            console.error("[Pipeline] Nutrition retry failed:", e);
          }
        }

        // Both must succeed to continue
        if (!workoutText || !nutritionJson) {
          // Show specific error messages if available
          const errors = [];
          if (!workoutText && workoutError) errors.push(`אימונים: ${workoutError}`);
          if (!nutritionJson && nutritionError) errors.push(`תזונה: ${nutritionError}`);

          const detailedError = errors.length > 0
            ? errors.join(" | ")
            : "יצירת התוכנית נכשלה. נסה שוב";

          throw new Error(detailedError);
        }

        // Step 4: Commit program
        setSubtitle(texts.generating.savingPlan);
        const { data: { user } } = await supabase.auth.getUser();
        const programData = {
          days: daysRes.days!,
          workoutText: workoutText,
          nutritionJson: nutritionJson,
        };

        console.log("[Pipeline] User ID:", user?.id || "NO USER (saving as draft)");

        if (user?.id) {
          console.log("[Pipeline] Committing program to database for user:", user.id);
          const commitRes = await commitProgramAPI({
            userId: user.id,
            ...programData,
          });
          console.log("[Pipeline] Commit response:", commitRes);
          if (cancelled) return;
          if (!commitRes.ok) throw new Error(commitRes.error || "שגיאה בשמירת התוכנית");
          console.log("[Pipeline] Program committed successfully");
          redirectPathRef.current = "/program-ready";
        } else {
          console.log("[Pipeline] No user - saving program draft to localStorage");
          saveProgramDraft({
            ...programData,
            createdAt: Date.now(),
          });
          console.log("[Pipeline] Draft saved, redirecting to intro page");
          redirectPathRef.current = "/program-ready";
        }

        setSubtitle(texts.generating.done);
        setBackendDone(true);
      } catch (e: any) {
        if (cancelled) return;
        console.error("[Pipeline] Fatal error:", e);
        setErr(e?.message || texts.general.error);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <main dir="rtl" className="min-h-[100svh] bg-[#0e0f12] text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {/* Progress Ring */}
        <div className="mx-auto my-10 relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="10"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="url(#gradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(uiProgress / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
              fill="none"
            />
            <defs>
              <linearGradient id="gradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#E2F163" />
                <stop offset="100%" stopColor="#d4e350" />
              </linearGradient>
            </defs>
          </svg>
          {/* Percentage text */}
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-3xl font-extrabold">{Math.round(uiProgress)}%</span>
          </div>
        </div>

        {/* Error display or Phase status text */}
        {err ? (
          <div className="bg-red-500/10 text-red-300 border border-red-500/30 rounded-xl p-4 mb-4 text-sm">
            {err}
          </div>
        ) : (
          <div aria-live="polite" className="mt-4 text-center text-white/80 text-sm">
            {getPHASES()[phaseIndex]}
          </div>
        )}

        {/* Retry button (only shown on error) */}
        {err && (
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full h-12 rounded-full bg-[#E2F163] text-black font-bold hover:bg-[#d4e350] transition active:scale-[0.98]"
          >
            {texts.general.tryAgain}
          </button>
        )}
      </div>
    </main>
  );
}
