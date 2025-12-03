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
    // Log detailed error information for debugging
    console.error('[OAuthError] Provider:', provider);
    console.error('[OAuthError] Error type:', error?.constructor?.name || typeof error);
    console.error('[OAuthError] Error message:', error?.message);
    console.error('[OAuthError] Error code:', error?.code);
    console.error('[OAuthError] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2));

    // If error already contains cancellation info, preserve it
    if (error?.message?.toLowerCase().includes('cancel')) {
      throw new OAuthError(provider, 'התחברות בוטלה.', error);
    }

    // Include more details in the error message for debugging
    const errorDetails = error?.message || error?.code || String(error);
    throw new OAuthError(
      provider,
      `OAuth error with ${provider}: ${errorDetails}`,
      error
    );
  }
}
