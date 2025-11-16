/**
 * PlanSession - Unified generation session storage
 *
 * This replaces the old nutrition draft system with a comprehensive
 * session that tracks generation of all plans (nutrition, workout, journey).
 *
 * Flow:
 * 1. GeneratingPage creates PlanSession with status='running'
 * 2. Generates all plans and updates session progressively
 * 3. When done, marks session as 'done'
 * 4. SignupClient reads session and attaches plans to user profile
 *
 * Platform-agnostic: works on both Web and Native
 */

import type { PlatformStorage } from "./platform";

const PREFIX = "fitjourney";
const LEGACY_PREFIX = "gymbro";
const SESSION_KEY_PREFIX = `${PREFIX}:planSession`;
const DEVICE_ID_KEY = `${PREFIX}:deviceId`;
const LEGACY_SESSION_KEY_PREFIX = `${LEGACY_PREFIX}:planSession`;
const LEGACY_DEVICE_ID_KEY = `${LEGACY_PREFIX}:deviceId`;

/**
 * Individual plan status within the session
 */
export type PlanStatus = 'pending' | 'generating' | 'ready' | 'failed';

/**
 * Nutrition plan data
 */
export type NutritionPlanData = {
  status: PlanStatus;
  fingerprint: string;
  calories: number | null;
  plan?: any; // Full nutrition plan object
  error?: string;
  startedAt?: number;
  completedAt?: number;
};

/**
 * Workout plan data
 */
export type WorkoutPlanData = {
  status: PlanStatus;
  plan?: any; // Full workout program object
  error?: string;
  startedAt?: number;
  completedAt?: number;
};

/**
 * Journey/Avatar data
 */
export type JourneyPlanData = {
  status: PlanStatus;
  avatar?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
};

/**
 * Stages plan data (new linear stage system)
 */
export type StagesPlanData = {
  status: PlanStatus;
  stages?: any[]; // Array of built stages
  error?: string;
  startedAt?: number;
  completedAt?: number;
};

/**
 * Complete plan generation session
 */
export type PlanSession = {
  status: 'running' | 'done' | 'failed';
  deviceId: string;
  createdAt: number;
  updatedAt: number;

  nutrition?: NutritionPlanData;
  workout?: WorkoutPlanData;
  journey?: JourneyPlanData;
  stages?: StagesPlanData;

  // Overall progress (0-100)
  progress: number;

  // User-facing message
  message?: string;
};

/**
 * Get or create device ID for this device
 * Uses platform storage to persist across sessions
 */
