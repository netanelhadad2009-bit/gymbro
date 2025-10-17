"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import StickyHeader from "@/components/ui/StickyHeader";
import texts from "@/lib/assistantTexts";
import { Pencil, LogOut } from "lucide-react";
import Link from "next/link";
import { genderToHe, dietLabel } from "@/lib/i18n";
import DeleteAccountButton from "@/components/profile/DeleteAccountButton";
import WhatsappSupportCard from "@/components/profile/WhatsappSupportCard";
import { getGoalLabelHe } from "@/lib/goals";
import { nativeConfirm } from "@/lib/nativeConfirm";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ProfileData {
  email?: string;
  gender?: string;
  date_of_birth?: string;
  weight?: number;
  target_weight?: number;
  height_cm?: number;
  goal?: string | null;
  diet_type?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format ISO date (YYYY-MM-DD) to Hebrew format (D/M/YYYY)
 */
function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  try {
    const date = new Date(isoDate);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "—";
  }
}

/**
 * Format value for display (handle nulls/undefined)
 */
function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

// ============================================================================
// COMPONENT: ReadonlyField
// ============================================================================

function ReadonlyField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex flex-col gap-1 mb-3">
      <label className="text-right text-sm text-[#B7C0C8]">{label}</label>
      <input
        readOnly
        value={formatValue(value)}
        className="bg-[#111213] text-white rounded-xl px-3 py-2 text-right border border-[#2A2B2C] placeholder:text-[#5E666D]"
      />
    </div>
  );
}

