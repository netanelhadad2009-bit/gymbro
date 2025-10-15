/**
 * Service Worker Registration Utility
 * Registers /sw.js for push notifications
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') {
    console.log('[SW] Not in browser context');
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Workers not supported');
    return null;
  }

  try {
    // Check if already registered
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) {
      console.log('[SW] Already registered:', existing.scope);
      return existing;
    }

    // Register new service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[SW] Registered successfully:', registration.scope);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('[SW] Service worker is ready');

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return null;
  }
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    return registration || null;
  } catch (error) {
    console.error('[SW] Error getting registration:', error);
    return null;
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (registration) {
      return await registration.unregister();
    }
    return false;
  } catch (error) {
    console.error('[SW] Error unregistering:', error);
    return false;
  }
}
