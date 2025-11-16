"use client";

import SocialAuthButtons from "@/components/SocialAuthButtons";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { getOnboardingData, clearOnboardingData } from "@/lib/onboarding-storage";
import { getPlanSession, clearPlanSession } from "@/lib/planSession";
import { clearProgramDraft } from "@/lib/program-draft";
import { type Persona } from "@/lib/journey/builder";
import { normalizePersona } from "@/lib/persona/normalize";
import { translateAuthError, validateEmail, validatePassword, validatePasswordMatch } from "@/lib/i18n/authHe";
import { usePlatform } from "@/lib/platform";

/**
 * Ensure an avatar exists for the user
 *
 * Checks if user has an avatar row. If not, creates one with persona
 * derived from user metadata and profile.
 *
 * @param supabase Supabase client
 * @param userId User ID
 * @returns Avatar row with persona
 */
async function ensureAvatar(
  supabase: any,
  userId: string
): Promise<{ id: string; user_id: string; persona: Persona } | null> {
  console.log('[Signup] ensureAvatar start');

  try {
    // Try to fetch existing avatar
    const { data: existing, error: fetchError } = await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing && !fetchError) {
      console.log('[Signup] ensureAvatar found existing avatar:', existing.user_id);
      // Transform individual columns into persona object for backward compatibility
      return {
        id: existing.user_id, // Use user_id as id
        user_id: existing.user_id,
        persona: {
          gender: existing.gender,
          goal: existing.goal,
          diet: existing.diet,
          frequency: existing.frequency,
          experience: existing.experience,
        },
      };
    }

    // No avatar exists - create one
    console.log('[Signup] No avatar found, creating new one');

    // Get user to access metadata
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[Signup] Failed to get user for avatar creation:', userError);
      return null;
    }

    const meta = user.user_metadata || {};

    // Try to get additional data from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Build persona from metadata and profile with normalization
    const rawPersona = {
      gender: meta.gender || profile?.gender,
      goal: (Array.isArray(meta.goals) ? meta.goals[0] : meta.goal) || profile?.goal,
      diet: meta.diet || profile?.diet,
      frequency: meta.training_frequency_actual || profile?.training_frequency_actual,
      experience: meta.experience || profile?.experience,
    };

    console.log('[Signup] Raw persona from metadata/profile:', rawPersona);

    // Normalize to canonical values (handles variations like "results" -> "knowledge")
    const persona: Persona = normalizePersona(rawPersona);

    console.log('[Signup] ensureAvatar normalized persona:', {
      gender: persona.gender,
      goal: persona.goal,
      diet: persona.diet,
      frequency: persona.frequency,
      experience: persona.experience,
    });

    // Insert avatar with individual columns (not JSONB persona)
    const { data: created, error: insertError } = await supabase
      .from('avatars')
      .insert({
        user_id: userId,
        gender: persona.gender,
        goal: persona.goal,
        diet: persona.diet,
        frequency: persona.frequency,
        experience: persona.experience,
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a duplicate key error (race condition)
      if (insertError.code === '23505') {
        console.warn('[Signup] Avatar already exists (race condition), fetching it');
        const { data: retry } = await supabase
          .from('avatars')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (retry) {
          return {
            id: retry.user_id,
            user_id: retry.user_id,
            persona: {
              gender: retry.gender,
              goal: retry.goal,
              diet: retry.diet,
              frequency: retry.frequency,
              experience: retry.experience,
            },
          };
        }
        return null;
      }

      console.error('[Signup] Failed to insert avatar:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });
      return null;
    }

    console.log('[Signup] ensureAvatar created avatar row:', created.user_id);
    // Transform individual columns into persona object for backward compatibility
    return {
      id: created.user_id,
      user_id: created.user_id,
      persona: {
        gender: created.gender,
        goal: created.goal,
        diet: created.diet,
        frequency: created.frequency,
        experience: created.experience,
      },
    };
  } catch (err: any) {
    console.error('[Signup] ensureAvatar failed:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack?.split('\n').slice(0, 3).join('\n'),
    });
    return null;
  }
}

