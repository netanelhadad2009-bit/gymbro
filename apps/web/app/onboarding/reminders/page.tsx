"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { saveOnboardingData } from "@/lib/onboarding-storage";
import {
  subscribePush,
  sendTestNotification,
  getCurrentSubscription,
  getDeviceInfo,
  type DeviceInfo,
  type PushSubscribeResult
} from "@/lib/push-client";
import { registerServiceWorker, getServiceWorkerRegistration } from "@/lib/register-sw";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";

interface DiagnosticsData {
  permission: NotificationPermission;
  hasServiceWorker: boolean;
  swActive: boolean;
  hasPushManager: boolean;
  hasSubscription: boolean;
  subscriptionEndpoint: string | null;
  deviceInfo: DeviceInfo;
}

export default function RemindersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [subscribeResult, setSubscribeResult] = useState<PushSubscribeResult | null>(null);
  const { getGenderedText } = useOnboardingGender();

  // Initialize service worker and load diagnostics on mount
  useEffect(() => {
    registerServiceWorker();
    loadDiagnostics();
  }, []);

  // Reload diagnostics when subscription changes
  useEffect(() => {
    if (subscribeResult?.success) {
      loadDiagnostics();
    }
  }, [subscribeResult]);

  async function loadDiagnostics() {
    const deviceInfo = getDeviceInfo();
    const registration = await getServiceWorkerRegistration();
    const subscription = await getCurrentSubscription();

    const data: DiagnosticsData = {
      permission: typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : 'denied',
      hasServiceWorker: 'serviceWorker' in navigator,
      swActive: !!registration?.active,
      hasPushManager: 'PushManager' in window,
      hasSubscription: !!subscription,
      subscriptionEndpoint: subscription?.endpoint?.substring(0, 50) || null,
      deviceInfo
    };

    setDiagnostics(data);
  }

  async function handleEnable() {
    try {
      setLoading(true);
      setMsg(null);

      const result = await subscribePush();
      setSubscribeResult(result);

      // Save to localStorage
      saveOnboardingData({ notifications_opt_in: result.success });

      if (!result.supported) {
        // Show the specific error message returned
        setMsg(result.error || 'התראות לא נתמכות במכשיר/דפדפן זה. אפשר להמשיך.');
        setMsgType('info');
      } else if (!result.success) {
        if (result.permission === 'denied') {
          setMsg('התראות נחסמו. תוכל להפעיל אותן בהגדרות הדפדפן מאוחר יותר.');
        } else {
          setMsg(result.error || 'משהו השתבש. נסה שוב או המשך בלי התראות.');
        }
        setMsgType('error');
      } else {
        setMsg('התראות הופעלו בהצלחה! ✓');
        setMsgType('success');
      }

      // Proceed to generating page after completing onboarding
      setTimeout(() => {
        router.push("/onboarding/generating");
      }, result.success ? 1500 : 2500);
    } catch (e: any) {
      console.error('Notification error:', e);
      setMsg('משהו השתבש. תוכל להמשיך ולהפעיל התראות מאוחר יותר.');
      setMsgType('error');
      saveOnboardingData({ notifications_opt_in: false });
      setTimeout(() => {
        router.push("/onboarding/generating");
      }, 2000);
    } finally {
      setLoading(false);
      await loadDiagnostics();
    }
  }

  async function handleTestNotification() {
    try {
      setTestLoading(true);
      const result = await sendTestNotification();

      if (result.success) {
        setMsg('התראת בדיקה נשלחה! בדוק את המכשיר שלך ✓');
        setMsgType('success');
      } else {
        if (result.error?.includes('expired') || result.error?.includes('410')) {
          setMsg('המנוי פג תוקף. אנא הירשם שוב.');
          setMsgType('error');
          // Clear subscription
          setSubscribeResult(null);
        } else {
          setMsg(`שגיאה בשליחת התראה: ${result.error}`);
          setMsgType('error');
        }
      }

      await loadDiagnostics();
    } catch (e: any) {
      setMsg(`שגיאה: ${e.message}`);
      setMsgType('error');
    } finally {
      setTestLoading(false);
    }
  }

  function handleSkip() {
    saveOnboardingData({ notifications_opt_in: false });
    router.push("/onboarding/generating");
  }

  const canTest = subscribeResult?.success && diagnostics?.hasSubscription;
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <main dir="rtl" className="min-h-screen bg-[#0e0f12] text-white flex flex-col">

      {/* Title and Subtitle */}
      <div className="px-6 pb-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 3.5rem)' }}>
        <h1 className="text-3xl font-bold text-center mb-3">{getGenderedText("מתמידים", "מתמידות", "מתמידים/ות")} ביחד {getGenderedText("איתך", "איתך", "איתך")}</h1>
        <p className="text-center text-white/60 text-base">
          האפליקציה תשלח {getGenderedText("לך", "לך", "לך")} תזכורות שיעזרו {getGenderedText("לך", "לך", "לך")} להישאר במסלול, ולהתקדם לעבר המטרות {getGenderedText("שלך", "שלך", "שלך")}.
        </p>
      </div>

      {/* Phone mockup */}
      <div className="flex-1 flex items-center justify-center py-4">
        <Image
          src="/onboarding/phone-reminders.png"
          alt="Phone mockup with reminders"
          width={300}
          height={600}
          className="w-[300px] md:w-[340px]"
          priority
        />
      </div>

      {/* Footnote */}
      <p className="text-center text-white/60 text-sm px-6 mb-6">
        *משתמשים שמקבלים התראות מתמידים ב־36% יותר.
      </p>

      {/* Message */}
      {msg && (
        <div className={`mx-6 mb-4 p-3 rounded-xl text-sm text-center ${
          msgType === 'success' ? 'bg-green-500/10 text-green-400' :
          msgType === 'error' ? 'bg-red-500/10 text-red-400' :
          'bg-white/5 text-white/70'
        }`}>
          {msg}
        </div>
      )}

      {/* Actions */}
      <div className="px-6 pb-4 space-y-4">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="w-full h-14 bg-[#E2F163] text-black font-bold text-lg rounded-full transition hover:bg-[#d4e350] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? getGenderedText('מפעיל התראות...', 'מפעילה התראות...', 'מפעיל/ה התראות...') : getGenderedText('מאשר לקבל התראות', 'מאשרת לקבל התראות', 'מאשר/ת לקבל התראות')}
        </button>

        {canTest && isDev && (
          <button
            onClick={handleTestNotification}
            disabled={testLoading}
            className="w-full h-12 bg-white/5 text-white font-bold text-base rounded-full transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
          >
            {testLoading ? 'שולח...' : 'שלח התראת בדיקה 🧪'}
          </button>
        )}

        <button
          onClick={handleSkip}
          disabled={loading}
          className="w-full text-white/70 text-base hover:underline transition disabled:opacity-50"
        >
          אולי אחר כך
        </button>
      </div>

      {/* Diagnostics Panel (Development Only) */}
      {isDev && (
        <div className="px-6 pb-8">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full text-xs text-white/40 hover:text-white/60 transition mb-2"
          >
            {showDiagnostics ? '▼' : '▶'} Diagnostics
          </button>

          {showDiagnostics && diagnostics && (
            <div className="bg-black/30 rounded-xl p-4 text-xs font-mono space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <DiagnosticItem
                  label="Permission"
                  value={diagnostics.permission}
                  status={diagnostics.permission === 'granted' ? 'success' : diagnostics.permission === 'denied' ? 'error' : 'warning'}
                />
                <DiagnosticItem
                  label="Service Worker"
                  value={diagnostics.hasServiceWorker ? 'Supported' : 'Not supported'}
                  status={diagnostics.hasServiceWorker ? 'success' : 'error'}
                />
                <DiagnosticItem
                  label="SW Active"
                  value={diagnostics.swActive ? 'Active' : 'Inactive'}
                  status={diagnostics.swActive ? 'success' : 'error'}
                />
                <DiagnosticItem
                  label="Push Manager"
                  value={diagnostics.hasPushManager ? 'Available' : 'Not available'}
                  status={diagnostics.hasPushManager ? 'success' : 'error'}
                />
                <DiagnosticItem
                  label="Subscription"
                  value={diagnostics.hasSubscription ? 'Active' : 'None'}
                  status={diagnostics.hasSubscription ? 'success' : 'warning'}
                />
                <DiagnosticItem
                  label="Web Push"
                  value={diagnostics.deviceInfo.supportsWebPush ? 'Supported' : 'Not supported'}
                  status={diagnostics.deviceInfo.supportsWebPush ? 'success' : 'error'}
                />
              </div>

              <div className="pt-2 border-t border-white/10 space-y-1">
                <p className="text-white/60">
                  <span className="text-white/40">Device:</span>{' '}
                  {diagnostics.deviceInfo.isIOS ? `iOS ${diagnostics.deviceInfo.iosVersion || '?'}` : 'Non-iOS'}
                  {diagnostics.deviceInfo.isPWA && ' (PWA)'}
                </p>
                {diagnostics.subscriptionEndpoint && (
                  <p className="text-white/60 break-all">
                    <span className="text-white/40">Endpoint:</span>{' '}
                    {diagnostics.subscriptionEndpoint}...
                  </p>
                )}
              </div>

              {subscribeResult && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-white/60 mb-1">Last Subscribe Result:</p>
                  <p className={`${
                    subscribeResult.success ? 'text-green-400' :
                    'text-red-400'
                  }`}>
                    {subscribeResult.success ? '✓ Success' : '✗ Failed'}
                    {subscribeResult.error && `: ${subscribeResult.error}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function DiagnosticItem({
  label,
  value,
  status
}: {
  label: string;
  value: string;
  status: 'success' | 'error' | 'warning';
}) {
  const colors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400'
  };

  const icons = {
    success: '✓',
    error: '✗',
    warning: '!'
  };

  return (
    <div className="bg-white/5 rounded p-2">
      <p className="text-white/40 mb-1">{label}</p>
      <p className={`${colors[status]} font-bold`}>
        {icons[status]} {value}
      </p>
    </div>
  );
}
