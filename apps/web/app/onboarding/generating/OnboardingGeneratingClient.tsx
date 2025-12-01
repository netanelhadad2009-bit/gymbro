"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlatform } from "@/lib/platform";
import { getOnboardingData } from "@/lib/onboarding-storage";
import { buildNutritionRequest } from "@/lib/builders/nutritionRequest";
import { profileFingerprint } from "@/lib/storage";
import { NUTRITION_DAYS, WORKOUTS_ENABLED } from "@/lib/config";
import { hardNavigate } from "@/lib/nav";
import {
  createPlanSession,
  getPlanSession,
  updateNutritionPlan,
  updateWorkoutPlan,
  updateStagesPlan,
  updateSessionProgress,
  markSessionDone,
  isSessionComplete,
} from "@/lib/planSession";
import { saveProgramDraft, cleanupStorage, type ProgramDraft, PROGRAM_DRAFT_VERSION } from "@/lib/program-draft";
import { mapErrorToHe, type HebrewError } from "@/lib/errors/generating-errors";
import { chaosMode } from "@/lib/chaos";
import { track } from "@/lib/mixpanel";

/**
 * Nutrition API timeout (90s for slow models/network in iOS WKWebView)
 */
const NUTRITION_TIMEOUT_MS = 90_000;

/**
 * Workout API timeout (60s for faster workout generation)
 */
const WORKOUT_TIMEOUT_MS = 60_000;

/**
 * Progress thresholds for different generation stages
 */
const PROGRESS = {
  START: 0,
  NUTRITION_START: 10,
  NUTRITION_FETCHING: 30,
  NUTRITION_DONE: 50,
  WORKOUT_START: 50,
  WORKOUT_FETCHING: 70,
  WORKOUT_DONE: 85, // Slow tail gate - triggers 85-99% trickle phase
  COMPLETE: 100,
};

/**
 * Helper: sleep for ms
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper: safe JSON parse from response
 */
async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Generate nutrition plan via API
 */
async function generateNutritionPlan(signal: AbortSignal): Promise<{
  plan: any;
  calories: number | null;
  fingerprint: string;
}> {
  console.log('[Gen][Nutrition] Preparing draft (generation deferred to post-signup)...');

  // Build request with safe fallbacks for fingerprint calculation
  let req;
  try {
    const profile = getOnboardingData();
    if (!profile || !profile.height_cm) {
      throw new Error('Missing profile data');
    }
    req = buildNutritionRequest(null, profile, { days: NUTRITION_DAYS });
  } catch (e) {
    console.warn('[Gen][Nutrition] buildNutritionRequest failed – using minimal payload', e);
    req = {
      gender_he: 'זכר',
      age: 25,
      height_cm: 170,
      weight_kg: 70,
      target_weight_kg: 70,
      activity_level_he: 'בינונית',
      goal_he: 'recomp',
      diet_type_he: 'none',
      days: 1,
    };
  }

  // Calculate fingerprint
  let fingerprint;
  try {
    fingerprint = profileFingerprint(req);
  } catch (e) {
    console.warn('[Gen][Nutrition] fingerprint failed – fallback id', e);
    fingerprint = `fallback-${Date.now()}`;
  }

  console.log('[Gen][Nutrition] Calling API (fingerprint: ' + fingerprint.substring(0, 12) + ')');

  // Call nutrition generation API (unauthenticated onboarding endpoint)
  const res = await fetch('/api/ai/nutrition/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[Gen][Nutrition] API error:', res.status, errorText);
    throw new Error(`Nutrition API failed: ${res.status} ${errorText}`);
  }

  const data = await safeJson(res);
  if (!data || !data.ok) {
    throw new Error(data?.message || 'Nutrition generation failed');
  }

  const plan = data.plan;
  const calories = data.calories || null;

  console.log('[Gen][Nutrition] Successfully generated plan');

  return {
    plan,
    calories,
    fingerprint
  };
}

/**
 * Run nutrition generation with soft-timeout handling and automatic retry
 */
async function runNutritionGeneration(
  storage: import('@/lib/platform').PlatformStorage,
  { retry = false }: { retry?: boolean } = {}
): Promise<{
  ok: boolean;
  reason?: 'soft-timeout' | 'hard-failure';
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('[Gen][Timeout] Nutrition timeout triggered after 90s');
    controller.abort('timeout');
  }, NUTRITION_TIMEOUT_MS);

  const startedAt = Date.now();
  console.log('[Gen][Nutrition] Starting nutrition generation', { retry });

  try {
    // Mark generating before any await
    await updateNutritionPlan(storage, {
      status: 'generating',
      fingerprint: '',
      calories: null,
      startedAt: Date.now(),
    });

    const { plan, calories, fingerprint } = await generateNutritionPlan(controller.signal);

    clearTimeout(timeoutId);

    const elapsed = Date.now() - startedAt;
    console.log('[Gen][Nutrition] Generation completed successfully', {
      elapsed_ms: elapsed,
      fingerprint,
      retry,
    });

    // Mark as ready with the generated plan
    await updateNutritionPlan(storage, {
      status: 'ready',
      plan,
      calories,
      fingerprint,
      completedAt: Date.now(),
    });

    await updateSessionProgress(storage, PROGRESS.NUTRITION_DONE, 'תוכנית תזונה הושלמה!');

    return { ok: true };
  } catch (err: any) {
    clearTimeout(timeoutId);

    const elapsed = Date.now() - startedAt;

    // Soft-timeout path: keep session running, don't mark as failed
    const isSoftTimeout =
      err?.name === 'AbortError' ||
      err?.message === 'timeout' ||
      (typeof err?.message === 'string' && err.message.includes('timeout'));

    if (isSoftTimeout) {
      console.warn('[Gen][Timeout] Nutrition soft-timeout; keeping session running', {
        elapsed_ms: elapsed,
        retry_attempted: retry,
      });

      // Keep status = generating (NOT failed)
      await updateNutritionPlan(storage, {
        status: 'generating',
        // Keep fingerprint/calories from before, don't overwrite
      });

      // One automatic soft-retry if we haven't retried yet
      if (!retry) {
        console.log('[Gen][Retry] Soft-retry nutrition after 1.5s delay...');
        await sleep(1500);
        return runNutritionGeneration(storage, { retry: true });
      }

      // Already retried once → surface as recoverable state (still generating)
      console.warn('[Gen][Retry] Soft-retry already attempted, staying in generating state');
      return { ok: false, reason: 'soft-timeout' };
    }

    // Real failure path: HTTP error, network error, etc.
    console.error('[Gen][Error] Nutrition generation hard-failure', {
      elapsed_ms: elapsed,
      name: err?.name,
      message: err?.message,
      stack: err?.stack?.split('\n').slice(0, 5).join('\n'),
      retry_attempted: retry,
    });

    await updateNutritionPlan(storage, {
      status: 'failed',
      error: err.message || 'Unknown error',
      fingerprint: `failed-${Date.now()}`,
      completedAt: Date.now(),
    });

    return { ok: false, reason: 'hard-failure' };
  }
}