async function getDeviceId(storage: PlatformStorage): Promise<string> {
  let deviceId = await storage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await storage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get the session key for this device
 */
async function getSessionKey(storage: PlatformStorage): Promise<string> {
  const deviceId = await getDeviceId(storage);
  return `${SESSION_KEY_PREFIX}:${deviceId}`;
}

/**
 * Create a new plan session
 */
export async function createPlanSession(storage: PlatformStorage): Promise<PlanSession> {
  const deviceId = await getDeviceId(storage);
  const session: PlanSession = {
    status: 'running',
    deviceId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    progress: 0,
    message: 'מתחיל יצירת תוכניות...',
  };

  await savePlanSession(storage, session);
  console.log('[PlanSession] Created new session', { deviceId: session.deviceId });

  return session;
}

/**
 * Get the current plan session (or null if none exists)
 */
export async function getPlanSession(storage: PlatformStorage): Promise<PlanSession | null> {
  try {
    const key = await getSessionKey(storage);
    const data = await storage.getItem(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as PlanSession;
  } catch (e) {
    console.error('[PlanSession] Failed to read session:', e);
    return null;
  }
}

/**
 * Save/update the current plan session
 */
export async function savePlanSession(storage: PlatformStorage, session: PlanSession): Promise<void> {
  try {
    session.updatedAt = Date.now();
    const key = await getSessionKey(storage);
    await storage.setItem(key, JSON.stringify(session));

    console.log('[PlanSession] Saved', {
      status: session.status,
      progress: session.progress,
      nutrition: session.nutrition?.status,
      workout: session.workout?.status,
      journey: session.journey?.status,
      stages: session.stages?.status,
    });
  } catch (e) {
    console.error('[PlanSession] Failed to save session:', e);
  }
}

/**
 * Update session progress and message
 */
export async function updateSessionProgress(storage: PlatformStorage, progress: number, message?: string): Promise<void> {
  const session = await getPlanSession(storage);
  if (!session) return;

  session.progress = Math.min(100, Math.max(0, progress));
  if (message) {
    session.message = message;
  }

  await savePlanSession(storage, session);
}

/**
 * Update nutrition plan data
 */
export async function updateNutritionPlan(storage: PlatformStorage, data: Partial<NutritionPlanData>): Promise<void> {
  const session = await getPlanSession(storage);
  if (!session) return;

  session.nutrition = {
    ...session.nutrition,
    ...data,
  } as NutritionPlanData;

  await savePlanSession(storage, session);
  console.log('[PlanSession] Updated nutrition', { status: session.nutrition.status });
}

/**
 * Update workout plan data
 */
export async function updateWorkoutPlan(storage: PlatformStorage, data: Partial<WorkoutPlanData>): Promise<void> {
  const session = await getPlanSession(storage);
  if (!session) return;

  session.workout = {
    ...session.workout,
    ...data,
  } as WorkoutPlanData;

  await savePlanSession(storage, session);
  console.log('[PlanSession] Updated workout', { status: session.workout.status });
}

/**
 * Update journey/avatar data
 */
export async function updateJourneyPlan(storage: PlatformStorage, data: Partial<JourneyPlanData>): Promise<void> {
  const session = await getPlanSession(storage);
  if (!session) return;

  session.journey = {
    ...session.journey,
    ...data,
  } as JourneyPlanData;

  await savePlanSession(storage, session);
  console.log('[PlanSession] Updated journey', { status: session.journey.status });
}

/**
 * Update stages plan data
 */
export async function updateStagesPlan(storage: PlatformStorage, data: Partial<StagesPlanData>): Promise<void> {
  const session = await getPlanSession(storage);
  if (!session) return;

  session.stages = {
    ...session.stages,
    ...data,
  } as StagesPlanData;

  await savePlanSession(storage, session);
  console.log('[PlanSession] Updated stages', { status: session.stages.status, count: session.stages.stages?.length });
}

/**
 * Mark session as done
 */
export async function markSessionDone(storage: PlatformStorage): Promise<void> {
  const session = await getPlanSession(storage);
  if (!session) return;

  session.status = 'done';
  session.progress = 100;
  session.message = 'התוכניות מוכנות!';

  await savePlanSession(storage, session);
  console.log('[PlanSession] Marked session as done');
}

/**
 * Mark session as failed
 */
export async function markSessionFailed(storage: PlatformStorage, error?: string): Promise<void> {
  const session = await getPlanSession(storage);
  if (!session) return;

  session.status = 'failed';
  if (error) {
    session.message = error;
  }

  await savePlanSession(storage, session);
  console.log('[PlanSession] Marked session as failed', { error });
}

/**
 * Clear the current session
 */
export async function clearPlanSession(storage: PlatformStorage): Promise<void> {
  try {
    const key = await getSessionKey(storage);
    await storage.removeItem(key);
    console.log('[PlanSession] Cleared session');
  } catch (e) {
    console.error('[PlanSession] Failed to clear session:', e);
  }
}

/**
 * Check if session is complete (all enabled plans are ready or failed)
 */
export function isSessionComplete(session: PlanSession): boolean {
  // Nutrition is always required
  if (!session.nutrition || (session.nutrition.status !== 'ready' && session.nutrition.status !== 'failed')) {
    return false;
  }

  // Workout and journey are optional - if they're started, they should be complete
  if (session.workout && session.workout.status === 'generating') {
    return false;
  }

  if (session.journey && session.journey.status === 'generating') {
    return false;
  }

  return true;
}

/**
 * Check if session has any ready plans
 */
export function hasReadyPlans(session: PlanSession): boolean {
  return (
    session.nutrition?.status === 'ready' ||
    session.workout?.status === 'ready' ||
    session.journey?.status === 'ready'
  );
}

/**
 * Get a summary of the session status
 */
export function getSessionSummary(session: PlanSession): {
  nutrition: { status: PlanStatus; hasData: boolean };
  workout: { status: PlanStatus; hasData: boolean };
  journey: { status: PlanStatus; hasData: boolean };
} {
  return {
    nutrition: {
      status: session.nutrition?.status || 'pending',
      hasData: !!session.nutrition?.plan,
    },
    workout: {
      status: session.workout?.status || 'pending',
      hasData: !!session.workout?.plan,
    },
    journey: {
      status: session.journey?.status || 'pending',
      hasData: !!session.journey?.avatar,
    },
  };
}
