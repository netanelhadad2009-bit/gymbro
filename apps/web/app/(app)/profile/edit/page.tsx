"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import StickyHeader from "@/components/ui/StickyHeader";
import texts from "@/lib/assistantTexts";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { genderToHe } from "@/lib/i18n";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ProfileData {
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
 * Convert date to YYYY-MM-DD format for date input
 */
function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

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

// ============================================================================
// COMPONENT: EditableField
// ============================================================================

function EditableField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  // Date inputs need special styling for RTL
  const isDateInput = type === "date";

  return (
    <div className="flex flex-col gap-1 mb-3">
      <label className="text-right text-sm text-[#B7C0C8]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-[#111213] text-white rounded-xl px-3 py-2 h-10 border border-[#2A2B2C] placeholder:text-[#5E666D] focus:outline-none focus:border-[#E2F163] transition-colors ${
          isDateInput ? "text-left" : "text-right"
        }`}
        style={isDateInput ? { direction: "ltr", colorScheme: "dark" } : undefined}
      />
    </div>
  );
}

// ============================================================================
// COMPONENT: SelectField
// ============================================================================

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1 mb-3">
      <label className="text-right text-sm text-[#B7C0C8]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#111213] text-white rounded-xl px-3 py-2 text-right border border-[#2A2B2C] focus:outline-none focus:border-[#E2F163] transition-colors appearance-none"
        style={{ direction: "rtl" }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    gender: "",
    date_of_birth: "",
    weight: 0,
    target_weight: 0,
    height_cm: 0,
    goal: "",
    diet_type: "",
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/login");
          return;
        }

        // Get data from profiles table
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // Get goal from programs table as fallback
        const { data: programData } = await supabase
          .from("programs")
          .select("goal, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Use user_metadata as fallback
        const metadata = user.user_metadata || {};

        // Get goal from localStorage as fallback
        let onboardingGoal: string | null = null;
        if (typeof window !== "undefined") {
          try {
            const keys = ["fitjourney_onboarding_data", "gymbro_onboarding_data", "onboarding", "onboarding.goal"];
            for (const key of keys) {
              const raw = localStorage.getItem(key);
              if (raw) {
                try {
                  const parsed = JSON.parse(raw);
                  const goal = parsed?.goal ?? parsed?.goals?.[0] ?? null;
                  if (goal) {
                    onboardingGoal = goal;
                    break;
                  }
                } catch {
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

        const resolvedGoal =
          programData?.goal ??
          profileData?.goal ??
          metadata?.goal ??
          onboardingGoal ??
          "";

        const rawDateOfBirth =
          profileData?.date_of_birth ||
          profileData?.birthdate ||
          metadata.birthdate ||
          metadata.date_of_birth;

        setProfile({
          gender: profileData?.gender || metadata.gender || "",
          date_of_birth: formatDateForInput(rawDateOfBirth),
          weight:
            profileData?.weight ||
            profileData?.weight_kg ||
            metadata.weight_kg ||
            metadata.weight ||
            0,
          target_weight:
            profileData?.target_weight ||
            profileData?.target_weight_kg ||
            metadata.target_weight_kg ||
            metadata.target_weight ||
            0,
          height_cm:
            profileData?.height_cm || metadata.height_cm || metadata.height || 0,
          goal: resolvedGoal,
          diet_type:
            profileData?.diet_type ||
            profileData?.diet ||
            metadata.diet ||
            metadata.diet_type ||
            "",
        });
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("שגיאה בטעינת הפרופיל");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Update user metadata with all profile fields
      // The primary storage for user profile data is user_metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          gender: profile.gender,
          birthdate: profile.date_of_birth,
          weight_kg: profile.weight,
          target_weight_kg: profile.target_weight,
          height_cm: profile.height_cm,
          diet: profile.diet_type,
        }
      });

      if (metadataError) {
        console.error("Error updating user metadata:", metadataError);
        setError(`שגיאה בשמירת הפרופיל: ${metadataError.message}`);
        setSaving(false);
        return;
      }

      // Update profiles table with goal only (only field that exists in profiles table)
      if (profile.goal) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              goal: profile.goal,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "id",
            }
          );

        if (profileError) {
          console.error("Error updating profile goal:", profileError);
          // Don't fail completely if profile update fails, metadata is primary
          console.warn("Failed to update profile table, but metadata was updated");
        }
      }

      router.push("/profile");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(`שגיאה בשמירת הפרופיל: ${err?.message || 'שגיאה לא ידועה'}`);
    } finally {
      setSaving(false);
    }
  };

  const genderOptions = [
    { value: "male", label: "זכר" },
    { value: "female", label: "נקבה" },
    { value: "other", label: "אחר" },
  ];

  const goalOptions = [
    { value: "gain", label: "לעלות במסת שריר" },
    { value: "loss", label: "לרדת באחוזי שומן ולהתחטב" },
    { value: "recomp", label: "לשפר הרגלים ולשמור על הגוף" },
  ];

  const dietOptions = [
    { value: "none", label: "לא עוקב אחרי דיאטה מסוימת" },
    { value: "vegan", label: "טבעוני" },
    { value: "vegetarian", label: "צמחוני" },
    { value: "keto", label: "קטוגני" },
    { value: "paleo", label: "פלאוליתי" },
  ];

  return (
    <>
      <StickyHeader title={texts.profile.editProfile} />
      <main
        dir="rtl"
        className="min-h-screen bg-[#0D0E0F] px-4 pb-28 main-offset -mt-32"
      >
        <div className="max-w-screen-sm mx-auto">
          {/* Error Message */}
          {error && (
            <div className="text-red-500 text-sm text-center mt-4 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error}
            </div>
          )}

          {/* Edit Form Card */}
          <div className="bg-[#1A1B1C] rounded-2xl p-4 mb-4">
            {loading ? (
              // Loading skeleton
              <div className="text-center text-[#B7C0C8] py-8">טוען...</div>
            ) : (
              <>
                {/* 1. Gender */}
                <SelectField
                  label={texts.profile.gender}
                  value={profile.gender || ""}
                  onChange={(value) => setProfile({ ...profile, gender: value })}
                  options={genderOptions}
                />

                {/* 2. Age */}
                <EditableField
                  label={texts.profile.age}
                  value={calculateAge(profile.date_of_birth)}
                  onChange={(value) => {
                    // Calculate birth year from age
                    const age = parseInt(value);
                    if (!isNaN(age) && age > 0 && age < 150) {
                      const today = new Date();
                      const birthYear = today.getFullYear() - age;
                      const birthDate = `${birthYear}-01-01`;
                      setProfile({ ...profile, date_of_birth: birthDate });
                    }
                  }}
                  type="number"
                  placeholder="גיל"
                />

                {/* 3. Weight */}
                <EditableField
                  label={texts.profile.weight}
                  value={profile.weight || ""}
                  onChange={(value) =>
                    setProfile({ ...profile, weight: Number(value) })
                  }
                  type="number"
                  placeholder="קג"
                />

                {/* 4. Target Weight */}
                <EditableField
                  label={texts.profile.targetWeight}
                  value={profile.target_weight || ""}
                  onChange={(value) =>
                    setProfile({ ...profile, target_weight: Number(value) })
                  }
                  type="number"
                  placeholder="קג"
                />

                {/* 5. Height */}
                <EditableField
                  label={texts.profile.height}
                  value={profile.height_cm || ""}
                  onChange={(value) =>
                    setProfile({ ...profile, height_cm: Number(value) })
                  }
                  type="number"
                  placeholder="ס״מ"
                />

                {/* 6. Goal */}
                <SelectField
                  label="מטרה"
                  value={profile.goal || ""}
                  onChange={(value) => setProfile({ ...profile, goal: value })}
                  options={goalOptions}
                />

                {/* 7. Diet Type */}
                <SelectField
                  label="סוג דיאטה"
                  value={profile.diet_type || ""}
                  onChange={(value) =>
                    setProfile({ ...profile, diet_type: value })
                  }
                  options={dietOptions}
                />

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-[#E2F163] text-[#0D0E0F] font-bold text-lg h-12 rounded-xl mt-4 transition-all active:translate-y-1 active:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "שומר..." : "שמור שינויים"}
                </button>

                {/* Cancel Link */}
                <Link
                  href="/profile"
                  className="flex items-center justify-center gap-2 text-[#B7C0C8] text-base font-semibold mt-3"
                >
                  <span>ביטול</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