/**
 * Generate workout plan via API
 */
async function generateWorkoutPlan(signal: AbortSignal): Promise<{ plan: any }> {
  console.log('[Gen][Workout] Starting generation...');

  const profile = getOnboardingData();

  const req = {
    gender: profile?.gender || 'male',
    age: profile?.birthdate ? new Date().getFullYear() - new Date(profile.birthdate).getFullYear() : 25,
    heightCm: profile?.height_cm || 170,
    weight: profile?.weight_kg || 70,
    goal: profile?.goals?.[0] || 'muscle_gain',
    experienceLevel: profile?.experience || 'intermediate',
    workoutsPerWeek: 3,
    equipment: [],
    notes: '',
  };

  const response = await fetch('/api/ai/workout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Workout API failed: ${response.status} ${text}`);
  }

  const workoutJson = await response.json();
  const plan = workoutJson?.plan || workoutJson;

  console.log('[Gen][Workout] Generation completed', {
    hasPlan: !!plan,
  });

  return { plan };
}

/**
 * Main Generating Page Component
 */
export default function OnboardingGeneratingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { storage, network } = usePlatform();
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');
  const [message, setMessage] = useState('מתחיל יצירת תוכניות...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSoftTimeout, setIsSoftTimeout] = useState(false);
  const [hebrewError, setHebrewError] = useState<HebrewError | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const wasOfflineRef = useRef(false);
  const [navStuck, setNavStuck] = useState(false);
  const [stuckWarning, setStuckWarning] = useState<'30s' | '90s' | null>(null);

  // StrictMode guard: run effect once only
  const ranOnce = useRef(false);
  const isGeneratingRef = useRef(false);
  const navigatedRef = useRef(false);
  const navWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const stuckWarning30sRef = useRef<NodeJS.Timeout | null>(null);
  const stuckWarning90sRef = useRef<NodeJS.Timeout | null>(null);
  const generationStartTimeRef = useRef<number | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const [instanceConflict, setInstanceConflict] = useState(false);

  // Track server progress based on generation milestones
  const [serverProgress, setServerProgress] = useState(0);
  const [visualProgress, setVisualProgress] = useState(0);
  const [generationComplete, setGenerationComplete] = useState(false);

  // Chaos hook: Corrupt localStorage on demand (dev/test only)
  useEffect(() => {
    if (searchParams.get('corruptLocalStorage') === '1') {
      console.log('[Chaos] Corrupting localStorage for testing...');
      chaosMode.corruptLocalStorage('onboarding_data');
    }
  }, [searchParams]);

  // Single interval for smooth progress animation (200ms ticks)
  useEffect(() => {
    const tick = () => {
      setVisualProgress(prev => {
        // GUARD: Never go backwards - progress only increases
        const calculateNext = () => {
          // Phase A: 0–85% → steady constant rate (~24-25s to reach 85%)
          if (prev < 85 && !generationComplete) {
            const next = Math.min(prev + 0.7, 85); // 0.7% per 200ms = ~24s to 85%
            if (Math.abs(next - prev) > 0.01) {
              console.log('[Generating] steady progress → visualProgress:', next.toFixed(1) + '%');
            }
            return next;
          }

          // Phase B: 85–99% → slow trickle while waiting for backend (~15-20s to 99%)
          if (prev >= 85 && prev < 99 && !generationComplete) {
            const next = Math.min(prev + 0.18, 99); // 0.18% per 200ms = ~15-20s to 99%
            if (Math.abs(next - prev) > 0.01) {
              console.log('[Generating] slow tail → visualProgress:', next.toFixed(1) + '%');
            }
            return next;
          }

          // Phase C: ease-out to 100% once generationComplete = true
          if (generationComplete && prev < 100) {
            const increment = Math.max(0.6, (100 - prev) * 0.25);
            const next = Math.min(100, prev + increment);
            if (Math.abs(next - prev) > 0.01) {
              console.log('[Generating] completion → easing to 100%, visualProgress:', next.toFixed(1) + '%');
            }
            return next;
          }

          return prev;
        };

        const next = calculateNext();

        // SAFETY: Ensure progress never goes backwards
        if (next < prev) {
          console.warn('[Generating] Progress regression prevented:', prev, '→', next);
          return prev;
        }

        return next;
      });
    };

    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [generationComplete]);

  // Track completion state
  const isComplete = visualProgress >= 100 && generationComplete;

  // Beforeunload and back-navigation guards: warn user if they try to leave during generation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if actively generating and not yet complete
      if (isGeneratingRef.current || (visualProgress > 0 && visualProgress < 100)) {
        console.warn('[Gen][Guard] beforeunload triggered during generation');
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Some browsers show this message
      }
    };

    // Prevent back navigation during generation
    const handlePopState = (e: PopStateEvent) => {
      if (isGeneratingRef.current || (visualProgress > 0 && visualProgress < 100)) {
        console.warn('[Gen][Guard] Back button pressed during generation');

        // Confirm with user
        const confirmed = confirm('התוכנית שלך עדיין נוצרת. בטוח שברצונך לצאת? התקדמות עשויה לאבד.');

        if (!confirmed) {
          // User wants to stay - push state back
          window.history.pushState(null, '', window.location.href);
          e.preventDefault();
        } else {
          // User confirmed exit - allow navigation
          console.log('[Gen][Guard] User confirmed back navigation');
          isGeneratingRef.current = false; // Stop blocking
        }
      }
    };

    // Push initial state to enable back button detection
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [visualProgress]);

  // Stuck-at-99% watchdog: show warnings if stuck at high progress for too long
  useEffect(() => {
    // Only activate when we're in the slow tail phase (85-99%) and not yet complete
    if (visualProgress >= 85 && visualProgress < 100 && !generationComplete) {
      // Record start time if not already set
      if (!generationStartTimeRef.current) {
        generationStartTimeRef.current = Date.now();
        console.log('[Gen][Stuck] Started tracking stuck-at-99% timer');

        // Set 30s warning
        stuckWarning30sRef.current = setTimeout(() => {
          console.warn('[Gen][Stuck] 30s warning - still generating');
          setStuckWarning('30s');
        }, 30000);

        // Set 90s warning
        stuckWarning90sRef.current = setTimeout(() => {
          console.warn('[Gen][Stuck] 90s warning - still generating');
          setStuckWarning('90s');
        }, 90000);
      }
    }

    // Clear warnings when generation completes
    if (generationComplete) {
      if (stuckWarning30sRef.current) {
        clearTimeout(stuckWarning30sRef.current);
        stuckWarning30sRef.current = null;
      }
      if (stuckWarning90sRef.current) {
        clearTimeout(stuckWarning90sRef.current);
        stuckWarning90sRef.current = null;
      }
      generationStartTimeRef.current = null;
      setStuckWarning(null);
      console.log('[Gen][Stuck] Cleared stuck warnings - generation complete');
    }

    // Cleanup on unmount
    return () => {
      if (stuckWarning30sRef.current) clearTimeout(stuckWarning30sRef.current);
      if (stuckWarning90sRef.current) clearTimeout(stuckWarning90sRef.current);
    };
  }, [visualProgress, generationComplete]);

  // Sync UI with session on every mount (including StrictMode remounts)
  // Also poll the session to keep UI updated during generation
  useEffect(() => {
    const syncUI = async () => {
      const session = await getPlanSession(storage);

      if (!session) {
        return; // No session yet
      }

      // Map session status to backend status
      let newStatus: 'idle' | 'running' | 'done' | 'failed' = 'idle';
      if (session.status === 'done') {
        newStatus = 'done';
      } else if (session.status === 'failed') {
        newStatus = 'failed';
      } else if (session.status === 'running') {
        newStatus = 'running';
      }

      // GUARD: Prevent state regression - once done/failed, stay done/failed
      if (sessionStatus === 'done' || sessionStatus === 'failed') {
        if (newStatus !== sessionStatus) {
          console.warn('[Generating] Preventing state regression from', sessionStatus, 'to', newStatus);
          return; // Don't update state backwards
        }
      }

      // Update session status only if changed
      if (newStatus !== sessionStatus) {
        console.log('[Generating] Syncing session status', { from: sessionStatus, to: newStatus });
        setSessionStatus(newStatus);
      }

      // Set appropriate message based on session state (only if not in terminal state)
      if (sessionStatus !== 'done' && sessionStatus !== 'failed') {
        if (session.status === 'done') {
          setMessage('התוכניות מוכנות!');
        } else if (session.nutrition?.status === 'generating') {
          setMessage('מייצר תפריט אישי...');
        } else if (session.nutrition?.status === 'ready') {
          setMessage('תוכנית תזונה מוכנה!');
        } else if (session.nutrition?.status === 'failed') {
          setErrorMsg(`שגיאה ביצירת תוכנית התזונה: ${session.nutrition.error || 'שגיאה לא ידועה'}`);
          setIsSoftTimeout(false);
        }
      }
    };

    // Sync immediately on mount
    syncUI();

    // Poll every 500ms to keep UI in sync with session
    const interval = setInterval(syncUI, 500);

    return () => {
      clearInterval(interval);
    };
  }, [sessionStatus, storage]);

  // Network status monitoring: detect offline and auto-resume when reconnected
  useEffect(() => {
    console.log('[Gen][Network] Setting up network status listener');

    // Check initial status
    (async () => {
      try {
        const status = await network.getStatus();
        console.log('[Gen][Network] Initial status', status);
        setIsOffline(!status.connected);
        wasOfflineRef.current = !status.connected;

        if (!status.connected) {
          console.warn('[Gen][Network] offline - blocking generation');
          const offlineError = mapErrorToHe(new Error('network_offline'), { operation: 'network' });
          setHebrewError(offlineError);
        }
      } catch (err) {
        console.error('[Gen][Network] Failed to get initial status', err);
      }
    })();

    // Subscribe to network changes
    const cleanup = network.onStatusChange((status) => {
      console.log('[Gen][Network]', status.connected ? 'online' : 'offline', status);

      const wasOffline = wasOfflineRef.current;
      const nowOffline = !status.connected;

      setIsOffline(nowOffline);
      wasOfflineRef.current = nowOffline;

      if (nowOffline) {
        // Just went offline
        console.warn('[Gen][Network] Connection lost');
        const offlineError = mapErrorToHe(new Error('network_offline'), { operation: 'network' });
        setHebrewError(offlineError);
        setErrorMsg('אין חיבור לאינטרנט');
      } else if (wasOffline && !nowOffline) {
        // Just came back online
        console.log('[Gen][Network] Connection restored - clearing offline error');
        setHebrewError(null);
        setErrorMsg(null);
        setMessage('חזרנו לרשת - ממשיך...');
      }
    });

    return cleanup;
  }, [network]);

  // Cross-instance protection: prevent multiple tabs from generating simultaneously
  useEffect(() => {
    // Check if BroadcastChannel is supported (Web only)
    if (typeof BroadcastChannel === 'undefined') {
      console.log('[Gen][Instance] BroadcastChannel not available - using storage-based lock');

      // Native/unsupported: use storage-based lock
      const checkLock = async () => {
        const lockKey = 'fitjourney:generation-lock';
        const lockValue = await storage.getItem(lockKey);

        if (lockValue) {
          const lock = JSON.parse(lockValue);
          const lockAge = Date.now() - lock.timestamp;

          // Lock is valid if less than 5 minutes old
          if (lockAge < 5 * 60 * 1000 && lock.instanceId !== ranOnce.current.toString()) {
            console.warn('[Gen][Instance] Another instance is generating');
            setInstanceConflict(true);
            return true;
          }
        }

        // Acquire or refresh lock
        await storage.setItem(lockKey, JSON.stringify({
          instanceId: ranOnce.current.toString(),
          timestamp: Date.now(),
        }));
        return false;
      };

      // Check lock initially
      checkLock();

      // Refresh lock every 30s
      const lockInterval = setInterval(checkLock, 30000);

      return () => {
        clearInterval(lockInterval);
        // Release lock on unmount
        storage.removeItem('fitjourney:generation-lock').catch(() => {});
      };
    }

    // Web: use BroadcastChannel for cross-tab communication
    console.log('[Gen][Instance] Setting up BroadcastChannel');

    const channel = new BroadcastChannel('fitjourney-generating');
    broadcastChannelRef.current = channel;

    // Listen for messages from other instances
    channel.onmessage = (event) => {
      if (event.data.type === 'generation-started') {
        console.warn('[Gen][Instance] Another tab started generation');
        setInstanceConflict(true);
      }

      if (event.data.type === 'generation-stopped') {
        console.log('[Gen][Instance] Another tab stopped generation');
        setInstanceConflict(false);
      }
    };

    // Announce this instance is generating
    if (isGeneratingRef.current) {
      channel.postMessage({ type: 'generation-started', timestamp: Date.now() });
    }

    return () => {
      // Announce this instance stopped generating
      if (channel) {
        channel.postMessage({ type: 'generation-stopped', timestamp: Date.now() });
        channel.close();
      }
    };
  }, [storage]);

  // Broadcast generation status changes
  useEffect(() => {
    if (broadcastChannelRef.current && isGeneratingRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'generation-started', timestamp: Date.now() });
    }

    if (broadcastChannelRef.current && generationComplete) {
      broadcastChannelRef.current.postMessage({ type: 'generation-stopped', timestamp: Date.now() });
    }
  }, [generationComplete]);

  // StrictMode-safe navigation: navigate only when isComplete AND backend done
  useEffect(() => {
    if (isComplete && sessionStatus === 'done' && !navigatedRef.current) {
      navigatedRef.current = true;
      console.log('[Gen][Nav] Reached 100%, navigating to preview');

      // Start navigation watchdog (2s timeout)
      navWatchdogRef.current = setTimeout(() => {
        console.warn('[Gen][Nav] Navigation watchdog triggered - showing manual continue');
        setNavStuck(true);
      }, 2000);

      // Save program draft before navigation to prevent redirect loop
      (async () => {
        try {
          const session = await getPlanSession(storage);
          if (session) {
            const draft: ProgramDraft = {
              version: PROGRAM_DRAFT_VERSION,
              days: NUTRITION_DAYS,
              nutritionJson: session.nutrition?.plan,
              workoutText: session.workout?.plan,
              createdAt: Date.now(),
            };

            const saved = await saveProgramDraft(storage, draft);
            if (saved) {
              console.log('[Gen][Storage] Program draft saved before navigation');
            } else {
              console.warn('[Gen][Storage] Failed to save draft before navigation');
            }
          }
        } catch (err: any) {
          console.error('[Gen][Storage] Draft save error before navigation:', err);

          // Check if quota error
          const isQuotaError =
            (err instanceof DOMException && err.name === 'QuotaExceededError') ||
            err?.name === 'QuotaExceededError';

          if (isQuotaError) {
            console.error('[Gen][Storage] Quota exceeded - navigation blocked');
            // Clear watchdog and block navigation
            if (navWatchdogRef.current) {
              clearTimeout(navWatchdogRef.current);
            }
            const quotaError = mapErrorToHe(err, { operation: 'storage' });
            setHebrewError(quotaError);
            setErrorMsg(quotaError.title);
            return; // Don't navigate
          }
        }

        console.log('[Gen][Nav] Initiating hardNavigate to /onboarding/preview');
        hardNavigate(router, '/onboarding/preview');

        // Clear watchdog if navigation succeeds quickly
        setTimeout(() => {
          if (navWatchdogRef.current) {
            clearTimeout(navWatchdogRef.current);
            navWatchdogRef.current = null;
          }
        }, 100);
      })();
    }

    // Cleanup watchdog on unmount
    return () => {
      if (navWatchdogRef.current) {
        clearTimeout(navWatchdogRef.current);
      }
    };
  }, [isComplete, sessionStatus, router, storage]);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    console.log('[Gen][Init] Starting generation flow (guarded, ranOnce=true)');

    let mounted = true;
    const controller = new AbortController();

    // Main generation flow
    (async () => {
      try {
        // Check for existing session
        let session = await getPlanSession(storage);

        // If session already exists with "done" status, navigate directly to preview
        if (session && session.status === 'done') {
          console.log('[Gen][Init] Session already completed, navigating directly to preview');
          console.log('[Gen][Init] NOT creating new session - existing session is done');

          // Mark state as complete and navigate
          setSessionStatus('done');
          setGenerationComplete(true);
          setServerProgress(PROGRESS.COMPLETE);
          setVisualProgress(100);
          setMessage('התוכניות מוכנות!');

          // Navigate immediately (guarded by navigatedRef in the navigation effect)
          return;
        }

        // Mark as generating immediately to prevent premature abort in StrictMode
        isGeneratingRef.current = true;

        // Create new session ONLY if:
        // 1. No session exists, OR
        // 2. Previous session failed
        if (!session || session.status === 'failed') {
          console.log('[Gen][Init] Creating NEW PlanSession', {
            reason: !session ? 'no_session' : 'previous_failed',
            previousStatus: session?.status
          });
          session = await createPlanSession(storage);
        } else {
          console.log('[Gen][Init] Resuming existing session', {
            status: session.status,
            progress: session.progress
          });
        }

        await updateSessionProgress(storage, PROGRESS.START, 'מתחיל...');
        setServerProgress(PROGRESS.START);
        if (mounted) {
          setMessage('מתחיל...');
        }

        // === NUTRITION GENERATION ===
        if (!session.nutrition || (session.nutrition.status !== 'ready' && session.nutrition.status !== 'pending')) {
          console.log('[Gen][Flow] Generating nutrition plan...');

          // Pre-flight check: ensure we're online
          const networkStatus = await network.getStatus();
          if (!networkStatus.connected) {
            console.warn('[Gen][Network] offline - blocking nutrition generation');
            setIsOffline(true);
            const offlineError = mapErrorToHe(new Error('network_offline'), { operation: 'network' });
            setHebrewError(offlineError);
            setErrorMsg('אין חיבור לאינטרנט');
            isGeneratingRef.current = false;
            return;
          }

          await updateSessionProgress(storage, PROGRESS.NUTRITION_START, 'מכין תוכנית תזונה...');
          setServerProgress(PROGRESS.NUTRITION_START);
          if (mounted) {
            setMessage('מכין תוכנית תזונה...');
          }

          // Show progress during draft preparation (instant, no actual API call)
          await updateSessionProgress(storage, PROGRESS.NUTRITION_FETCHING, 'מייצר תוכנית תזונה...');
          setServerProgress(PROGRESS.NUTRITION_FETCHING);
          if (mounted) {
            setMessage('מייצר תוכנית תזונה...');
          }

          const result = await runNutritionGeneration(storage);

          if (!result.ok) {
            // Nutrition generation failed
            console.warn('[Gen][Flow] Nutrition generation failed', result);

            if (result.reason === 'soft-timeout') {
              console.log('[Gen][Timeout] Soft-timeout - but continuing to completion');
              if (mounted) {
                setMessage('ממשיך ליצירת התוכנית...');
              }
            } else {
              console.warn('[Gen][Error] Nutrition preparation failed - continuing to completion');
              if (mounted) {
                setMessage('ממשיך ליצירת התוכנית...');
              }
            }

            // Mark nutrition as pending (not failed) so it can be retried server-side
            await updateNutritionPlan(storage, {
              status: 'pending',
              plan: null,
              calories: null,
              fingerprint: `pending-${Date.now()}`,
              completedAt: Date.now(),
            });

            // Continue to next step instead of blocking
            setServerProgress(PROGRESS.NUTRITION_DONE);
          } else {
            // Success!
            setServerProgress(PROGRESS.NUTRITION_DONE);
            if (mounted) {
              setMessage('תוכנית תזונה הושלמה!');
            }
          }

          console.log('[Gen][Flow] Nutrition plan successfully generated');
        } else {
          console.log('[Gen][Flow] Nutrition plan already ready or pending');
          await updateSessionProgress(storage, PROGRESS.NUTRITION_DONE, 'תוכנית תזונה מוכנה');
          setServerProgress(PROGRESS.NUTRITION_DONE);
          if (mounted) {
            setMessage('תוכנית תזונה מוכנה');
          }
        }

        // === WORKOUT GENERATION (OPTIONAL) ===
        if (WORKOUTS_ENABLED) {
          if (!session.workout || session.workout.status !== 'ready') {
            console.log('[Gen][Flow] Generating workout plan...');

            // Pre-flight check: ensure we're online
            const workoutNetworkStatus = await network.getStatus();
            if (!workoutNetworkStatus.connected) {
              console.warn('[Gen][Network] offline - skipping workout generation');
              // Don't block - workout is optional, just skip it
              setServerProgress(PROGRESS.WORKOUT_DONE);
              console.log('[Gen][Network] Skipping workout due to offline state');
            } else {
              await updateWorkoutPlan(storage, {
                status: 'generating',
                startedAt: Date.now(),
              });

              await updateSessionProgress(storage, PROGRESS.WORKOUT_START, 'יוצר תוכנית אימונים...');
              setServerProgress(PROGRESS.WORKOUT_START);
              if (mounted) {
                setMessage('יוצר תוכנית אימונים...');
              }

            try {
              await updateSessionProgress(storage, PROGRESS.WORKOUT_FETCHING, 'מייצר תוכנית אימונים...');
              setServerProgress(PROGRESS.WORKOUT_FETCHING);
              if (mounted) {
                setMessage('מייצר תוכנית אימונים...');
              }

              // Create dedicated AbortController with 60s timeout for workout
              const workoutController = new AbortController();
              const workoutTimeoutId = setTimeout(() => {
                console.warn('[Gen][Timeout] workout - Workout timeout triggered after 60s');
                workoutController.abort('timeout');
              }, WORKOUT_TIMEOUT_MS);

              const startTime = Date.now();
              try {
                const { plan } = await generateWorkoutPlan(workoutController.signal);
                clearTimeout(workoutTimeoutId);

                const elapsed = Date.now() - startTime;
                console.log('[Gen][Workout] completed', { elapsed_ms: elapsed });

                await updateWorkoutPlan(storage, {
                  status: 'ready',
                  plan,
                  completedAt: Date.now(),
                });

                await updateSessionProgress(storage, PROGRESS.WORKOUT_DONE, 'תוכנית אימונים מוכנה!');
                setServerProgress(PROGRESS.WORKOUT_DONE);
                if (mounted) {
                  setMessage('תוכנית אימונים מוכנה!');
                }

                console.log('[Gen][Flow] Workout plan ready');
              } catch (workoutErr: any) {
                clearTimeout(workoutTimeoutId);

                const elapsed = Date.now() - startTime;
                const isTimeout =
                  workoutErr?.name === 'AbortError' ||
                  workoutErr?.message === 'timeout' ||
                  (typeof workoutErr?.message === 'string' && workoutErr.message.includes('timeout'));

                if (isTimeout) {
                  console.warn('[Gen][Timeout] workout - soft timeout', { elapsed_ms: elapsed });
                  // Mark as failed with timeout message
                  await updateWorkoutPlan(storage, {
                    status: 'failed',
                    error: 'Timeout after 60s',
                    completedAt: Date.now(),
                  });
                } else {
                  console.error('[Gen][Workout] hard failure', {
                    elapsed_ms: elapsed,
                    name: workoutErr?.name,
                    message: workoutErr?.message,
                  });
                  await updateWorkoutPlan(storage, {
                    status: 'failed',
                    error: workoutErr.message || 'Unknown error',
                    completedAt: Date.now(),
                  });
                }

                // Continue anyway (workout is optional)
                setServerProgress(PROGRESS.WORKOUT_DONE);
                console.warn('[Gen][Flow] Continuing despite workout failure');
              }
            } catch (err: any) {
              console.error('[Gen][Error] Workout generation outer error:', err);
              await updateWorkoutPlan(storage, {
                status: 'failed',
                error: err.message,
                completedAt: Date.now(),
              });

              // Continue anyway
              setServerProgress(PROGRESS.WORKOUT_DONE);
              console.warn('[Gen][Flow] Continuing despite workout failure');
            }
            } // End of online check (else block)
          } else {
            console.log('[Gen][Flow] Workout plan already ready');
            await updateSessionProgress(storage, PROGRESS.WORKOUT_DONE, 'תוכנית אימונים מוכנה!');
            setServerProgress(PROGRESS.WORKOUT_DONE);
            if (mounted) {
              setMessage('תוכנית אימונים מוכנה!');
            }
          }
        }

        // === STAGES GENERATION ===
        console.log('[Gen][Flow] Generating journey stages...');
        try {
          await updateStagesPlan(storage, {
            status: 'generating',
            startedAt: Date.now(),
          });

          // Build avatar profile from onboarding data
          const profile = getOnboardingData();
          const avatarProfile = {
            id: 'temp-id', // Will be replaced with actual user ID on signup
            goal: (Array.isArray(profile?.goals) ? profile.goals[0] : undefined) || 'maintain',
            diet: profile?.diet,
            frequency: profile?.training_frequency_actual,
            experience: profile?.experience,
            gender: profile?.gender || 'male',
          };

          console.log('[Gen][Stages] Building stages for avatar:', {
            goal: avatarProfile.goal,
            experience: avatarProfile.experience,
          });

          // Build stages via API (keeps large template data server-side)
          const stagesRes = await fetch('/api/journey/stages/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar: avatarProfile }),
          });

          if (!stagesRes.ok) {
            throw new Error(`Stages generation failed: ${stagesRes.statusText}`);
          }

          const stagesData = await stagesRes.json();
          if (!stagesData.ok) {
            throw new Error(stagesData.message || 'Stages generation failed');
          }

          const stages = stagesData.stages;

          // Validate stages data
          if (!stages || !Array.isArray(stages)) {
            console.error('[Gen][Stages] Invalid stages data:', stagesData);
            throw new Error('Stages data is invalid or missing');
          }

          console.log('[Gen][Stages] Built stages:', stages.length);

          // Save to session
          await updateStagesPlan(storage, {
            status: 'ready',
            stages,
            completedAt: Date.now(),
          });

          if (mounted) {
            setMessage('שלבי המסע נוצרו!');
          }

          console.log('[Gen][Flow] Stages ready');
        } catch (err: any) {
          console.error('[Gen][Error] Stages generation failed:', err);
          // Don't block - stages can be created later on signup
          await updateStagesPlan(storage, {
            status: 'failed',
            error: err.message,
            completedAt: Date.now(),
          });
        }

        // === COMPLETE ===
        await markSessionDone(storage);
        await updateSessionProgress(storage, PROGRESS.COMPLETE, 'התוכניות מוכנות!');
        setServerProgress(PROGRESS.WORKOUT_DONE); // 85% - triggers slow tail, then ease-out
        setGenerationComplete(true);
        if (mounted) {
          setMessage('התוכניות מוכנות!');
        }

        // [analytics] Track onboarding completed
        const onboardingData = getOnboardingData();
        track("onboarding_completed", {
          has_notifications_enabled: onboardingData?.notifications_opt_in ?? false,
        });

        console.log('[Generating] All generation complete, serverProgress:', PROGRESS.WORKOUT_DONE, 'generationComplete: true');

        // Save program draft immediately after completion
        try {
          const session = await getPlanSession(storage);
          if (session) {
            const draft: ProgramDraft = {
              version: PROGRAM_DRAFT_VERSION,
              days: NUTRITION_DAYS,
              nutritionJson: session.nutrition?.plan,
              workoutText: session.workout?.plan,
              createdAt: Date.now(),
            };

            const saved = await saveProgramDraft(storage, draft);
            if (saved) {
              console.log('[Gen][Storage] Program draft saved after completion');
            } else {
              console.warn('[Gen][Storage] Failed to save draft after completion');
            }
          }
        } catch (err: any) {
          console.error('[Gen][Storage] Draft save error after completion:', err);

          // Check if quota error
          const isQuotaError =
            (err instanceof DOMException && err.name === 'QuotaExceededError') ||
            err?.name === 'QuotaExceededError';

          if (isQuotaError) {
            console.error('[Gen][Storage] Quota exceeded after completion');
            const quotaError = mapErrorToHe(err, { operation: 'storage' });
            setHebrewError(quotaError);
            setErrorMsg(quotaError.title);
            // Continue anyway - data is in session storage
          }
        }

        // Mark as no longer generating
        isGeneratingRef.current = false;

      } catch (err: any) {
        // Mark as no longer generating
        isGeneratingRef.current = false;

        console.error('[Gen][Error] Fatal error:', err);

        if (mounted) {
          // Map error to Hebrew using error mapping utility
          const heError = mapErrorToHe(err);
          setHebrewError(heError);
          setErrorMsg(heError.title);
          setIsSoftTimeout(false);
        }

        // Mark session as failed
        const session = await getPlanSession(storage);
        if (session && session.status === 'running') {
          await updateSessionProgress(storage, session.progress, 'שגיאה ביצירת תוכניות');
        }
      }
    })();

    // Cleanup
    return () => {
      mounted = false;
      // Only abort if not actively generating (to prevent interrupting in-flight requests)
      // Use ref to get the latest value, not the closure value
      if (!isGeneratingRef.current) {
        try {
          controller.abort('unmount');
        } catch {}
      } else {
        console.warn('[Generating] Component unmounting but generation in progress - not aborting');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // guarded by ranOnce

  /**
   * Retry nutrition generation
   */
  const handleRetryNutrition = async () => {
    console.log('[Gen][Retry] User manually retrying nutrition generation...');
    setErrorMsg(null);
    setHebrewError(null);
    setIsSoftTimeout(false);

    // Check network before retrying
    const networkStatus = await network.getStatus();
    if (!networkStatus.connected) {
      console.warn('[Gen][Network] offline - blocking retry');
      const offlineError = mapErrorToHe(new Error('network_offline'), { operation: 'network' });
      setHebrewError(offlineError);
      setErrorMsg('אין חיבור לאינטרנט');
      return;
    }

    setMessage('מנסה שוב...');

    updateSessionProgress(storage, PROGRESS.NUTRITION_FETCHING, 'מייצר תפריט אישי...');
    setMessage('מייצר תפריט אישי...');

    const result = await runNutritionGeneration(storage);

    if (!result.ok) {
      if (result.reason === 'soft-timeout') {
        console.log('[Gen][Retry] Manual retry still timed out');
        setMessage('עדיין עובד... אתה יכול להמתין או לנסות שוב');
        setIsSoftTimeout(true);
        return;
      } else {
        console.error('[Gen][Retry] Manual retry hard-failed');
        const session = await getPlanSession(storage);
        const errorText = session?.nutrition?.error || 'Unknown error';
        const heError = mapErrorToHe(new Error(errorText), { operation: 'network' });
        setHebrewError(heError);
        setErrorMsg(heError.title);
        setIsSoftTimeout(false);
        return;
      }
    }

    // Success!
    setMessage('תוכנית תזונה מוכנה!');
    setServerProgress(PROGRESS.NUTRITION_DONE);
    console.log('[Generating] Manual retry succeeded');

    // Continue to completion
    await markSessionDone(storage);
    await updateSessionProgress(storage, PROGRESS.COMPLETE, 'התוכניות מוכנות!');
    setServerProgress(PROGRESS.WORKOUT_DONE); // 85% - triggers slow tail, then ease-out
    setGenerationComplete(true);
    setMessage('התוכניות מוכנות!');

    // Save program draft before navigation
    try {
      const session = await getPlanSession(storage);
      if (session) {
        const draft: ProgramDraft = {
          version: PROGRAM_DRAFT_VERSION,
          days: NUTRITION_DAYS,
          nutritionJson: session.nutrition?.plan,
          workoutText: session.workout?.plan,
          createdAt: Date.now(),
        };

        const saved = await saveProgramDraft(storage, draft);
        if (saved) {
          console.log('[Gen][Storage] Program draft saved after retry success');
        } else {
          console.warn('[Gen][Storage] Failed to save draft after retry');
        }
      }
    } catch (err: any) {
      console.error('[Gen][Storage] Draft save error after retry:', err);

      // Check if quota error
      const isQuotaError =
        (err instanceof DOMException && err.name === 'QuotaExceededError') ||
        err?.name === 'QuotaExceededError';

      if (isQuotaError) {
        console.error('[Gen][Storage] Quota exceeded after retry');
        const quotaError = mapErrorToHe(err, { operation: 'storage' });
        setHebrewError(quotaError);
        setErrorMsg(quotaError.title);
      }
    }

    // Navigation will happen automatically when isComplete becomes true
  };

  /**
   * Continue button handler (for errors or manual skip)
   */
  const handleContinueAnyway = async () => {
    console.log('[Generating] Manual continue → navigating to preview');

    // Ensure session exists even if all generation failed
    let session = await getPlanSession(storage);
    if (!session) {
      session = await createPlanSession(storage);
    }

    // Mark as done even if incomplete
    await markSessionDone(storage);
    setGenerationComplete(true);
    setServerProgress(PROGRESS.WORKOUT_DONE); // 85% - triggers ease-out to 100

    // Save program draft before navigation
    try {
      const draft: ProgramDraft = {
        version: PROGRAM_DRAFT_VERSION,
        days: NUTRITION_DAYS,
        nutritionJson: session.nutrition?.plan,
        workoutText: session.workout?.plan,
        createdAt: Date.now(),
      };

      const saved = await saveProgramDraft(storage, draft);
      if (saved) {
        console.log('[Gen][Storage] Program draft saved before manual continue');
      } else {
        console.warn('[Gen][Storage] Failed to save draft before manual continue');
      }
    } catch (err: any) {
      console.error('[Gen][Storage] Draft save error before manual continue:', err);

      // Check if quota error
      const isQuotaError =
        (err instanceof DOMException && err.name === 'QuotaExceededError') ||
        err?.name === 'QuotaExceededError';

      if (isQuotaError) {
        console.error('[Gen][Storage] Quota exceeded before manual continue');
        const quotaError = mapErrorToHe(err, { operation: 'storage' });
        setHebrewError(quotaError);
        setErrorMsg(quotaError.title);
        return; // Don't navigate if quota exceeded
      }
    }

    hardNavigate(router, '/onboarding/preview');
  };

  /**
   * Cleanup button handler (for quota exceeded errors)
   */
  const handleCleanupStorage = async () => {
    console.log('[Gen][Storage] User requested cleanup...');
    setMessage('מנקה אחסון...');

    try {
      const result = await cleanupStorage(storage);
      console.log('[Gen][Storage] Cleanup complete', result);

      // Clear the error and allow retry
      setHebrewError(null);
      setErrorMsg(null);
      setMessage('אחסון נוקה! נסה שוב.');

      // Show success message briefly
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      console.error('[Gen][Storage] Cleanup failed:', err);
      setMessage('ניקוי נכשל. נסה לסגור כרטיסיות אחרות.');
    }
  };

  /**
   * Manual navigation handler (for stuck navigation)
   */
  const handleForceNavigation = () => {
    console.log('[Gen][Nav] User forcing navigation to preview');
    hardNavigate(router, '/onboarding/preview');
  };

  return (
    <main dir="rtl" className="min-h-[100svh] bg-[#0e0f12] text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {/* Instance Conflict Warning */}
        {instanceConflict && (
          <div className="mb-4 bg-orange-500/10 text-orange-300 border border-orange-500/30 rounded-xl p-3 text-xs">
            <div className="font-bold mb-1">כרטיסייה אחרת מייצרת תוכנית</div>
            <div>נראה שכרטיסייה או חלון אחר כבר מייצר תוכנית. סגור את הכרטיסייה הזו או המתן שהיצירה תסתיים.</div>
          </div>
        )}

        {/* Stuck-at-99% Warning Banner */}
        {stuckWarning && !hebrewError && !errorMsg && !instanceConflict && (
          <div className="mb-4 bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 rounded-xl p-3 text-xs">
            {stuckWarning === '30s' ? (
              <>
                <div className="font-bold mb-1">היצירה לוקחת יותר זמן מהרגיל</div>
                <div>אנחנו עדיין עובדים על התוכנית שלך. אם ברצונך, תוכל להמשיך עם מה שיש.</div>
              </>
            ) : (
              <>
                <div className="font-bold mb-1">היצירה אורכת זמן רב</div>
                <div>השרת מתקשה ליצור את התוכנית. אתה יכול להמשיך עם מה שנוצר עד כה או להמתין עוד קצת.</div>
              </>
            )}
            <button
              onClick={handleContinueAnyway}
              className="mt-2 w-full h-10 rounded-full border border-yellow-500/50 text-yellow-300 font-bold hover:bg-yellow-500/20 transition text-xs"
            >
              המשך בכל זאת
            </button>
          </div>
        )}

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
            {/* Progress circle - server-synced with slow tail animation */}
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="url(#gradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(visualProgress / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
              fill="none"
            />
            <defs>
              <linearGradient id="gradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#E2F163" />
                <stop offset="100%" stopColor="#d4e350" />
              </linearGradient>
            </defs>
          </svg>
          {/* Percentage text - server-synced with slow tail animation */}
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-3xl font-extrabold">{Math.round(visualProgress)}%</span>
          </div>
        </div>

        {/* Helper text or Error */}
        {navStuck ? (
          <>
            <div className="bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 rounded-xl p-4 mb-4 text-sm">
              <div className="font-bold mb-2">הניווט לוקח יותר זמן מהרגיל</div>
              <div>לחץ על הכפתור למטה כדי להמשיך לעמוד הבא.</div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleForceNavigation}
                className="w-full h-12 rounded-full bg-[#E2F163] text-black font-bold hover:bg-[#d4e350] transition active:translate-y-1 active:brightness-90"
              >
                המשך לתוכנית שלי
              </button>
            </div>
          </>
        ) : hebrewError ? (
          <>
            <div className={`rounded-xl p-4 mb-4 text-sm ${
              hebrewError.level === 'critical'
                ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                : hebrewError.level === 'warning'
                ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
                : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
            }`}>
              <div className="font-bold mb-2">{hebrewError.title}</div>
              <div>{hebrewError.desc}</div>
            </div>
            <div className="flex flex-col gap-3">
              {hebrewError.actions?.map((action, idx) => {
                if (action.type === 'retry') {
                  return (
                    <button
                      key={idx}
                      onClick={handleRetryNutrition}
                      className="w-full h-12 rounded-full bg-[#E2F163] text-black font-bold hover:bg-[#d4e350] transition active:translate-y-1 active:brightness-90"
                    >
                      {action.label}
                    </button>
                  );
                }
                if (action.type === 'cleanup') {
                  return (
                    <button
                      key={idx}
                      onClick={handleCleanupStorage}
                      className="w-full h-12 rounded-full bg-orange-500 text-white font-bold hover:bg-orange-600 transition active:translate-y-1 active:brightness-90"
                    >
                      {action.label}
                    </button>
                  );
                }
                if (action.type === 'continue') {
                  return (
                    <button
                      key={idx}
                      onClick={handleContinueAnyway}
                      className="w-full h-12 rounded-full border border-white/20 text-white font-bold hover:bg-white/10 transition active:translate-y-1 active:brightness-90"
                    >
                      {action.label}
                    </button>
                  );
                }
                return null;
              })}
            </div>
          </>
        ) : errorMsg ? (
          <>
            <div className="bg-red-500/10 text-red-300 border border-red-500/30 rounded-xl p-4 mb-4 text-sm">
              {errorMsg}
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRetryNutrition}
                className="w-full h-12 rounded-full bg-[#E2F163] text-black font-bold hover:bg-[#d4e350] transition active:translate-y-1 active:brightness-90"
              >
                נסה שוב (תזונה)
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full h-12 rounded-full border border-[#E2F163]/30 text-[#E2F163] font-bold hover:bg-[#E2F163]/10 transition active:translate-y-1 active:brightness-90"
              >
                התחל מחדש
              </button>
              <button
                onClick={handleContinueAnyway}
                className="w-full h-12 rounded-full border border-white/20 text-white font-bold hover:bg-white/10 transition active:translate-y-1 active:brightness-90"
              >
                המשך בכל זאת
              </button>
            </div>
          </>
        ) : isSoftTimeout ? (
          <>
            <div className="bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 rounded-xl p-4 mb-4 text-sm">
              {message}
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRetryNutrition}
                className="w-full h-12 rounded-full bg-[#E2F163] text-black font-bold hover:bg-[#d4e350] transition active:translate-y-1 active:brightness-90"
              >
                נסה שוב
              </button>
              <div className="text-xs text-white/50">
                או המתן - התוכנית עדיין נוצרת ברקע
              </div>
            </div>
          </>
        ) : (
          <>
            <div aria-live="polite" className="mt-4 text-center text-white/80 text-sm">
              {message}
            </div>
            {serverProgress >= 85 && !generationComplete && (
              <p className="text-zinc-400 mt-2 text-xs">מסיים להכין את התוכנית…</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
