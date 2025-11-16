/* eslint-disable no-undef */
// FitJourney Service Worker for Push Notifications
// Production-ready implementation

const CACHE_NAME = 'fitjourney-v1';
const DEBUG = false; // Set to true for console logging

function log(...args) {
  if (DEBUG) console.log('[SW]', ...args);
}

// Install: Skip waiting to activate immediately
self.addEventListener('install', (event) => {
  log('Installing service worker...');
  self.skipWaiting();
});

// Activate: Claim all clients immediately
self.addEventListener('activate', (event) => {
  log('Activating service worker...');
  event.waitUntil(
    self.clients.claim().then(() => {
      log('Service worker activated and claimed clients');
    })
  );
});

// Push: Show notification when push message arrives
self.addEventListener('push', (event) => {
  log('Push event received');

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    log('Error parsing push data:', e);
  }

  const title = data.title || 'FitJourney';
  const options = {
    body: data.body || 'תזכורת חדשה מ-FitJourney',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'fitjourney-notification',
    data: data.data || { url: '/' },
    requireInteraction: data.requireInteraction || false,
    vibrate: data.vibrate || [200, 100, 200],
    actions: data.actions || []
  };

  log('Showing notification:', title, options);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => log('Notification shown successfully'))
      .catch(err => log('Error showing notification:', err))
  );
});

// Notification click: Focus existing window or open new one
self.addEventListener('notificationclick', (event) => {
  log('Notification clicked');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        log('Found clients:', clientList.length);

        // Try to find an existing window with the app
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            log('Focusing existing window');
            return client.focus();
          }
        }

        // If no matching window, try to focus any window with our origin
        for (const client of clientList) {
          if ('focus' in client) {
            log('Focusing any window');
            return client.focus().then(() => {
              if ('navigate' in client) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }

        // No existing window, open a new one
        if (clients.openWindow) {
          log('Opening new window');
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(err => log('Error handling notification click:', err))
  );
});

// Push subscription change: Handle when subscription expires/changes
self.addEventListener('pushsubscriptionchange', (event) => {
  log('Push subscription changed');

  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        log('Re-subscribed successfully');
        // Send new subscription to backend
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            resubscribe: true
          })
        });
      })
      .catch(err => log('Error re-subscribing:', err))
  );
});

log('Service worker script loaded');
