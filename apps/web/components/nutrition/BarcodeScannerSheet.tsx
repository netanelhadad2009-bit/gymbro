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
import { useScanner } from '@/lib/hooks/useScanner';
import { useToast } from '@/components/ui/use-toast';
import * as Dialog from '@radix-ui/react-dialog';
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
  const hintTimerRef = useRef<NodeJS.Timeout>();

  const stoppedRef = useRef(false); // Prevent double stops
  const lastToastRef = useRef<string>(''); // Prevent duplicate toasts
  const { toast } = useToast();

  // Log props for debugging
  useEffect(() => {
    console.log('[BarcodeScannerSheet] Props received:', {
      hasOnDetected: !!onDetected,
      onDetectedType: typeof onDetected,
    });
  }, [onDetected]);

  const scanner = useScanner({
    onDetected: async (barcode) => {
      console.log('[Scanner] Camera detection:', barcode);
      // Haptic feedback on detection
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      const result = await onDetected(barcode);
      // Only close if successful
      if (!result || result.ok === true) {
        onOpenChange(false);
      } else {
        // Show toast for camera scan errors
        toast({
          title: "שגיאה",
          description: result.message || "לא ניתן לזהות את הברקוד",
          variant: "destructive",
        });
      }
    },
  });

  const {
    isActive,
    isInitializing,
    error: scannerError,
    hasTorch,
    torchEnabled,
    cameras,
    activeDeviceId,
    hasPermission,
    startScanning,
    stopScanning,
    toggleTorch,
    setActiveDevice,
  } = scanner;

  // Type assertion to access setVideoElement if it exists
  const setVideoElement = (scanner as any).setVideoElement;

  // Safe stop function to prevent double stops
  const stopScannerOnce = useCallback(() => {
    if (!stoppedRef.current && isActive) {
      stoppedRef.current = true;
      console.log('[Scanner] Stopping scanner');
      stopScanning();
    }
  }, [isActive, stopScanning]);

  // Start scanning when opened
  useEffect(() => {
    stoppedRef.current = false; // Reset when mode/open changes

    if (open && mode === 'scan') {
      startScanning();
      // Show hint after 3 seconds
      hintTimerRef.current = setTimeout(() => {
        setShowHint(true);
      }, 3000);
    } else {
      stopScannerOnce();
      setShowHint(false);
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    }

    // Reset state when closing
    if (!open) {
      setMode('scan');
      setManualCode('');
      setStatus('idle');
      setError(null);
      lastToastRef.current = '';
    }

    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, [open, mode, startScanning, stopScannerOnce]);

  // Set video element ref
  useEffect(() => {
    if (setVideoElement) {
      setVideoElement(videoRef.current);
    }
  }, [setVideoElement]);

  // Auto-focus input when switching to manual mode
  useEffect(() => {
    if (mode === 'manual' && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [mode]);

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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black" />

        <Dialog.Content
          className="fixed inset-0 z-[201] flex flex-col bg-black min-h-[100dvh]"
          style={{ height: '100dvh' }}
          dir="rtl"
        >
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
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
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
                            {/* Primary: Food search */}
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
                              className="w-full py-2.5 bg-[#E2F163]/10 border border-[#E2F163]/30 rounded-xl text-[#E2F163] text-sm font-medium hover:bg-[#E2F163]/20 transition-colors"
                            >
                              חיפוש לפי שם
                            </button>
                            {/* Secondary: Manual product */}
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
                {!hasPermission && scannerError && (
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
                        כדי לסרוק ברקודים, עליך לאשר גישה למצלמה בהגדרות הדפדפן
                      </p>
                      <button
                        onClick={() => {
                          // Try again
                          startScanning();
                        }}
                        className="px-6 py-2 bg-[#E2F163] text-black rounded-lg font-semibold"
                      >
                        נסה שוב
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Other Errors */}
                {hasPermission && scannerError && (
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
                      <p className="text-white/70 text-sm mb-4">{scannerError}</p>
                      <button
                        onClick={() => startScanning()}
                        className="px-6 py-2 bg-[#E2F163] text-black rounded-lg font-semibold"
                      >
                        נסה שוב
                      </button>
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
        barcode={error?.code === 'not_found' ? manualCode : undefined}
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
  );
}