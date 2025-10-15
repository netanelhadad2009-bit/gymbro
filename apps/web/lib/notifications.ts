export async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration()
           ?? await navigator.serviceWorker.register('/sw.js');
  return reg;
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export async function requestAndSubscribe(vapidPublicKey: string) {
  if (typeof window === 'undefined') return { supported: false, granted: false };
  const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  // Ask permission (works also when Push unsupported)
  const permission = await Notification.requestPermission();
  const granted = permission === 'granted';

  if (!supported || !granted) return { supported, granted, subscription: null };

  const reg = await ensureServiceWorker();
  if (!reg) return { supported: false, granted, subscription: null };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
  }
  return { supported, granted, subscription: sub };
}
