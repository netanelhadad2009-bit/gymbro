'use client';

const RETRY_QUEUE_KEY = 'gymbro:onboarding:retryQueue';

interface RetryQueueItem {
  step: string;
  payload: Record<string, unknown>;
  ts: number;
}

/**
 * Add a failed save to the retry queue
 */
export function queueDraftRetry(step: string, payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  try {
    const queueStr = localStorage.getItem(RETRY_QUEUE_KEY) || '[]';
    const queue: RetryQueueItem[] = JSON.parse(queueStr);

    queue.push({
      step,
      payload,
      ts: Date.now(),
    });

    localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(queue));
    console.log(`[RetryQueue] Queued save for step: ${step}`);
  } catch (error) {
    console.error('[RetryQueue] Failed to queue retry:', error);
  }
}

/**
 * Flush the retry queue by attempting to save all pending items
 */
export async function flushDraftRetry(
  flushFn: (payload: Record<string, unknown>) => Promise<void>
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const queueStr = localStorage.getItem(RETRY_QUEUE_KEY) || '[]';
    const queue: RetryQueueItem[] = JSON.parse(queueStr);

    if (queue.length === 0) return;

    console.log(`[RetryQueue] Flushing ${queue.length} items...`);

    const remaining: RetryQueueItem[] = [];

    for (const item of queue) {
      try {
        await flushFn(item.payload);
        console.log(`[RetryQueue] Successfully flushed step: ${item.step}`);
      } catch (error) {
        console.warn(`[RetryQueue] Failed to flush step: ${item.step}`, error);
        remaining.push(item);
      }
    }

    // Update queue with remaining items
    localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(remaining));

    if (remaining.length === 0) {
      console.log('[RetryQueue] All items flushed successfully');
    } else {
      console.log(`[RetryQueue] ${remaining.length} items still pending`);
    }
  } catch (error) {
    console.error('[RetryQueue] Failed to flush queue:', error);
  }
}

/**
 * Get the current retry queue (for debugging)
 */
export function getRetryQueue(): RetryQueueItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const queueStr = localStorage.getItem(RETRY_QUEUE_KEY) || '[]';
    return JSON.parse(queueStr);
  } catch {
    return [];
  }
}

/**
 * Clear the entire retry queue
 */
export function clearRetryQueue(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(RETRY_QUEUE_KEY);
    console.log('[RetryQueue] Queue cleared');
  } catch (error) {
    console.error('[RetryQueue] Failed to clear queue:', error);
  }
}
