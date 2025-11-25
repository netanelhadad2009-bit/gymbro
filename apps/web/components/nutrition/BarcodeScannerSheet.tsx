/**
 * BarcodeScannerSheet Component
 * Full-screen barcode scanner with camera preview
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  X,
  FlashlightOff,
  Flashlight,
  SwitchCamera,
  AlertCircle,
  Camera,
  Loader2,
} from 'lucide-react';
import { useScanner, type ScannerErrorCode } from '@/lib/hooks/useScanner';
import { useToast } from '@/components/ui/use-toast';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { LookupResult } from '@/lib/hooks/useBarcodeLookup';
import { ManualProductSheet } from './ManualProductSheet';
import type { BarcodeProduct } from '@/types/barcode';

interface BarcodeScannerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (barcode: string) => Promise<LookupResult | void>;
  onManualProductSuccess?: (product: BarcodeProduct) => void;
}

export function BarcodeScannerSheet({
  open,
  onOpenChange,
  onDetected,
  onManualProductSuccess,
}: BarcodeScannerSheetProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showHint, setShowHint] = useState(false);
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [error, setError] = useState<{
    code: 'invalid' | 'not_found' | 'network' | 'bad_barcode' | 'partial' | 'unknown';
    msg: string;
  } | null>(null);
  const [showManualProductSheet, setShowManualProductSheet] = useState(false);
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  const hintTimerRef = useRef<NodeJS.Timeout>();

  // Scanner state management
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'running' | 'no-permission' | 'not-supported' | 'error'>('idle');
  const [lastScannerError, setLastScannerError] = useState<ScannerErrorCode | null>(null);

  const stoppedRef = useRef(false); // Prevent double stops
  const startAttemptedRef = useRef(false); // Prevent multiple start attempts
  const lastToastRef = useRef<string>(''); // Prevent duplicate toasts
  const { toast } = useToast();

  // Log props and environment for debugging
  useEffect(() => {
    console.log('[BarcodeScannerSheet] Props changed:', {
      open,
      mode,
      scannerStatus,
      hasOnDetected: !!onDetected,
    });

    if (open) {
      console.log('🔴 [BarcodeScannerSheet] DIALOG SHOULD BE VISIBLE NOW');
    } else {
      console.log('⚪ [BarcodeScannerSheet] DIALOG SHOULD BE HIDDEN NOW');
    }

    // Log iOS-specific info on mount
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent);
    console.log('[BarcodeScannerSheet] Device info:', {
      isIOS,
      isIOSWebView,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    });
  }, [onDetected, open, mode, scannerStatus]);

  // Store scanner callback result for later use
  const scannerCallbackRef = useRef<((barcode: string) => Promise<void>) | null>(null);

  const scanner = useScanner({
    onDetected: async (barcode) => {
      if (scannerCallbackRef.current) {
        await scannerCallbackRef.current(barcode);
      }
    },
  });

  const {
    isActive,
    isInitializing,
    error: scannerError,
    errorCode: scannerErrorCode,
    hasTorch,
    torchEnabled,
    cameras,
    activeDeviceId,
    hasPermission,
    isNative,
    startScanning,
    stopScanning,
    toggleTorch,
    setActiveDevice,
  } = scanner;

  // Type assertion to access setVideoElement if it exists
  const setVideoElement = (scanner as any).setVideoElement;

  // Scanner callback handler
  useEffect(() => {
    scannerCallbackRef.current = async (barcode: string) => {
      console.log('[Scanner] Camera detection:', barcode, { isNative });
      // Haptic feedback on detection
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // Store the scanned barcode for later use
      setLastScannedBarcode(barcode);

      const result = await onDetected(barcode);
      // Only close if successful
      if (!result || result.ok === true) {
        onOpenChange(false);
      } else {
        // Reset scanner status but DON'T reset startAttemptedRef yet
        console.log('[Scanner] Camera detection error, resetting state', {
          reason: result.reason,
          isNative,
        });
        setScannerStatus('idle'); // Reset scanner status

        // For native mode, the scanner modal has already closed by itself
        // Show the dialog for "not found" errors, or close for other errors
        if (isNative) {
          console.log('[Scanner] Native mode error', { reason: result.reason });

          if (result.reason === 'not_found') {
            // Show the dialog so user can choose: scan again or add manually
            // DON'T reset startAttemptedRef here - keep it true to prevent auto-restart
            console.log('[Scanner] Showing not found dialog for native (keeping startAttemptedRef true)');
            setShowNotFoundDialog(true);
            setManualCode(barcode);
          } else {
            // For other errors, reset the flag and close
            startAttemptedRef.current = false;
            // For other errors, show toast and close
            let errorTitle = "שגיאה";
            let errorMsg = result.message || "לא ניתן לזהות את הברקוד";

            if (result.reason === 'invalid' || result.reason === 'bad_barcode') {
              errorTitle = "ברקוד לא תקין";
              errorMsg = "נסו שוב";
            } else if (result.reason === 'network') {
              errorTitle = "בעיית חיבור";
              errorMsg = "בדקו אינטרנט ונסו שוב";
            }

            toast({
              title: errorTitle,
              description: errorMsg,
              variant: "destructive",
              duration: 4000,
            });

            // Close the sheet after a tiny delay
            setTimeout(() => {
              console.log('[Scanner] Closing sheet after native error');
              onOpenChange(false);
            }, 100);
          }
        } else {
          // Web mode - stop the scanner and show options
          stopScanning();

          // For "not found" errors, show the dialog
          if (result.reason === 'not_found') {
            // DON'T reset startAttemptedRef here - keep it true to prevent auto-restart
            console.log('[Scanner] Showing not found dialog for web (keeping startAttemptedRef true)');
            setShowNotFoundDialog(true);
            setManualCode(barcode);
          } else {
            // For other errors, reset the flag
            startAttemptedRef.current = false;
            // For other errors, show toast and switch to manual
            let errorTitle = "שגיאה";
            let errorMsg = result.message || "לא ניתן לזהות את הברקוד";

            if (result.reason === 'invalid' || result.reason === 'bad_barcode') {
              errorTitle = "ברקוד לא תקין";
              errorMsg = "נסו שוב או הקלידו ידנית";
            } else if (result.reason === 'network') {
              errorTitle = "בעיית חיבור";
              errorMsg = "בדקו אינטרנט ונסו שוב";
            }

            toast({
              title: errorTitle,
              description: errorMsg,
              variant: "destructive",
            });

            setMode('manual');
          }
        }
      }
    };
  }, [onDetected, stopScanning, onOpenChange, toast, isNative]);

  // Safe stop function to prevent double stops
  const stopScannerOnce = useCallback(() => {
    if (!stoppedRef.current && isActive) {
      stoppedRef.current = true;
      console.log('[Scanner] Stopping scanner');
      stopScanning();
    }
  }, [isActive, stopScanning]);

  // Set video element ref IMMEDIATELY when the video element mounts
  // This ensures the ref is available before startScanning is called
  const handleVideoRef = useCallback((element: HTMLVideoElement | null) => {
    // Use type assertion to work around readonly restriction in callback refs
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = element;
    if (setVideoElement) {
      setVideoElement(element);
      console.log('[BarcodeScannerSheet] Video element ref set:', !!element);
    }
  }, [setVideoElement]);

  // Start scanning when opened
  useEffect(() => {
    console.log('[BarcodeScannerSheet] Start scanner useEffect triggered:', {
      open,
      mode,
      startAttempted: startAttemptedRef.current,
      scannerStatus,
      isNative,
    });

    stoppedRef.current = false; // Reset when mode/open changes

    if (open && mode === 'scan') {
      // Prevent multiple start attempts
      if (startAttemptedRef.current) {
        console.log('[BarcodeScannerSheet] Scanner start already attempted, skipping', {
          startAttempted: startAttemptedRef.current,
          scannerStatus,
        });
        return;
      }

      console.log('[BarcodeScannerSheet] Opening scanner, video ref exists:', !!videoRef.current);
      startAttemptedRef.current = true;

      // Start scanning with error handling
      (async () => {
        try {
          setScannerStatus('running');
          setLastScannerError(null);
          await startScanning();
        } catch (err) {
          const code = (err as any)?.code ?? 'UNKNOWN';
          setLastScannerError(code);

          if (code === 'NO_PERMISSION' || code === 'PERMISSION_DENIED') {
            setScannerStatus('no-permission');
          } else if (code === 'NOT_SUPPORTED') {
            setScannerStatus('not-supported');
          } else {
            setScannerStatus('error');
          }

          console.error('[BarcodeScannerSheet] Scanner failed to start:', code, err);
        }
      })();

      // Show hint after 3 seconds
      hintTimerRef.current = setTimeout(() => {
        setShowHint(true);
      }, 3000);
    } else {
      console.log('[BarcodeScannerSheet] Scanner useEffect ELSE block - resetting state');
      stopScannerOnce();
      setShowHint(false);
      setScannerStatus('idle');
      setLastScannerError(null);
      startAttemptedRef.current = false; // Reset for next open
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    }

    // Reset state when closing
    if (!open) {
      console.log('[BarcodeScannerSheet] Sheet closing - full state reset');
      setMode('scan');
      setManualCode('');
      setStatus('idle');
      setError(null);
      setScannerStatus('idle');
      setLastScannerError(null);
      setShowNotFoundDialog(false);
      setLastScannedBarcode('');
      lastToastRef.current = '';
      startAttemptedRef.current = false; // Reset for next open
      stoppedRef.current = false; // Reset stopped flag
    }

    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, [open, mode, startScanning, stopScannerOnce]);

  // Auto-focus input when switching to manual mode
  useEffect(() => {
    if (mode === 'manual' && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [mode]);

  // iOS Debug: Monitor video element events for troubleshooting
  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== 'scan') return;

    const handleLoadedMetadata = () => {
      console.log('[Video] loadedmetadata event:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        duration: video.duration,
      });
    };

    const handleLoadedData = () => {
      console.log('[Video] loadeddata event - first frame loaded');
    };

    const handleCanPlay = () => {
      console.log('[Video] canplay event - ready to play');
    };

    const handlePlaying = () => {
      console.log('[Video] playing event - playback started');
    };

    const handleError = (e: Event) => {
      console.error('[Video] error event:', {
        error: video.error,
        networkState: video.networkState,
        readyState: video.readyState,
      });
    };

    const handleStalled = () => {
      console.warn('[Video] stalled event - media download stalled');
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);
    video.addEventListener('stalled', handleStalled);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      video.removeEventListener('stalled', handleStalled);
    };
  }, [mode]);

  // Retry scanner start
  const handleRetry = async () => {
    console.log('[BarcodeScannerSheet] Retry clicked');
    startAttemptedRef.current = false; // Reset to allow retry
    setScannerStatus('idle');
    setLastScannerError(null);

    try {
      setScannerStatus('running');
      await startScanning();
    } catch (err) {
      const code = (err as any)?.code ?? 'UNKNOWN';
      setLastScannerError(code);

      if (code === 'NO_PERMISSION' || code === 'PERMISSION_DENIED') {
        setScannerStatus('no-permission');
      } else if (code === 'NOT_SUPPORTED') {
        setScannerStatus('not-supported');
      } else {
        setScannerStatus('error');
      }

      console.error('[BarcodeScannerSheet] Retry failed:', code, err);
    }
  };

  // Switch camera
  const handleSwitchCamera = () => {
    const currentIndex = cameras.findIndex(c => c.deviceId === activeDeviceId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    if (nextCamera) {
      setActiveDevice(nextCamera.deviceId);
      stopScannerOnce();
      stoppedRef.current = false; // Reset for restart
      setTimeout(() => startScanning(), 100);
    }
  };

  // Switch to manual entry mode
  const handleSwitchToManual = () => {
    console.log('[Scanner] Switching to manual mode');
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    stopScannerOnce();
    setMode('manual');
  };

  // Switch back to scan mode
  const handleSwitchToScan = () => {
    console.log('[Scanner] Switching to scan mode');
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    setManualCode('');
    setStatus('idle');
    setError(null);
    lastToastRef.current = '';
    setMode('scan');
  };

  // Haptic feedback helpers
  const hapticSuccess = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const hapticError = () => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 30, 30]);
    }
  };

  // Handle manual barcode submission
  const handleManualSubmit = async () => {
    if (manualCode.length < 8) {
      console.warn('[Scanner] Code too short:', manualCode.length);
      setStatus('error');
      setError({
        code: 'invalid',
        msg: 'ברקוד קצר מדי. יש להזין לפחות 8 ספרות.',
      });
      return;
    }

    console.log('[Scanner] Manual submit ->', manualCode);
    setStatus('loading');
    setError(null);

    if (!onDetected) {
      console.error('[Scanner] onDetected prop is missing!');
      setStatus('error');
      setError({
        code: 'unknown',
        msg: 'פונקציית החיפוש לא הוגדרה',
      });
      return;
    }

    try {
      // Call the detection handler
      const result = await onDetected(manualCode);
      console.log('[Scanner] Manual submit result:', result);

      if (!result || result.ok === true) {
        // Success - haptic feedback and close
        setStatus('success');
        hapticSuccess();
        console.log('[Scanner] Closing sheet (success)');
        onOpenChange(false);
      } else {
        // Error - show inline error and keep sheet open
        console.log('[Scanner] Keeping sheet open (error):', result.reason);
        setStatus('error');
        hapticError();

        // Map error to user-friendly message
        let errorMsg = 'אירעה שגיאה. נסו שוב.';
        if (result.reason === 'not_found') {
          errorMsg = 'המוצר לא נמצא. נסו חיפוש לפי שם או הוספת מוצר ידני.';
          console.log('[Scanner] not_found → enabling Israel search button');
        } else if (result.reason === 'invalid' || result.reason === 'bad_barcode') {
          errorMsg = 'ברקוד לא תקין. יש להקליד 8–14 ספרות.';
        } else if (result.reason === 'partial') {
          errorMsg = 'נמצאו נתונים חלקיים. אפשר להשלים ידנית.';
        } else if (result.reason === 'network') {
          errorMsg = 'בעיית חיבור. בדקו אינטרנט ונסו שוב.';
        }

        setError({
          code: result.reason,
          msg: errorMsg,
        });

        // Show toast only if it's different from the last one (prevent duplicates)
        const toastKey = `${result.reason}`;
        if (lastToastRef.current !== toastKey) {
          lastToastRef.current = toastKey;
          toast({
            title: result.reason === 'not_found' ? 'המוצר לא נמצא' : 'שגיאה',
            description: errorMsg,
            variant: result.reason === 'partial' ? 'default' : 'destructive',
            duration: 2000,
          });
        }

        // Keep input focused using requestAnimationFrame for iOS keyboard
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      }
    } catch (error: any) {
      console.error('[Scanner] Manual submission error:', error);
      setStatus('error');
      setError({
        code: 'unknown',
        msg: error.message || 'שגיאה בחיפוש המוצר',
      });
      hapticError();
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    setManualCode(value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
      setStatus('idle');
      lastToastRef.current = '';
    }
  };

  // In native mode, don't render the main Dialog - Capacitor shows its own full-screen camera UI
  // But still render the error dialogs and manual product sheet
  if (isNative) {
    console.log('[BarcodeScannerSheet] Native mode - not rendering main Dialog. Scanner state:', {
      open,
      isActive,
      isInitializing,
      hasPermission,
      scannerStatus,
      lastScannerError,
      showNotFoundDialog,
    });

    // Render only the dialogs for native mode
    return (
      <>
        <ManualProductSheet
          open={showManualProductSheet}
          onOpenChange={setShowManualProductSheet}
          barcode={lastScannedBarcode || manualCode || undefined}
          onSuccess={(product) => {
            console.log('[Scanner] Manual product created:', product);
            // Close barcode scanner
            onOpenChange(false);
            // Call success callback to open NutritionFactsSheet
            if (onManualProductSuccess) {
              onManualProductSuccess(product);
            }
          }}
        />

        {/* Not Found Dialog */}
        <AnimatePresence>
          {showNotFoundDialog && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[20000] bg-black/80 backdrop-blur-sm"
                onClick={() => setShowNotFoundDialog(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[20001] max-w-sm mx-auto bg-[#1a1b20] rounded-2xl border border-white/10 p-6"
                dir="rtl"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">המוצר לא נמצא</h3>
                  <p className="text-white/70 mb-6">
                    הברקוד <span className="font-mono">{lastScannedBarcode}</span> לא נמצא במאגר שלנו
                  </p>

                  <div className="space-y-3">
                    {/* Primary action: Scan another */}
                    <button
                      onClick={() => {
                        console.log('[NotFoundDialog] Scan another barcode (native)');
                        if (navigator.vibrate) {
                          navigator.vibrate(30);
                        }
                        setShowNotFoundDialog(false);
                        // Reset for new scan
                        startAttemptedRef.current = false;
                        setScannerStatus('idle');
                        setMode('scan');
                        // Restart scanning
                        setTimeout(() => {
                          startScanning();
                        }, 100);
                      }}
                      className="w-full py-3 bg-[#E2F163] text-black rounded-xl font-semibold hover:bg-[#d4e350] transition-colors"
                    >
                      סרוק ברקוד אחר
                    </button>

                    {/* Secondary action: Add manually */}
                    <button
                      onClick={() => {
                        console.log('[NotFoundDialog] Add manually (native)');
                        if (navigator.vibrate) {
                          navigator.vibrate(30);
                        }
                        setShowNotFoundDialog(false);
                        setShowManualProductSheet(true);
                      }}
                      className="w-full py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
                    >
                      הוסף מוצר ידני
                    </button>

                    {/* Tertiary action: Cancel */}
                    <button
                      onClick={() => {
                        setShowNotFoundDialog(false);
                        onOpenChange(false);
                      }}
                      className="w-full py-3 text-white/60 text-sm hover:text-white/80 transition-colors"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[10000] bg-black" />

          <Dialog.Content
            className="fixed inset-0 z-[10001] flex flex-col bg-black min-h-[100dvh]"
            style={{ height: '100dvh' }}
            dir="rtl"
          >
            {/* Accessibility: Hidden title and description */}
            <VisuallyHidden>
              <Dialog.Title>סריקת ברקוד</Dialog.Title>
              <Dialog.Description>
                לסריקת ברקוד, כוון את המצלמה אל הקוד. או הקלד את מספר הברקוד ידנית.
              </Dialog.Description>
            </VisuallyHidden>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+16px)]">
            <Dialog.Close asChild>
              <button
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
                aria-label="סגור"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </Dialog.Close>

            <h2 className="text-xl font-bold text-white">
              {mode === 'scan' ? 'סריקת ברקוד' : 'הקלדה ידנית'}
            </h2>

            {mode === 'scan' ? (
              <div className="flex gap-2">
                {cameras.length > 1 && (
                  <button
                    onClick={handleSwitchCamera}
                    className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
                    aria-label="החלף מצלמה"
                  >
                    <SwitchCamera className="w-5 h-5 text-white" />
                  </button>
                )}

                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
                    aria-label={torchEnabled ? 'כבה פנס' : 'הדלק פנס'}
                  >
                    {torchEnabled ? (
                      <Flashlight className="w-5 h-5 text-[#E2F163]" />
                    ) : (
                      <FlashlightOff className="w-5 h-5 text-white" />
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="w-10 h-10" /> // Spacer to maintain layout
            )}
          </div>

          {/* Scanner Area */}
          <div className="relative flex-1">
            {mode === 'scan' ? (
              <>
                {/* Video Preview */}
                <video
                  ref={handleVideoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                  style={{
                    // iOS-specific: Ensure video has explicit dimensions
                    width: '100%',
                    height: '100%',
                    minWidth: '100%',
                    minHeight: '100%',
                    // iOS WebKit fix: Force hardware acceleration
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                  }}
                />

                {/* Scanner Frame */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-72 h-48">
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#E2F163]" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#E2F163]" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#E2F163]" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#E2F163]" />

                    {/* Scanning line animation */}
                    {isActive && (
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-[#E2F163]"
                        initial={{ top: '0%' }}
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-8 left-4 right-4 text-center">
                  <p className="text-white text-sm font-medium bg-black/50 backdrop-blur rounded-lg px-4 py-2 inline-block">
                    יש למקם את הברקוד בתוך המסגרת
                  </p>

                  {/* Hints after 3 seconds */}
                  <AnimatePresence>
                    {showHint && isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mt-2"
                      >
                        <p className="text-white/80 text-xs bg-black/30 backdrop-blur rounded px-3 py-1 inline-block">
                          טיפ: התקרב/י לברקוד או הגבר/י תאורה
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* Manual Entry Mode */
              <div className="absolute inset-0 overflow-y-auto">
                <div className="min-h-full flex items-center justify-center p-8 pb-[calc(env(safe-area-inset-bottom)+32px)]">
                  <div className="w-full max-w-md">
                    <div className="bg-neutral-900 rounded-2xl p-6 space-y-6">
                      {/* Icon */}
                      <div className="w-16 h-16 rounded-full bg-[#E2F163]/20 flex items-center justify-center mx-auto">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-8 h-8 text-[#E2F163]"
                        >
                          <path d="M3 5v14" />
                          <path d="M8 5v14" />
                          <path d="M12 5v14" />
                          <path d="M17 5v14" />
                          <path d="M21 5v14" />
                        </svg>
                      </div>

                      {/* Title */}
                      <div className="text-center">
                        <h3 className="text-white text-lg font-bold mb-2">הכנס ברקוד</h3>
                        <p className="text-white/60 text-sm">הקלד מספר ברקוד (EAN/UPC)</p>
                      </div>

                      {/* Input */}
                      <div className="space-y-2">
                        <input
                          ref={inputRef}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="1234567890123"
                          value={manualCode}
                          onChange={handleInputChange}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && manualCode.length >= 8 && status !== 'loading') {
                              handleManualSubmit();
                            }
                          }}
                          dir="ltr"
                          autoFocus
                          className="w-full px-4 py-3 bg-black/50 border border-neutral-700 rounded-xl text-white text-center text-lg font-mono focus:outline-none focus:border-[#E2F163] focus:ring-1 focus:ring-[#E2F163]"
                        />
                        <p className="text-white/40 text-xs text-center">
                          {manualCode.length > 0 ? `${manualCode.length} ספרות` : 'מינימום 8 ספרות'}
                        </p>

                        {/* Inline Error Message */}
                        {error && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 text-sm text-zinc-400 text-center leading-relaxed"
                            role="alert"
                            aria-live="polite"
                          >
                            {error.msg}
                          </motion.p>
                        )}
                      </div>

                      {/* Primary Button */}
                      <div className="space-y-3">
                        <button
                          onClick={handleManualSubmit}
                          disabled={manualCode.length < 8 || status === 'loading'}
                          className="w-full py-3 bg-[#E2F163] text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                        >
                          {status === 'loading' ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              מחפש...
                            </>
                          ) : (
                            'חפש מוצר'
                          )}
                        </button>

                        {/* Secondary Actions - Show on error */}
                        {status === 'error' && error?.code === 'not_found' && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2 pt-2"
                          >
                            {/* Primary: Scan another barcode */}
                            <button
                              onClick={() => {
                                console.log('[Scanner] Clearing to scan another barcode');
                                if (navigator.vibrate) {
                                  navigator.vibrate(30);
                                }
                                // Clear the current barcode and error
                                setManualCode('');
                                setStatus('idle');
                                setError(null);
                                lastToastRef.current = '';
                                // Focus the input for scanning another barcode
                                setTimeout(() => {
                                  inputRef.current?.focus();
                                }, 100);
                              }}
                              className="w-full py-2.5 bg-[#E2F163]/10 border border-[#E2F163]/30 rounded-xl text-[#E2F163] text-sm font-medium hover:bg-[#E2F163]/20 transition-colors"
                            >
                              סרוק ברקוד אחר
                            </button>
                            {/* Secondary: Food search */}
                            <button
                              onClick={() => {
                                console.log('[Scanner] Navigating to food search for barcode:', manualCode);
                                if (navigator.vibrate) {
                                  navigator.vibrate(30);
                                }
                                // Close scanner and navigate to search page with barcode link
                                onOpenChange(false);
                                router.push(`/nutrition/search?link=${manualCode}`);
                              }}
                              className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/80 text-sm font-medium hover:bg-white/10 transition-colors"
                            >
                              חיפוש לפי שם
                            </button>
                            {/* Tertiary: Manual product */}
                            <button
                              onClick={() => {
                                console.log('[Scanner] Opening manual product sheet for barcode:', manualCode);
                                if (navigator.vibrate) {
                                  navigator.vibrate(30);
                                }
                                setShowManualProductSheet(true);
                              }}
                              className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/80 text-sm font-medium hover:bg-white/10 transition-colors"
                            >
                              הוספת מוצר ידני
                            </button>
                          </motion.div>
                        )}

                        <button
                          onClick={handleSwitchToScan}
                          disabled={status === 'loading'}
                          className="w-full py-3 bg-white/10 backdrop-blur rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          חזרה לסריקה
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Overlays - only show in scan mode */}
            {mode === 'scan' && (
              <AnimatePresence>
                {/* Initializing */}
                {isInitializing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/80"
                  >
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 text-[#E2F163] animate-spin mx-auto mb-4" />
                      <p className="text-white">מפעיל מצלמה...</p>
                    </div>
                  </motion.div>
                )}

                {/* Permission Error */}
                {scannerStatus === 'no-permission' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/90 p-8"
                  >
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-white text-lg font-bold mb-2">אין הרשאה למצלמה</h3>
                      <p className="text-white/70 text-sm mb-4">
                        {/iPad|iPhone|iPod/.test(navigator.userAgent)
                          ? 'כדי לסרוק ברקודים, יש לאשר גישה למצלמה. לחצו "נסה שוב" ובחרו "אפשר" בחלון שיופיע. אם זה לא עובד, יתכן שתצטרכו לאפשר גישה למצלמה דרך הגדרות iOS → Safari → המצלמה.'
                          : 'כדי לסרוק ברקודים, עליך לאשר גישה למצלמה בהגדרות הדפדפן'}
                      </p>
                      {lastScannerError && (
                        <p className="text-white/50 text-xs mb-4 font-mono">
                          שגיאה: {lastScannerError}
                        </p>
                      )}
                      <div className="space-y-2">
                        <button
                          onClick={handleRetry}
                          className="w-full px-6 py-2 bg-[#E2F163] text-black rounded-lg font-semibold"
                        >
                          נסה שוב
                        </button>
                        <button
                          onClick={handleSwitchToManual}
                          className="w-full px-6 py-2 bg-white/10 text-white rounded-lg font-medium"
                        >
                          הקלדה ידנית במקום
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Not Supported Error */}
                {scannerStatus === 'not-supported' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/90 p-8"
                  >
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-orange-400" />
                      </div>
                      <h3 className="text-white text-lg font-bold mb-2">סריקה לא נתמכת</h3>
                      <p className="text-white/70 text-sm mb-4">
                        הסריקה באמצעות המצלמה אינה נתמכת בסביבה זו. השתמשו בהזנה ידנית של הברקוד.
                      </p>
                      {lastScannerError && (
                        <p className="text-white/50 text-xs mb-4 font-mono">
                          שגיאה: {lastScannerError}
                        </p>
                      )}
                      <button
                        onClick={handleSwitchToManual}
                        className="w-full px-6 py-2 bg-[#E2F163] text-black rounded-lg font-semibold"
                      >
                        הקלדה ידנית
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Other Errors */}
                {scannerStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/90 p-8"
                  >
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-orange-400" />
                      </div>
                      <h3 className="text-white text-lg font-bold mb-2">שגיאה</h3>
                      <p className="text-white/70 text-sm mb-4">
                        {scannerError || 'אירעה שגיאה בהפעלת המצלמה'}
                      </p>
                      {lastScannerError && (
                        <p className="text-white/50 text-xs mb-4 font-mono">
                          קוד שגיאה: {lastScannerError}
                        </p>
                      )}
                      <div className="space-y-2">
                        <button
                          onClick={handleRetry}
                          className="w-full px-6 py-2 bg-[#E2F163] text-black rounded-lg font-semibold"
                        >
                          נסה שוב
                        </button>
                        <button
                          onClick={handleSwitchToManual}
                          className="w-full px-6 py-2 bg-white/10 text-white rounded-lg font-medium"
                        >
                          הקלדה ידנית במקום
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Manual Entry Button - only show in scan mode */}
          {mode === 'scan' && (
            <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <button
                onClick={handleSwitchToManual}
                className="w-full py-3 bg-white/10 backdrop-blur rounded-xl text-white/80 font-medium"
              >
                הקלדה ידנית של ברקוד
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>

        {/* Manual Product Entry Sheet */}
        <ManualProductSheet
          open={showManualProductSheet}
          onOpenChange={setShowManualProductSheet}
          barcode={lastScannedBarcode || manualCode || undefined}
          onSuccess={(product) => {
            console.log('[Scanner] Manual product created:', product);
            // Close barcode scanner
            onOpenChange(false);
            // Call success callback to open NutritionFactsSheet
            if (onManualProductSuccess) {
              onManualProductSuccess(product);
            }
          }}
        />
      </Dialog.Root>

      {/* Not Found Dialog */}
      <AnimatePresence>
        {showNotFoundDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[20000] bg-black/80 backdrop-blur-sm"
              onClick={() => setShowNotFoundDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[20001] max-w-sm mx-auto bg-[#1a1b20] rounded-2xl border border-white/10 p-6"
              dir="rtl"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">המוצר לא נמצא</h3>
                <p className="text-white/70 mb-6">
                  הברקוד <span className="font-mono">{lastScannedBarcode}</span> לא נמצא במאגר שלנו
                </p>

                <div className="space-y-3">
                  {/* Primary action: Scan another */}
                  <button
                    onClick={() => {
                      console.log('[NotFoundDialog] Scan another barcode');
                      if (navigator.vibrate) {
                        navigator.vibrate(30);
                      }
                      setShowNotFoundDialog(false);
                      // Reset for new scan
                      startAttemptedRef.current = false;
                      setScannerStatus('idle');
                      setMode('scan');
                      // Restart scanning
                      setTimeout(() => {
                        startScanning();
                      }, 100);
                    }}
                    className="w-full py-3 bg-[#E2F163] text-black rounded-xl font-semibold hover:bg-[#d4e350] transition-colors"
                  >
                    סרוק ברקוד אחר
                  </button>

                  {/* Secondary action: Add manually */}
                  <button
                    onClick={() => {
                      console.log('[NotFoundDialog] Add manually');
                      if (navigator.vibrate) {
                        navigator.vibrate(30);
                      }
                      setShowNotFoundDialog(false);
                      setShowManualProductSheet(true);
                    }}
                    className="w-full py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
                  >
                    הוסף מוצר ידני
                  </button>

                  {/* Tertiary action: Cancel */}
                  <button
                    onClick={() => {
                      setShowNotFoundDialog(false);
                      onOpenChange(false);
                    }}
                    className="w-full py-3 text-white/60 text-sm hover:text-white/80 transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}