// ============================================================================
// COMPONENT: LoadingSkeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-1 mb-3">
      <div className="h-5 w-20 bg-[#111213] rounded animate-pulse" />
      <div className="h-10 bg-[#111213] rounded-xl animate-pulse border border-[#2A2B2C]" />
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    const ok = await nativeConfirm(
      "התנתקות",
      "האם אתה בטוח שברצונך להתנתק?",
      "התנתק",
      "ביטול"
    );

    if (!ok) return;

    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        // 1. Get current user from auth
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setLoading(false);
          return;
        }

        // 2. Try to get data from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // 3. Fetch goal from latest program
        const { data: programData } = await supabase
          .from("programs")
          .select("goal, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // 4. Build profile object with fallback to user_metadata and localStorage
        const metadata = user.user_metadata || {};

        // Get goal from localStorage (onboarding data)
        let onboardingGoal: string | null = null;
        if (typeof window !== "undefined") {
          try {
            // Try multiple localStorage keys
            const keys = ["gymbro_onboarding_data", "onboarding", "onboarding.goal"];
            for (const key of keys) {
              const raw = localStorage.getItem(key);
              if (raw) {
                try {
                  const parsed = JSON.parse(raw);
                  // Support both shapes: { goals: ["gain"] } or { goal: "gain" }
                  const goal = parsed?.goal ?? parsed?.goals?.[0] ?? null;
                  if (goal) {
                    onboardingGoal = goal;
                    break;
                  }
                } catch {
                  // If it's a plain string, use it directly
                  if (typeof raw === 'string' && raw.length > 0) {
                    onboardingGoal = raw;
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error reading onboarding data:", e);
          }
        }

        // Resolve goal from all sources with priority
        const rawGoal =
          programData?.goal ??
          profileData?.goal ??
          metadata?.goal ??
          onboardingGoal ??
          null;

        console.log("Profile goal resolution:", {
          programGoal: programData?.goal,
          profileGoal: profileData?.goal,
          metadataGoal: metadata?.goal,
          onboardingGoal,
          rawGoal,
        });

        const profileResult: ProfileData = {
          email: user.email,
          gender: profileData?.gender || metadata.gender || "—",
          date_of_birth:
            profileData?.date_of_birth ||
            profileData?.birthdate ||
            metadata.birthdate ||
            metadata.date_of_birth,
          weight:
            profileData?.weight ||
            profileData?.weight_kg ||
            metadata.weight_kg ||
            metadata.weight,
          target_weight:
            profileData?.target_weight ||
            profileData?.target_weight_kg ||
            metadata.target_weight_kg ||
            metadata.target_weight,
          height_cm:
            profileData?.height_cm || metadata.height_cm || metadata.height,
          goal: rawGoal,
          diet_type:
            profileData?.diet_type ||
            profileData?.diet ||
            metadata.diet ||
            metadata.diet_type,
        };

        setProfile(profileResult);
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("שגיאה בטעינת הפרופיל");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  // ============================================================================
  // RENDER: Not logged in
  // ============================================================================

  if (!loading && !profile?.email) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#0D0E0F] text-white pb-24"
        style={{ paddingTop: "max(env(safe-area-inset-top), 24px)" }}
      >
        <StickyHeader title={texts.profile.title} />
        <div className="max-w-screen-sm mx-auto px-4 py-6">
          <div className="text-center mt-12">
            <p className="text-[#B7C0C8]">{texts.profile.needToLogin}</p>
            <Link
              href="/login"
              className="inline-block mt-4 bg-[#E2F163] text-[#0D0E0F] px-6 py-3 rounded-xl font-semibold"
            >
              {texts.profile.loginButton}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ============================================================================
  // RENDER: Main Profile UI
  // ============================================================================

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#0D0E0F]"
      style={{ paddingTop: "max(env(safe-area-inset-top), 24px)" }}
    >
      <StickyHeader title={texts.profile.title} />

      <div className="max-w-screen-sm mx-auto px-4 pb-28">
        {/* Error Message */}
        {error && (
          <div className="text-[#B7C0C8] text-sm text-center mt-4">{error}</div>
        )}

        {/* Personal Info Card */}
        <div className="bg-[#1A1B1C] rounded-2xl p-4 mb-4">
          {loading ? (
            // Loading skeleton
            <>
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
            </>
          ) : (
            // Actual data - 8 fields in order
            <>
              {/* 1. Email */}
              <ReadonlyField label={texts.profile.email} value={profile?.email} />

              {/* 2. Gender */}
              <ReadonlyField label={texts.profile.gender} value={genderToHe(profile?.gender)} />

              {/* 3. Birth Date */}
              <ReadonlyField
                label={texts.profile.birthDate}
                value={formatDate(profile?.date_of_birth)}
              />

              {/* 4. Weight */}
              <ReadonlyField label={texts.profile.weight} value={profile?.weight} />

              {/* 5. Target Weight */}
              <ReadonlyField
                label={texts.profile.targetWeight}
                value={profile?.target_weight}
              />

              {/* 6. Height */}
              <ReadonlyField label={texts.profile.height} value={profile?.height_cm} />

              {/* 7. Goal */}
              <ReadonlyField
                label="מטרה"
                value={getGoalLabelHe(profile?.goal) ?? "—"}
              />

              {/* 8. Diet Type */}
              <ReadonlyField
                label="סוג דיאטה"
                value={dietLabel(profile?.diet_type)}
              />
            </>
          )}
        </div>

        {/* Edit Profile Button */}
        {!loading && (
          <Link
            href="/profile/edit"
            className="flex items-center justify-end gap-2 text-[#E2F163] text-base font-semibold mt-3 mb-6"
          >
            <span>{texts.profile.editProfile}</span>
            <Pencil className="w-4 h-4" />
          </Link>
        )}

        {/* Settings Card */}
        {!loading && (
          <div className="bg-[#1A1B1C] rounded-2xl p-4 mt-6">
            {/* Privacy Policy */}
            <div className="flex justify-between items-center py-3 border-b border-[#2A2B2C]">
              <span className="text-white font-medium">
                {texts.profile.privacyPolicy}
              </span>
            </div>

            {/* Terms of Use */}
            <div className="flex justify-between items-center py-3 border-b border-[#2A2B2C]">
              <span className="text-white font-medium">{texts.profile.termsOfUse}</span>
            </div>

            {/* Delete Account */}
            <DeleteAccountButton />

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-between py-3 active:bg-[#222529] active:opacity-90 transition-opacity text-right"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-red-500" />
                <span className="text-red-500 font-medium">
                  {texts.profile.logout}
                </span>
              </div>
            </button>
          </div>
        )}

        {/* WhatsApp Support Card */}
        {!loading && (
          <section className="mt-6">
            <WhatsappSupportCard />
          </section>
        )}
      </div>
    </main>
  );
}
