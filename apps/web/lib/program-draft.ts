/**
 * Program draft storage utilities
 * Used to save generated programs locally before signup
 *
 * Features:
 * - Version management for migration
 * - TTL expiration (48h default)
 * - Validation and purging of invalid drafts
 * - Graceful error handling
 * - Platform-agnostic storage (Web/Native)
 */

import type { PlatformStorage } from './platform';

export const PROGRAM_DRAFT_VERSION = 1;
export const DRAFT_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export type ProgramDraft = {
  version: number;
  createdAt: number;
  expiresAt?: number;
  days: number;
  workoutText?: string;
  nutritionJson?: {
    meta?: {
      calories_target?: number;
      protein_target_g?: number;
      carbs_target_g?: number;
      fat_target_g?: number;
      start_date?: string;
    };
    meals_flat?: Array<{
      day: string;
      order: 1 | 2 | 3 | 4 | 5;
      title: string;
      time: string;
      desc: string;
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    }>;
  };
};

const KEY = "program.draft";

/**
 * Validate draft structure
 */
export function isValidDraft(d: any): d is ProgramDraft {
  return !!d
    && typeof d.version === 'number'
    && typeof d.createdAt === 'number'
    && typeof d.days === 'number'
    && d.days > 0;
}

/**
 * Check if draft is expired
 */
function isExpired(d: ProgramDraft): boolean {
  if (!d.expiresAt) return false;
  return Date.now() > d.expiresAt;
}

/**
 * Migrate draft from old version to current
 */
function migrateDraft(d: any): ProgramDraft {
  // If no version, it's from before versioning - add defaults
  if (!d.version) {
    const now = Date.now();
    return {
      ...d,
      version: PROGRAM_DRAFT_VERSION,
      createdAt: d.createdAt || now,
      expiresAt: d.expiresAt || (now + DRAFT_TTL_MS),
    };
  }

  // Add future migrations here
  // e.g. if (d.version === 0) { /* transform fields */ d.version = 1; }

  return d;
}

/**
 * Save program draft to storage
 * Automatically adds version, timestamps, and TTL
 *
 * @returns true on success, false on failure
 * @throws DOMException with name 'QuotaExceededError' if storage is full
 */
