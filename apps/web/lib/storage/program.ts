/**
 * Program storage wrapper
 * Re-exports program draft and plan session functions
 *
 * This wrapper provides a unified storage API under lib/storage/
 * combining both program-draft.ts and planSession.ts functionality
 */

// Program draft exports
export {
  type ProgramDraft,
  clearProgramDraft,
  saveProgramDraft,
  readProgramDraft,
  hasProgramDraft,
  cleanupStorage,
  PROGRAM_DRAFT_VERSION,
  DRAFT_TTL_MS,
} from '../program-draft';

// Plan session exports
export {
  type PlanSession,
  type PlanStatus,
  type NutritionPlanData,
  type WorkoutPlanData,
  type JourneyPlanData,
  type StagesPlanData,
  getPlanSession,
  clearPlanSession,
  createPlanSession,
  savePlanSession,
  updateSessionProgress,
  updateNutritionPlan,
  updateWorkoutPlan,
  updateJourneyPlan,
  updateStagesPlan,
  markSessionDone,
  markSessionFailed,
  isSessionComplete,
  hasReadyPlans,
  getSessionSummary,
} from '../planSession';
