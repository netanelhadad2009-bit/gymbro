/**
 * Global Error Handler
 * Catches unhandled errors and promise rejections
 */

// Test instrumentation: Push events to global error log
function pushErrorEvent(event: any) {
  if (typeof window !== 'undefined') {
    (window as any).__gbErrorEvents = (window as any).__gbErrorEvents || [];
    (window as any).__gbErrorEvents.push({ ...event, ts: Date.now() });
  }
}

export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  // Catch synchronous errors
  window.addEventListener('error', (event) => {
    console.error('[GlobalError] Unhandled error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      timestamp: new Date().toISOString(),
    });

    // Test hook: Track global error
    pushErrorEvent({
      type: 'global-error',
      message: event.message,
      filename: event.filename,
    });

    // Log to external service if configured
    // logToService('error', event.error);
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[GlobalError] Unhandled promise rejection:', {
      reason: event.reason,
      promise: event.promise,
      timestamp: new Date().toISOString(),
    });

    // Test hook: Track unhandled rejection
    pushErrorEvent({
      type: 'unhandled-rejection',
      reason: event.reason?.message || String(event.reason),
    });

    // Prevent default browser handling (shows error in console)
    // event.preventDefault();

    // Log to external service if configured
    // logToService('unhandledrejection', event.reason);
  });

  console.log('[GlobalError] Error handlers registered');
}

/**
 * Safe JSON parse helper
 */
export function safeJsonParse<T = any>(
  jsonString: string,
  fallback: T | null = null
): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('[GlobalError] JSON parse failed:', error);
    return fallback;
  }
}

/**
 * Safe async fetch with timeout
 */
export async function safeFetch(
  url: string,
  options?: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options || {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Safe JSON response parser
 */
export async function safeJsonResponse<T = any>(
  response: Response,
  options?: { validateOk?: boolean }
): Promise<{ data: T | null; error: string | null }> {
  try {
    if (options?.validateOk && !response.ok) {
      const errorText = await response.text();
      return {
        data: null,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const text = await response.text();
    if (!text) {
      return { data: null, error: 'Empty response body' };
    }

    const data = JSON.parse(text) as T;
    return { data, error: null };
  } catch (error) {
    console.error('[GlobalError] Failed to parse JSON response:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retry helper for flaky operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    exponentialBackoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = exponentialBackoff
          ? delayMs * Math.pow(2, attempt)
          : delayMs;

        console.warn(
          `[GlobalError] Operation failed, retrying (${attempt + 1}/${maxRetries}) after ${delay}ms:`,
          lastError.message
        );

        onRetry?.(attempt + 1, lastError);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}