export async function saveProgramDraft(
  storage: PlatformStorage,
  draft: Omit<ProgramDraft, 'version' | 'createdAt' | 'expiresAt'> | ProgramDraft,
  options: { retry?: boolean } = {}
): Promise<boolean> {
  try {
    const now = Date.now();
    const toSave: ProgramDraft = {
      ...draft,
      version: PROGRAM_DRAFT_VERSION,
      createdAt: 'createdAt' in draft ? draft.createdAt : now,
      expiresAt: 'expiresAt' in draft ? draft.expiresAt : (now + DRAFT_TTL_MS),
    };

    await storage.setItem(KEY, JSON.stringify(toSave));
    console.log('[ProgramDraft] Saved draft', {
      version: toSave.version,
      createdAt: new Date(toSave.createdAt).toISOString(),
      expiresAt: toSave.expiresAt ? new Date(toSave.expiresAt).toISOString() : 'never',
      days: toSave.days,
      hasWorkout: !!toSave.workoutText,
      hasNutrition: !!toSave.nutritionJson,
      retry: options.retry,
    });
    return true;
  } catch (err: any) {
    console.error('[ProgramDraft] Failed to save:', err);

    // Check if it's a storage quota error
    const isQuotaError =
      (err instanceof DOMException && err.name === 'QuotaExceededError') ||
      (err?.name === 'QuotaExceededError') ||
      (typeof err?.message === 'string' &&
        (err.message.includes('quota') || err.message.includes('storage full')));

    if (isQuotaError) {
      console.error('[ProgramDraft] Storage quota exceeded');
      // Re-throw quota errors so they can be handled by the UI
      throw err;
    }

    // For other errors, retry once if not already retrying
    if (!options.retry) {
      console.log('[ProgramDraft] Retrying save after error...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return saveProgramDraft(storage, draft, { retry: true });
    }

    // Failed after retry
    return false;
  }
}

/**
 * Load program draft from storage
 * Validates, migrates, and purges invalid/expired drafts
 *
 * @returns Valid draft or null (with reason logged)
 */
export async function readProgramDraft(storage: PlatformStorage): Promise<ProgramDraft | null> {
  try {
    const raw = await storage.getItem(KEY);

    if (!raw) {
      console.log('[ProgramDraft] No draft found');
      return null;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.error('[ProgramDraft] Invalid JSON, purging', parseErr);
      await storage.removeItem(KEY);
      return null;
    }

    // Migrate from old versions
    const migrated = migrateDraft(parsed);

    // Validate structure
    if (!isValidDraft(migrated)) {
      console.error('[ProgramDraft] Invalid structure, purging', migrated);
      await storage.removeItem(KEY);
      return null;
    }

    // Check expiration
    if (isExpired(migrated)) {
      console.warn('[ProgramDraft] Draft expired, purging', {
        expiresAt: new Date(migrated.expiresAt!).toISOString(),
        now: new Date().toISOString(),
      });
      await storage.removeItem(KEY);
      return null;
    }

    console.log('[ProgramDraft] Loaded valid draft', {
      version: migrated.version,
      createdAt: new Date(migrated.createdAt).toISOString(),
      days: migrated.days,
    });

    return migrated;
  } catch (err) {
    console.error('[ProgramDraft] Unexpected error loading draft, purging', err);
    try {
      await storage.removeItem(KEY);
    } catch {}
    return null;
  }
}

/**
 * Clear program draft from storage
 * Call this after user publishes/downloads the program
 */
export async function clearProgramDraft(storage: PlatformStorage): Promise<void> {
  try {
    await storage.removeItem(KEY);
    console.log('[ProgramDraft] Draft cleared');
  } catch (err) {
    console.error('[ProgramDraft] Failed to clear draft:', err);
  }
}

/**
 * Check if a valid draft exists without loading it
 */
export async function hasProgramDraft(storage: PlatformStorage): Promise<boolean> {
  const draft = await readProgramDraft(storage);
  return draft !== null;
}

/**
 * Clean up storage by removing old/expired items
 * This is useful when quota is exceeded
 *
 * @returns Object with cleanup stats
 */
export async function cleanupStorage(storage: PlatformStorage): Promise<{
  draftCleared: boolean;
  sessionCleared: boolean;
  onboardingCleared: boolean;
  totalFreed: number;
}> {
  let draftCleared = false;
  let sessionCleared = false;
  let onboardingCleared = false;
  let totalFreed = 0;

  console.log('[Storage][Cleanup] Starting cleanup...');

  // Clear program draft
  try {
    const draftRaw = await storage.getItem('program.draft');
    if (draftRaw) {
      await storage.removeItem('program.draft');
      totalFreed += draftRaw.length;
      draftCleared = true;
      console.log('[Storage][Cleanup] Cleared program draft', { bytes: draftRaw.length });
    }
  } catch (err) {
    console.error('[Storage][Cleanup] Failed to clear draft:', err);
  }

  // Clear plan session
  try {
    const sessionRaw = await storage.getItem('plan.session');
    if (sessionRaw) {
      await storage.removeItem('plan.session');
      totalFreed += sessionRaw.length;
      sessionCleared = true;
      console.log('[Storage][Cleanup] Cleared plan session', { bytes: sessionRaw.length });
    }
  } catch (err) {
    console.error('[Storage][Cleanup] Failed to clear session:', err);
  }

  // Clear onboarding data (if it's very old)
  try {
    const onboardingRaw = await storage.getItem('onboarding');
    if (onboardingRaw) {
      await storage.removeItem('onboarding');
      totalFreed += onboardingRaw.length;
      onboardingCleared = true;
      console.log('[Storage][Cleanup] Cleared onboarding data', { bytes: onboardingRaw.length });
    }
  } catch (err) {
    console.error('[Storage][Cleanup] Failed to clear onboarding:', err);
  }

  console.log('[Storage][Cleanup] Cleanup complete', {
    draftCleared,
    sessionCleared,
    onboardingCleared,
    totalFreed,
  });

  return { draftCleared, sessionCleared, onboardingCleared, totalFreed };
}
