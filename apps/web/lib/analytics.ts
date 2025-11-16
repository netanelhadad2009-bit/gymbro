/**
 * Analytics helper with dual-emit support during brand migration
 * Emits events with both fitjourney_ and gymbro_ prefixes for dashboard compatibility
 * TODO: Remove legacy emit after dashboards are migrated (target: 2 weeks)
 */

// Analytics event prefixes
export const ANALYTICS_PREFIX = {
  new: 'fitjourney_',
  legacy: 'gymbro_', // TODO: Remove after dashboards are fully migrated
};

/**
 * Track analytics event with dual-emit for migration period
 * @param event - Event name (can be with or without prefix)
 * @param props - Event properties
 */
export function track(event: string, props: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;

  const { new: newPrefix, legacy: legacyPrefix } = ANALYTICS_PREFIX;

  // Normalize event name with new prefix if not already prefixed
  let normalizedEvent = event;
  if (!event.startsWith(newPrefix) && !event.startsWith(legacyPrefix)) {
    normalizedEvent = `${newPrefix}${event}`;
  } else if (event.startsWith(legacyPrefix)) {
    // If it has legacy prefix, replace with new
    normalizedEvent = event.replace(legacyPrefix, newPrefix);
  }

  // Emit with new prefix
  try {
    (window as any).gtag?.('event', normalizedEvent, props);
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }

  // Dual-emit with legacy prefix for dashboard compatibility
  if (legacyPrefix && normalizedEvent.startsWith(newPrefix)) {
    const legacyEvent = normalizedEvent.replace(newPrefix, legacyPrefix);
    try {
      (window as any).gtag?.('event', legacyEvent, { ...props, _legacy: true });
    } catch (error) {
      console.error('[Analytics] Failed to track legacy event:', error);
    }
  }

  // Debug logging in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics]', {
      event: normalizedEvent,
      legacyEvent: normalizedEvent.replace(newPrefix, legacyPrefix),
      props
    });
  }
}

/**
 * Track page view
 */
export function trackPageView(path: string, title?: string): void {
  track('page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/**
 * Track user action
 */
export function trackAction(action: string, category: string, label?: string, value?: number): void {
  track('user_action', {
    action,
    category,
    label,
    value,
  });
}

/**
 * Track conversion event
 */
export function trackConversion(type: string, value?: number, currency?: string): void {
  track('conversion', {
    conversion_type: type,
    value,
    currency: currency || 'ILS',
  });
}

/**
 * Track error
 */
export function trackError(error: string, context?: Record<string, any>): void {
  track('error', {
    error_message: error,
    ...context,
  });
}