export default function SignupClient() {
  const { storage } = usePlatform();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptMarketing, setAcceptMarketing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);

  // Force re-render when returning from external browser (iOS Simulator fix)
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handleBrowserClosed = () => {
      console.log("[SignupClient] Browser closed, forcing re-render");
      forceUpdate(prev => prev + 1);
    };

    window.addEventListener('external-browser-closed', handleBrowserClosed);
    window.addEventListener('focus', handleBrowserClosed);

    return () => {
      window.removeEventListener('external-browser-closed', handleBrowserClosed);
      window.removeEventListener('focus', handleBrowserClosed);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    const matchError = validatePasswordMatch(password, confirm);
    if (matchError) {
      setError(matchError);
      return;
    }

    setLoading(true);

    // Get onboarding data from localStorage
    const onboardingData = getOnboardingData();

    try {
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
        setError(translateAuthError(err, 'sign_up'));
        setLoading(false);
      } else if (data?.user) {
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          setError("האימייל כבר רשום במערכת.");
          setLoading(false);
        } else if (data.session) {
        // Session is available immediately (no email confirmation required)
        const userId = data.user.id;

        // Migrate goal from localStorage to profile
        const goalFromOnboarding = onboardingData?.goals?.[0] ?? null;
        if (goalFromOnboarding) {
          try {
            await supabase.from('profiles').upsert({
              id: userId,
              goal: goalFromOnboarding,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
            console.log('✅ Saved goal to profile:', goalFromOnboarding);
          } catch (e) {
            console.error('Error saving goal to profile:', e);
          }
        }

        setMigrating(true);

        // Step 1: Resolve and persist avatar (non-blocking)
        try {
          const avatarRes = await fetch("/api/avatar/bootstrap", {
            method: "POST",
          });
          const avatarData = await avatarRes.json();

          if (avatarData.ok) {
            console.log(`[Signup] Avatar resolved: ${avatarData.avatarId} (confidence: ${avatarData.confidence})`);
          } else {
            console.warn("[Signup] Avatar bootstrap failed → continuing with draft attach");
          }
        } catch (err) {
          console.warn("[Signup] Avatar bootstrap error → continuing with draft attach");
        }

        // Step 2: Attach pre-generated plans from session
        const planSession = await getPlanSession(storage);
        console.log("[Signup] PlanSession found:", planSession ? "YES" : "NO");

        if (planSession) {
          console.log("[Signup] PlanSession details:", {
            status: planSession.status,
            nutrition: planSession.nutrition?.status,
            workout: planSession.workout?.status,
            journey: planSession.journey?.status,
          });

          try {
            console.log("[Signup] Calling session attach route...");

            const attachRes = await fetch("/api/session/attach", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session: planSession }),
            });

            console.log("[Signup] Session attach responded with status:", attachRes.status);

            if (!attachRes.ok) {
              console.error("[Signup] Session attach returned error status:", attachRes.status);
              const errorText = await attachRes.text();
              console.error("[Signup] Error response:", errorText);
              // Continue signup flow even if attach fails
            } else {
              const attachData = await attachRes.json();
              console.log("[Signup] Session attach response data:", attachData);

              if (attachData?.ok && attachData?.attached) {
                console.log("[Signup] Plans attached successfully", {
                  nutrition: attachData.attached?.nutrition ?? false,
                  workout: attachData.attached?.workout ?? false,
                  journey: attachData.attached?.journey ?? false,
                });
              } else {
                console.warn("[Signup] Attach response missing expected data:", attachData);
              }
            }

            // Clear session after attach (success or failure)
            await clearPlanSession(storage);
            console.log("[Signup] PlanSession cleared");

          } catch (err: any) {
            console.error("[Signup] Error attaching session:", {
              name: err.name,
              message: err.message,
              stack: err.stack
            });

            // Clear session even on error to prevent retry loops
            await clearPlanSession(storage);
          }
        } else {
          console.warn("[Signup] No PlanSession found - plans may not have been generated");
        }

        // Step 2.5: Ensure avatar exists before journey bootstrap
        try {
          const avatar = await ensureAvatar(supabase, userId);
          if (avatar) {
            console.log("[Signup] Avatar ensured:", {
              id: avatar.id,
              persona: avatar.persona,
            });
          } else {
            console.warn("[Signup] ensureAvatar failed but continuing to /journey");
          }

          // Post-insert settle delay for DB replication
          console.log("[Signup] Waiting 150ms for DB replication...");
          await new Promise(r => setTimeout(r, 150));

        } catch (err) {
          console.error("[Signup] ensureAvatar error but continuing:", err);
        }

        // Step 3: Bootstrap journey plan (persists avatar-based chapters/nodes to DB)
        try {
          const bootstrapRes = await fetch("/api/journey/plan/bootstrap", {
            method: "POST",
            credentials: "include",
          });
          const bootstrapData = await bootstrapRes.json();

          if (bootstrapData.ok) {
            console.log(
              bootstrapData.alreadyBootstrapped
                ? "[Signup] Journey already bootstrapped"
                : `[Signup] Journey bootstrapped: ${bootstrapData.data?.chapters?.length} chapters, ${bootstrapData.data?.taskCount} tasks`
            );
          } else {
            console.warn("[Signup] Journey bootstrap failed:", bootstrapData.error, "- User will see seed journey");
          }
        } catch (err) {
          console.error("[Signup] Journey bootstrap error:", err, "- User will see seed journey");
        }

        // Step 4: Bootstrap journey stages (new linear stage system)
        // Check if stages were pre-generated during plan creation
        const hasPreGeneratedStages = planSession?.stages?.status === 'ready' && planSession?.stages?.stages;

        if (hasPreGeneratedStages && planSession?.stages?.stages) {
          console.log("[Signup] Using pre-generated stages from session:", planSession.stages.stages.length);
          try {
            const attachRes = await fetch("/api/journey/stages/attach", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ stages: planSession.stages.stages }),
              credentials: "include",
            });
            const attachData = await attachRes.json();

            if (attachData.ok) {
              console.log(`[Signup] Pre-generated stages attached: ${attachData.created} stages`);
            } else {
              console.warn("[Signup] Failed to attach pre-generated stages:", attachData.error);
              // Fall back to bootstrap
              console.log("[Signup] Falling back to stages bootstrap...");
              await fetch("/api/journey/stages/bootstrap", { method: "POST", credentials: "include" });
            }
          } catch (err) {
            console.error("[Signup] Error attaching pre-generated stages:", err);
            // Fall back to bootstrap
            await fetch("/api/journey/stages/bootstrap", { method: "POST", credentials: "include" });
          }
        } else {
          // No pre-generated stages - use bootstrap
          console.log("[Signup] No pre-generated stages, calling bootstrap...");
          try {
            const stagesRes = await fetch("/api/journey/stages/bootstrap", {
              method: "POST",
              credentials: "include",
            });
            const stagesData = await stagesRes.json();

            if (stagesData.ok) {
              console.log(
                stagesData.existing
                  ? "[Signup] Stages already exist"
                  : `[Signup] Stages created: ${stagesData.created} stages`
              );
            } else {
              console.warn("[Signup] Stages bootstrap failed:", stagesData.error, "- User can create manually");
            }
          } catch (err) {
            console.error("[Signup] Stages bootstrap error:", err, "- User can create manually");
          }
        }

        setMigrating(false);

        // Clear onboarding data and program draft from localStorage
        clearOnboardingData();
        await clearProgramDraft(storage);
        console.log("[Signup] Cleared onboarding data and program draft");

        // Navigate to journey map page
        console.log("[Signup] Redirecting to /journey");
        window.location.href = "/journey";
      } else {
        // Email confirmation required
        setError("נשלח לך מייל אימות. אנא בדוק את תיבת הדואר שלך.");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    } catch (err) {
      setError(translateAuthError(err, 'sign_up'));
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#0D0E0F] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md py-10">
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
            disabled={loading || migrating}
            className="mt-6 h-14 w-full rounded-full bg-[#E2F163] text-black font-bold text-lg transition-transform active:scale-98 active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migrating ? "שומר את התוכנית שלך..." : loading ? "רושם..." : "הרשמה"}
          </button>
        </form>

      </div>
    </main>
  );
}
