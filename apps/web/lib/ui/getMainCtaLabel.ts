/**
 * Returns the appropriate label for the main CTA button on the home screen.
 * Provides safe fallbacks to ensure the button label is never empty.
 */
export interface GetMainCtaLabelOptions {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the user has a workout plan */
  hasPlan?: boolean;
  /** Whether auth state is still loading */
  isLoading?: boolean;
}

export function getMainCtaLabel(opts: GetMainCtaLabelOptions): string {
  // Loading state
  if (opts.isLoading) {
    return "טוען…";
  }

  // Not authenticated
  if (!opts.isAuthenticated) {
    return "התחל את השאלון";
  }

  // Authenticated with plan
  if (opts.hasPlan) {
    return "פתח את התוכנית";
  }

  // Authenticated without plan (fallback)
  return "התחל";
}
