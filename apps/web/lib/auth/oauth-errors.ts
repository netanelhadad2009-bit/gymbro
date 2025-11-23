/**
 * OAuth-specific error handling
 *
 * Wraps OAuth errors with provider context to enable proper error messaging
 */

export class OAuthError extends Error {
  provider: 'google' | 'apple';
  originalError?: unknown;

  constructor(provider: 'google' | 'apple', message: string, originalError?: unknown) {
    super(message);
    this.name = 'OAuthError';
    this.provider = provider;
    this.originalError = originalError;
  }
}

/**
 * Wrap OAuth function calls to add provider context to errors
 */
export async function withOAuthErrorHandling<T>(
  provider: 'google' | 'apple',
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // If error already contains cancellation info, preserve it
    if (error?.message?.toLowerCase().includes('cancel')) {
      throw new OAuthError(provider, 'התחברות בוטלה.', error);
    }

    // Otherwise wrap with generic OAuth error
    throw new OAuthError(
      provider,
      `OAuth error with ${provider}`,
      error
    );
  }
}
