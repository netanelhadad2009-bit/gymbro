"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
import { Capacitor } from '@capacitor/core';
import {
  getPushStatus,
  requestPushPermission,
  openAppSettings,
  markPromptShown,
  type PushPermissionStatus
} from '@/lib/notifications/permissions';
import { Settings } from 'lucide-react';
import { track } from "@/lib/mixpanel";

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

  // New state for native permission flow
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>('prompt');
  const requestInProgress = useRef(false);
  const isNative = Capacitor.isNativePlatform();

  // Simulator mock dialog state
  const [showSimulatorDialog, setShowSimulatorDialog] = useState(false);

  // Initialize and check permission status
  useEffect(() => {
    async function initPermissions() {
      console.log('[RemindersPage] Initializing permissions...');
      console.log('[RemindersPage] Is Native:', isNative);

      registerServiceWorker();
      await loadDiagnostics();

      // Check current permission status
      const status = await getPushStatus();
      console.log('[RemindersPage] Permission status from API:', status);

      // In development, always show prompt for iOS native to allow testing
      const isDev = process.env.NODE_ENV === 'development';
      console.log('[RemindersPage] Is Development:', isDev);

      if (isDev && isNative) {
        console.log('[RemindersPage] iOS Development mode - forcing prompt state');
        setPermissionStatus('prompt');
        return;
      }

      setPermissionStatus(status);
      console.log('[RemindersPage] Setting permission status to:', status);

      // If already granted, proceed to next step immediately
      // (This is a fallback - normally the readiness page skips to generating directly)
      if (status === 'granted') {
        console.log('[RemindersPage] Permission already granted, proceeding to next step');
        saveOnboardingData({ notifications_opt_in: true });
        router.push("/onboarding/generating");
      }
    }

    initPermissions();
  }, [router, isNative]);

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

  /**
   * Request permission via native system sheet (iOS) or web API
   */
  async function handleRequestPermission() {
    // Prevent duplicate requests
    if (requestInProgress.current || loading) {
      console.log('[RemindersPage] Request already in progress, skipping');
      return;
    }

    // In development on iOS Simulator, show mock system dialog
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev && isNative) {
      console.log('[RemindersPage] iOS Simulator - showing mock system dialog');
      setShowSimulatorDialog(true);
      return;
    }

    try {
      requestInProgress.current = true;
      setLoading(true);
      setMsg(null);
      markPromptShown();

      // [analytics] Track push permission prompt shown
      track("push_permission_prompt_shown", {
        platform: Capacitor.getPlatform(),
      });

      console.log('[RemindersPage] Requesting push permission');
      const status = await requestPushPermission();
      setPermissionStatus(status);

      // [analytics] Track push permission result
      track("push_permission_result", {
        platform: Capacitor.getPlatform(),
        status,
      });

      console.log('[RemindersPage] Permission result:', status);

      if (status === 'granted') {
        await handleGrantedPermission();
      } else if (status === 'denied') {
        handleDeniedPermission();
      } else {
        setMsg('לא הצלחנו לקבל אישור להתראות');
        setMsgType('error');
        saveOnboardingData({ notifications_opt_in: false });
        setTimeout(() => router.push("/onboarding/generating"), 2000);
      }
    } catch (e: any) {
      console.error('[RemindersPage] Permission error:', e);
      setMsg('משהו השתבש. תוכל להמשיך ולהפעיל התראות מאוחר יותר.');
      setMsgType('error');
      saveOnboardingData({ notifications_opt_in: false });
      setTimeout(() => router.push("/onboarding/generating"), 2000);
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
  }

  /**
   * Handle simulator mock dialog - Allow
   */
  function handleSimulatorAllow() {
    setShowSimulatorDialog(false);
    console.log('[RemindersPage] Simulator mock: User clicked Allow');
    saveOnboardingData({ notifications_opt_in: true });
    setMsg('התראות הופעלו בהצלחה! ✓');
    setMsgType('success');
    setTimeout(() => router.push("/onboarding/generating"), 1500);
  }

  /**
   * Handle simulator mock dialog - Don't Allow
   */
  function handleSimulatorDeny() {
    setShowSimulatorDialog(false);
    console.log('[RemindersPage] Simulator mock: User clicked Don\'t Allow');
    setPermissionStatus('denied');
  }

  /**
   * Handle permission granted
   *
   * For NATIVE: Just save preference and continue. The actual token registration
   * happens via setupNativePush() in PremiumGate after the user logs in.
   * This prevents 401 errors since the user isn't authenticated during onboarding.
   *
   * For WEB: Use the existing subscribePush flow which handles web push subscriptions.
   */
  async function handleGrantedPermission() {
    try {
      console.log('[RemindersPage] Permission granted');

      if (isNative) {
        // Native: Permission granted is enough for onboarding.
        // Token registration will happen automatically via setupNativePush()
        // in PremiumGate after the user completes login.
        console.log('[RemindersPage] Native platform - permission saved, token registration deferred to post-login');
      } else {
        // Web platform - use existing subscribePush flow
        const result = await subscribePush();
        setSubscribeResult(result);

        if (!result.success) {
          setMsg(result.error || 'משהו השתבש בהרשמה להתראות');
          setMsgType('error');
          saveOnboardingData({ notifications_opt_in: false });
          setTimeout(() => router.push("/onboarding/generating"), 2000);
          return;
        }
      }

      // Success!
      setMsg('התראות הופעלו בהצלחה! ✓');
      setMsgType('success');
      saveOnboardingData({ notifications_opt_in: true });

      // Navigate to next step
      setTimeout(() => {
        router.push("/onboarding/generating");
      }, 1500);

    } catch (e: any) {
      console.error('[RemindersPage] Registration error:', e);
      setMsg('ההרשמה להתראות נכשלה, אבל אפשר להמשיך');
      setMsgType('error');
      saveOnboardingData({ notifications_opt_in: false });
      setTimeout(() => router.push("/onboarding/generating"), 2000);
    }
  }

  /**
   * Handle permission denied
   */
  function handleDeniedPermission() {
    console.log('[RemindersPage] Permission denied by user');
    setMsg('התראות נדחו. תוכל להפעיל אותן מההגדרות מאוחר יותר.');
    setMsgType('info');
    saveOnboardingData({ notifications_opt_in: false });

    // Don't auto-navigate - let user see the denied state
    // They can manually skip or open settings
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
    <main dir="rtl" className="min-h-screen bg-[#0B0D0E] flex flex-col items-center justify-center px-6">
      {/* Simulator Mock iOS System Dialog */}
      {showSimulatorDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <div className="bg-[#F2F2F7] rounded-[14px] w-full max-w-[270px] overflow-hidden">
            {/* Dialog Content */}
            <div className="px-4 pt-5 pb-4 text-center">
              <h3 className="text-[17px] font-semibold text-black mb-2">
                "FitJourney" {getGenderedText('מבקש לשלוח לך עדכונים', 'מבקשת לשלוח לך עדכונים', 'מבקש/ת לשלוח לך עדכונים')}
              </h3>
              <p className="text-[13px] text-black/60 leading-[16px]">
                התראות עשויות לכלול התראות, צלילים וסמלים על סמל האפליקציה
              </p>
            </div>

            {/* Buttons */}
            <div className="border-t border-black/10">
              <button
                onClick={handleSimulatorDeny}
                className="w-full h-[44px] text-[#007AFF] text-[17px] font-normal border-b border-black/10 active:bg-black/5 transition"
              >
                לא לאפשר
              </button>
              <button
                onClick={handleSimulatorAllow}
                className="w-full h-[44px] text-[#007AFF] text-[17px] font-semibold active:bg-black/5 transition"
              >
                אישור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Development bypass banner */}
      {isDev && isNative && permissionStatus === 'prompt' && !showSimulatorDialog && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-yellow-500/20 border border-yellow-500 text-yellow-200 p-3 rounded-lg text-xs text-center">
          ⚠️ iOS Simulator: Mock dialog will appear. Test the permission flow.
        </div>
      )}

      {/* Debug status banner */}
      {isDev && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-blue-500/20 border border-blue-500 text-blue-200 p-3 rounded-lg text-xs">
          <p>Permission Status: <strong>{permissionStatus}</strong></p>
          <p>Is Native: <strong>{isNative ? 'Yes' : 'No'}</strong></p>
          <p>Loading: <strong>{loading ? 'Yes' : 'No'}</strong></p>
          <p>Platform: <strong>{Capacitor.getPlatform()}</strong></p>
          <p>Has Capacitor: <strong>{typeof window !== 'undefined' && (window as any).Capacitor ? 'Yes' : 'No'}</strong></p>
        </div>
      )}

      {/* Main heading */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-white leading-tight">
          {getGenderedText(
            'הישאר במסלול עם התראות',
            'הישארי במסלול עם התראות',
            'הישאר/י במסלול עם התראות'
          )}
        </h1>
      </div>

      {/* Permission denied state */}
      {permissionStatus === 'denied' && !loading && (
        <div className="w-full max-w-md space-y-4">
          {isDev && isNative && (
            <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-200 p-3 rounded-lg text-xs text-center mb-4">
              ⚠️ Simulator limitation - Click "המשך בלי התראות" to continue testing
            </div>
          )}
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-2xl text-sm text-center mb-6">
            התראות נדחו. תוכל להפעיל אותן מההגדרות מאוחר יותר.
          </div>

          <button
            onClick={() => openAppSettings()}
            className="w-full h-14 bg-[#E2F163] text-[#0B0D0E] font-bold text-lg rounded-full transition-all duration-200 hover:bg-[#d4e350] active:scale-95 flex items-center justify-center gap-2 shadow-lg"
          >
            <Settings className="w-5 h-5" strokeWidth={2.5} />
            <span>פתח הגדרות</span>
          </button>

          <button
            onClick={handleSkip}
            className="w-full h-12 text-white/60 font-medium text-base hover:text-white/80 transition-colors"
          >
            המשך בלי התראות
          </button>
        </div>
      )}

      {/* Initial prompt state - iOS-style permission card */}
      {(permissionStatus === 'prompt' || (isDev && permissionStatus === 'unavailable')) && (
        <div className="w-full max-w-sm px-6 relative">
          {/* iOS native-style permission dialog */}
          <div className="bg-[#E8E8E8] rounded-[28px] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="pt-8 pb-6 px-6 text-center">
              <h2 className="text-black font-semibold text-[17px] leading-snug">
                "FitJourney" {getGenderedText('מבקש לשלוח לך עדכונים', 'מבקשת לשלוח לך עדכונים', 'מבקש/ת לשלוח לך עדכונים')}
              </h2>
            </div>

            {/* Action buttons - iOS native style */}
            <div className="flex gap-3 px-4 pb-4">
              <button
                onClick={handleSkip}
                disabled={loading}
                data-testid="notif-skip"
                className="flex-1 h-[50px] bg-gray-300/60 hover:bg-gray-300/80 active:bg-gray-300 text-black font-semibold text-[17px] rounded-[14px] transition-colors disabled:opacity-50"
              >
                סירוב
              </button>

              <button
                onClick={handleRequestPermission}
                disabled={loading}
                data-testid="notif-allow"
                className="flex-1 h-[50px] bg-[#007AFF] hover:bg-[#0051D5] active:bg-[#004DBD] text-white font-semibold text-[17px] rounded-[14px] transition-colors disabled:opacity-50"
              >
                {loading ? getGenderedText('מפעיל...', 'מפעילה...', 'מפעיל/ה...') : 'אישור'}
              </button>
            </div>
          </div>

          {/* Pointing hand icon - below pointing up at confirmation button */}
          {!loading && (
            <div className="absolute -bottom-20 left-16 text-5xl animate-bounce">
              👆
            </div>
          )}
        </div>
      )}

      {/* Test notification button (Development Only) */}
      {canTest && isDev && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleTestNotification}
            disabled={testLoading}
            className="px-6 py-3 bg-white/10 text-white font-bold text-sm rounded-full transition hover:bg-white/20 active:translate-y-1 disabled:opacity-50 backdrop-blur-sm"
          >
            {testLoading ? 'שולח...' : 'שלח התראת בדיקה 🧪'}
          </button>
        </div>
      )}

      {/* Diagnostics Panel (Development Only) */}
      {isDev && (
        <div className="fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full text-xs text-white/40 hover:text-white/60 transition mb-2 text-center"
          >
            {showDiagnostics ? '▼' : '▶'} Diagnostics
          </button>

          {showDiagnostics && diagnostics && (
            <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 text-xs font-mono space-y-2 border border-white/10">
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
