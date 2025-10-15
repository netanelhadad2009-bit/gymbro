"use client";

import SocialAuthButtons from "@/components/SocialAuthButtons";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOnboardingData, clearOnboardingData } from "@/lib/onboarding-storage";
import { getDays, getWorkout, getNutrition, commitProgram } from "@/lib/api-client";
import { readProgramDraft, clearProgramDraft } from "@/lib/program-draft";

export default function SignupClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptMarketing, setAcceptMarketing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingProgram, setGeneratingProgram] = useState(false);

  /**
   * Generate personalized program after successful signup
   */
  async function generateProgram(userId: string, onboardingData: any): Promise<boolean> {
    try {
      setGeneratingProgram(true);

      // Prepare profile data from onboarding
      const daysProfile = {
        gender: onboardingData.gender === "זכר" ? "male" as const : "female" as const,
        age: new Date().getFullYear() - new Date(onboardingData.birthdate).getFullYear(),
        weight: onboardingData.weight_kg,
        targetWeight: onboardingData.target_weight_kg,
        heightCm: onboardingData.height_cm,
        goal: "loss" as const, // TODO: map from onboardingData.goals
        activityLevel: onboardingData.activity || "intermediate" as const
      };

      // Step 1: Calculate days
      const daysResult = await getDays(daysProfile);
      if (!daysResult.ok || !daysResult.days) {
        console.error("Failed to calculate days:", daysResult.error);
        return false;
      }

      // Step 2: Generate workout plan
      const workoutProfile = {
        ...daysProfile,
        experienceLevel: onboardingData.experience || "intermediate",
        goal: onboardingData.goals?.[0] || "שריפת שומן",
        workoutsPerWeek: onboardingData.frequency || 3
      };
      const workoutResult = await getWorkout(workoutProfile);
      if (!workoutResult.ok || !workoutResult.text) {
        console.error("Failed to generate workout:", workoutResult.error);
        return false;
      }

      // Step 3: Generate nutrition plan
      const nutritionProfile = {
        gender: onboardingData.gender,
        age: daysProfile.age,
        heightCm: onboardingData.height_cm,
        weight: onboardingData.weight_kg,
        targetWeight: onboardingData.target_weight_kg,
        activityDisplay: onboardingData.activity || "בינוני",
        goalDisplay: onboardingData.goals?.[0] || "שריפת שומן",
        startDateISO: new Date().toISOString().split('T')[0]
      };
      const nutritionResult = await getNutrition(nutritionProfile);
      if (!nutritionResult.ok || !nutritionResult.json) {
        console.error("Failed to generate nutrition:", nutritionResult.error);
        return false;
      }

      // Step 4: Commit to database
      const commitResult = await commitProgram({
        userId,
        days: daysResult.days,
        workoutText: workoutResult.text,
        nutritionJson: nutritionResult.json
      });

      if (!commitResult.ok) {
        console.error("Failed to commit program:", commitResult.error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Program generation error:", err);
      return false;
    } finally {
      setGeneratingProgram(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirm) {
      setError("הסיסמאות אינן תואמות");
      setLoading(false);
      return;
    }

    // Get onboarding data from localStorage
    const onboardingData = getOnboardingData();

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          accept_marketing: acceptMarketing,
          ...onboardingData, // Include all onboarding data
        }
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
    } else if (data?.user) {
      // Check if email confirmation is required
      if (data.user.identities && data.user.identities.length === 0) {
        setError("משתמש זה כבר קיים במערכת");
        setLoading(false);
      } else if (data.session) {
        // Session is available immediately (no email confirmation required)
        const userId = data.user.id;

        // Check for existing draft first
        const draft = readProgramDraft();
        console.log("[Signup] Draft found:", draft ? "YES" : "NO");
        if (draft && draft.workoutText) {
          console.log("[Signup] Committing draft for user:", userId);
          console.log("[Signup] Draft data:", { days: draft.days, workoutLength: draft.workoutText?.length, nutritionMeals: draft.nutritionJson?.meals_flat?.length });
          const commitRes = await commitProgram({
            userId,
            days: draft.days,
            workoutText: draft.workoutText,
            nutritionJson: draft.nutritionJson,
          });
          console.log("[Signup] Commit response:", commitRes);

          clearProgramDraft();
          clearOnboardingData();

          if (commitRes.ok) {
            console.log("[Signup] Draft committed successfully, redirecting to /journey");
            window.location.href = "/journey";
          } else {
            console.error("[Signup] Draft commit failed, redirecting to /journey");
            window.location.href = "/journey";
          }
          setLoading(false);
          return;
        }
        console.log("[Signup] No draft found, generating new program");

        // Generate personalized program
        const programSuccess = await generateProgram(userId, onboardingData);

        // Clear onboarding data from localStorage
        clearOnboardingData();

        if (programSuccess) {
          // Navigate to journey map page
          console.log("[Signup] Program generated successfully, redirecting to /journey");
          window.location.href = "/journey";
        } else {
          // Program generation failed, but still allow user to continue
          console.warn("Program generation failed, redirecting to journey");
          window.location.href = "/journey";
        }
      } else {
        // Email confirmation required
        setError("נשלח לך מייל אימות. אנא בדוק את תיבת הדואר שלך.");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white flex items-center justify-center">
      <div className="w-full max-w-md px-5 py-10">
        {/* Social Auth Buttons */}
        <SocialAuthButtons size="lg" variant="signup" />

        {/* Divider */}
        <div className="my-6 flex items-center gap-3 text-white/60">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-sm">או</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[#d9dee3]">אימייל</label>
            <input
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-12 w-full rounded-xl bg-white/5 text-white placeholder-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/20 px-4"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#d9dee3]">סיסמה</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl bg-white/5 text-white placeholder-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/20 px-4"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#d9dee3]">אשר סיסמה</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 w-full rounded-xl bg-white/5 text-white placeholder-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/20 px-4"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm pt-1">{error}</p>
          )}

          {/* Marketing Consent Checkbox */}
          <div className="flex items-center gap-3 pt-2">
            <div className="relative flex items-center justify-center shrink-0">
              <input
                type="checkbox"
                id="marketing-consent"
                checked={acceptMarketing}
                onChange={(e) => setAcceptMarketing(e.target.checked)}
                className="w-6 h-6 rounded cursor-pointer appearance-none border-2 border-white/40 bg-transparent checked:bg-[#E2F163] checked:border-[#E2F163] transition-all"
              />
              {acceptMarketing && (
                <svg
                  className="absolute w-4 h-4 pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="black"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <label htmlFor="marketing-consent" className="text-sm text-white/80 cursor-pointer leading-relaxed">
              אני מאשר/ת לקבל טיפים ומידע שימושי בתחום הכושר והתזונה למייל.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || generatingProgram}
            className="mt-6 h-14 w-full rounded-full bg-[#E2F163] text-black font-bold text-lg transition hover:bg-[#d5e35b] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingProgram ? "מכין את התוכנית שלך..." : loading ? "רושם..." : "הרשמה"}
          </button>
        </form>

      </div>
    </main>
  );
}
