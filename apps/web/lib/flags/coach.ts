/**
 * Coach feature flags
 */

/**
 * Check if the coach composer (message input) should be shown.
 * ENABLED only if explicitly set to 'true' or '1'.
 * Defaults to FALSE (disabled/hidden).
 */
export function isCoachComposerEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_COACH_COMPOSER_ENABLED || '').trim().toLowerCase();
  return v === 'true' || v === '1';
}
