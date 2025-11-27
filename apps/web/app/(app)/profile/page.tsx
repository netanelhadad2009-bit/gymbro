"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import StickyHeader from "@/components/ui/StickyHeader";
import texts from "@/lib/assistantTexts";
import { Pencil, LogOut, Shield, FileText } from "lucide-react";
import Link from "next/link";
import { genderToHe, dietLabel } from "@/lib/i18n";
import DeleteAccountButton from "@/components/profile/DeleteAccountButton";
import WhatsappSupportCard from "@/components/profile/WhatsappSupportCard";
import { getGoalLabelHe } from "@/lib/goals";
import { nativeConfirm } from "@/lib/nativeConfirm";
import { openExternal } from "@/lib/openExternal";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legalLinks";

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
 * Calculate age from birth date
 */
function calculateAge(birthDate: string | null | undefined): string {
  if (!birthDate) return "—";
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return String(age);
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

    // Navigate to dedicated logout page (outside PremiumGate protection)
    // This prevents race condition where PremiumGate redirects to /login
    // before our redirect to / can happen
    router.push("/logout");
  };

  useEffect(() => {
    console.log('[Profile] 🔷 useEffect triggered - starting loadProfile()');

    async function loadProfile() {
      try {
        console.log('[Profile] 📍 Step 1: Setting loading state');
        setLoading(true);
        setError(null);

        // 1. Get current user from auth
        console.log('[Profile] 📍 Step 2: Fetching user from Supabase auth');
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        console.log('[Profile] 📍 Step 3: User fetch result:', {
          hasUser: !!user,
          userEmail: user?.email,
          userId: user?.id,
          userError: userError?.message,
        });

        if (userError || !user) {
          console.warn('[Profile] ⚠️  No user found, setting loading=false and returning');
          setLoading(false);
          return;
        }

        // 1.5. Migrate birthdate for returning users if needed
        try {
          const { ensureUserHasBirthdate } = await import('@/lib/auth/migrate-birthdate');
          const birthdate = await ensureUserHasBirthdate(supabase);
          console.log('[Profile] User birthdate migration check:', birthdate ? 'has birthdate' : 'no birthdate');
        } catch (err) {
          console.warn('[Profile] Failed to migrate birthdate:', err);
        }

        // 2. Try to get data from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        console.log('[Profile] Database fetch result:', {
          hasProfileData: !!profileData,
          profileError: profileError?.message,
          profileKeys: profileData ? Object.keys(profileData) : [],
          profileSnippet: profileData ? {
            age: profileData.age,
            gender: profileData.gender,
            height_cm: profileData.height_cm,
            weight_kg: profileData.weight_kg,
            goal: profileData.goal,
            diet: profileData.diet,
          } : null,
        });

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

        console.log('[Profile] User metadata:', {
          hasMetadata: !!user.user_metadata,
          metadataKeys: user.user_metadata ? Object.keys(user.user_metadata) : [],
          metadataSnippet: {
            age: metadata.age,
            gender: metadata.gender,
            height_cm: metadata.height_cm,
            weight_kg: metadata.weight_kg,
            goal: metadata.goal,
            diet: metadata.diet,
            birthdate: metadata.birthdate,
          },
        });

        // Get goal from localStorage (onboarding data)
        let onboardingGoal: string | null = null;
        if (typeof window !== "undefined") {
          try {
            // Try multiple localStorage keys (including new and legacy)
            const keys = ["fitjourney_onboarding_data", "gymbro_onboarding_data", "onboarding", "onboarding.goal"];
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

        // Build profile with data from database and fallbacks
        // Priority: Database birthdate (most accurate) > metadata birthdate > age fallback
        const birthdateFromDB = profileData?.birthdate;
        const birthdateFromMetadata = metadata.birthdate || metadata.date_of_birth;
        const ageFromProfile = profileData?.age;
        const ageFromMetadata = metadata.age;

        // Determine effective birthdate with priority:
        // 1. Database birthdate (most accurate, added in migration 036)
        // 2. Metadata birthdate (fallback for legacy users or recent saves)
        // 3. Convert age to approximate birthdate (last resort for very old accounts)
        let effectiveBirthdate: string | undefined;
        if (birthdateFromDB) {
          // Use database birthdate (highest priority)
          effectiveBirthdate = birthdateFromDB;
        } else if (birthdateFromMetadata) {
          // Use metadata birthdate as fallback
          effectiveBirthdate = birthdateFromMetadata;
        } else if (ageFromProfile) {
          // Convert database age to approximate birthdate (current year - age)
          const currentYear = new Date().getFullYear();
          effectiveBirthdate = `${currentYear - ageFromProfile}-01-01`;
        } else if (ageFromMetadata) {
          // Convert metadata age to approximate birthdate
          const currentYear = new Date().getFullYear();
          effectiveBirthdate = `${currentYear - ageFromMetadata}-01-01`;
        }

        console.log('[Profile] Birthdate/Age resolution:', {
          dbBirthdate: birthdateFromDB,
          metaBirthdate: birthdateFromMetadata,
          dbAge: ageFromProfile,
          metaAge: ageFromMetadata,
          effectiveBirthdate,
          calculatedAge: calculateAge(effectiveBirthdate),
        });

        const profileResult: ProfileData = {
          email: user.email,
          gender: profileData?.gender || metadata.gender || "—",
          date_of_birth: effectiveBirthdate,
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

        console.log('[Profile] Final profile result:', {
          email: profileResult.email,
          gender: profileResult.gender,
          age: calculateAge(profileResult.date_of_birth),
          weight: profileResult.weight,
          target_weight: profileResult.target_weight,
          height_cm: profileResult.height_cm,
          goal: profileResult.goal,
          diet_type: profileResult.diet_type,
        });

        console.log('[Profile] Translated values that will be displayed:', {
          gender: genderToHe(profileResult.gender),
          age: calculateAge(profileResult.date_of_birth),
          weight: formatValue(profileResult.weight),
          target_weight: formatValue(profileResult.target_weight),
          height_cm: formatValue(profileResult.height_cm),
          goal: getGoalLabelHe(profileResult.goal),
          diet: dietLabel(profileResult.diet_type),
        });

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

  // Check if user is actually logged in by checking if we have profile data
  // Don't rely on email as Apple sign-in may provide empty email
  if (!loading && !profile) {
    return (
      <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-[#0D0E0F]" dir="rtl">
        <StickyHeader title={texts.profile.title} />
        <main className="main-offset text-white px-4 pb-safe-120">
          <div className="max-w-screen-sm mx-auto py-6">
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
      </div>
    );
  }

  // ============================================================================
  // RENDER: Main Profile UI
  // ============================================================================

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-[#0D0E0F]" dir="rtl">
      <StickyHeader title={texts.profile.title} />
      <main className="main-offset px-4 pb-safe-120">
        <div className="max-w-screen-sm mx-auto">
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

                {/* 3. Age */}
                <ReadonlyField
                  label={texts.profile.age}
                  value={calculateAge(profile?.date_of_birth)}
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

                {/* Edit Profile Link - Inside card at bottom right */}
                <Link
                  href="/profile/edit"
                  className="flex items-center justify-end gap-2 text-[#E2F163] text-base font-semibold mt-3"
                >
                  <span>{texts.profile.editProfile}</span>
                  <Pencil className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Settings Card */}
          {!loading && (
            <div className="bg-[#1A1B1C] rounded-2xl p-4 mt-6">
              {/* Privacy Policy */}
              <button
                type="button"
                onClick={() => openExternal(PRIVACY_URL)}
                className="flex w-full justify-between items-center py-3 border-b border-[#2A2B2C] text-right bg-transparent border-l-0 border-r-0 border-t-0"
              >
                <div className="flex items-center gap-2 active:translate-y-0.5 transition-transform duration-75">
                  <Shield className="w-4 h-4 text-[#B7C0C8]" />
                  <span className="text-white font-medium">
                    {texts.profile.privacyPolicy}
                  </span>
                </div>
              </button>

              {/* Terms of Use */}
              <button
                type="button"
                onClick={() => openExternal(TERMS_URL)}
                className="flex w-full justify-between items-center py-3 border-b border-[#2A2B2C] text-right bg-transparent border-l-0 border-r-0 border-t-0"
              >
                <div className="flex items-center gap-2 active:translate-y-0.5 transition-transform duration-75">
                  <FileText className="w-4 h-4 text-[#B7C0C8]" />
                  <span className="text-white font-medium">{texts.profile.termsOfUse}</span>
                </div>
              </button>

              {/* Delete Account */}
              <DeleteAccountButton />

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-between py-3 text-right bg-transparent border-0"
              >
                <div className="flex items-center gap-2 active:translate-y-0.5 transition-transform duration-75">
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
    </div>
  );
}
