/**
 * useScanner Hook
 * Manages barcode scanning with ZXing and camera permissions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Result } from '@zxing/library';
import { Capacitor } from '@capacitor/core';
// BarcodeScanner is imported dynamically only in native mode to avoid SSR build issues

export type ScannerErrorCode = 'NO_PERMISSION' | 'PERMISSION_DENIED' | 'NOT_SUPPORTED' | 'NO_CAMERA' | 'UNKNOWN';

export interface ScannerError {
  code: ScannerErrorCode;
  message: string;
  original?: unknown;
}

export interface UseScannerOptions {
  onDetected?: (barcode: string) => void;
  throttleMs?: number;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface UseScannerReturn {
  isActive: boolean;
  isInitializing: boolean;
  lastBarcode: string | null;
  error: string | null;
  errorCode: ScannerErrorCode | null;
  hasTorch: boolean;
  torchEnabled: boolean;
  cameras: CameraDevice[];
  activeDeviceId: string | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  toggleTorch: () => Promise<void>;
  setActiveDevice: (deviceId: string) => void;
  hasPermission: boolean;
  isNative: boolean;
}

/**
 * Normalize scanner errors into a standardized format
 */
function normalizeScannerError(err: unknown): ScannerError {
  const errObj = err as any;

  // Check if getUserMedia is not supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      code: 'NOT_SUPPORTED',
      message: 'Camera API is not supported in this browser/environment',
      original: err,
    };
  }

  // Handle DOMException errors
  if (errObj?.name === 'NotAllowedError') {
    return {
      code: 'PERMISSION_DENIED',
      message: 'Camera permission was denied',
      original: err,
    };
  }

  if (errObj?.name === 'NotFoundError' || errObj?.name === 'DevicesNotFoundError') {
    return {
      code: 'NO_CAMERA',
      message: 'No camera device found',
      original: err,
    };
  }

  if (errObj?.name === 'NotReadableError' || errObj?.name === 'TrackStartError') {
    return {
      code: 'NO_PERMISSION',
      message: 'Camera is already in use or not accessible',
      original: err,
    };
  }

  // Check message for permission-related keywords
  const message = errObj?.message?.toLowerCase() || '';
  if (message.includes('permission') || message.includes('denied') || message.includes('allowed')) {
    return {
      code: 'PERMISSION_DENIED',
      message: errObj?.message || 'Camera permission denied',
      original: err,
    };
  }

  // Unknown error
  return {
    code: 'UNKNOWN',
    message: errObj?.message || 'Unknown scanner error',
    original: err,
  };
}

export function useScanner({
  onDetected,
  throttleMs = 1500,
}: UseScannerOptions = {}): UseScannerReturn {
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ScannerErrorCode | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanRef = useRef<number>(0);
  const controlsRef = useRef<any>(null); // Store the controls returned by ZXing
  const capacitorListenerRef = useRef<any>(null); // Store Capacitor listener

  // Check if we're running in a native Capacitor environment
  const isNative = Capacitor.isNativePlatform();
  console.log('[useScanner] 🔍 Platform detection:', {
    isNative,
    isNativePlatform: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
    hasCapacitor: typeof window !== 'undefined' && !!(window as any).Capacitor,
  });

  // Enumerate cameras
  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `מצלמה ${index + 1}`,
        }));

      setCameras(videoDevices);

      // Prefer back camera on mobile
      const backCamera = videoDevices.find(
        d => d.label.toLowerCase().includes('back') ||
             d.label.toLowerCase().includes('environment')
      );

      if (backCamera && !activeDeviceId) {
        setActiveDeviceId(backCamera.deviceId);
      } else if (videoDevices.length > 0 && !activeDeviceId) {
        setActiveDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('[Scanner] Failed to enumerate cameras:', err);
    }
  }, [activeDeviceId]);

  // Check torch capability
  const checkTorchCapability = useCallback(async (stream: MediaStream) => {
    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) return;

      // @ts-ignore - ImageCapture might not be in TypeScript definitions
      if (typeof ImageCapture !== 'undefined') {
        // @ts-ignore
        const imageCapture = new ImageCapture(videoTrack);
        const capabilities = await imageCapture.getPhotoCapabilities();
        setHasTorch(capabilities.fillLightMode?.includes('flash') || false);
      } else {
        // Fallback: check if torch constraint is supported
        const constraints = videoTrack.getCapabilities?.() as any;
        setHasTorch(constraints?.torch || false);
      }
    } catch (err) {
      console.log('[Scanner] Torch not supported:', err);
      setHasTorch(false);
    }
  }, []);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !hasTorch) return;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack) return;

      const newState = !torchEnabled;

      await videoTrack.applyConstraints({
        // @ts-ignore
        advanced: [{ torch: newState }],
      });

      setTorchEnabled(newState);
      console.log('[Scanner] Torch toggled:', newState);
    } catch (err) {
      console.error('[Scanner] Failed to toggle torch:', err);
    }
  }, [hasTorch, torchEnabled]);

  // Start scanning
  const startScanning = useCallback(async () => {
    if (isActive || isInitializing) return;

    console.log('[Scanner] Starting scan process...', { isNative });
    setIsInitializing(true);
    setError(null);
    setErrorCode(null);

    try {
      // ==================== NATIVE (Capacitor) MODE ====================
      if (isNative) {
        console.log('[Scanner] Using Capacitor BarcodeScanner (native mode with scan())');

        // Access BarcodeScanner via Capacitor's global plugin registry
        // The npm import is ignored during build (via IgnorePlugin) to avoid bundling issues
        // In native app, plugins are available globally via Capacitor
        let BarcodeScanner;
        try {
          // Try dynamic import first (works if module is available)
          const module = await import('@capacitor-mlkit/barcode-scanning');
          BarcodeScanner = module.BarcodeScanner;
          console.log('[Scanner] Loaded BarcodeScanner via npm import');
        } catch (importError: any) {
          console.log('[Scanner] npm import failed, trying global Capacitor registry:', importError?.message);
          // Fallback: Access via Capacitor's global plugin registry
          // The plugin should be registered by the native app
          BarcodeScanner = (window as any).Capacitor?.Plugins?.BarcodeScanner;

          if (!BarcodeScanner) {
            console.error('[Scanner] BarcodeScanner not found in Capacitor.Plugins');
            throw new Error('Barcode scanner plugin not available. Make sure @capacitor-mlkit/barcode-scanning is installed.');
          }
          console.log('[Scanner] Loaded BarcodeScanner from global registry');
        }

        // Use scan() method which shows a ready-to-use modal interface
        // This is simpler and more reliable than startScan()
        const result = await BarcodeScanner.scan();
        console.log('[Scanner] Scan result:', result);

        if (result.barcodes && result.barcodes.length > 0) {
          const barcode = result.barcodes[0].displayValue;
          console.log('[Scanner] Capacitor detected:', barcode);
          setLastBarcode(barcode);
          setHasPermission(true);
          setIsActive(false); // Mark as inactive since scan is complete

          // Call the detection callback
          onDetected?.(barcode);
        } else {
          console.log('[Scanner] No barcode detected');
          setIsActive(false);
        }

        console.log('[Scanner] ✅ Capacitor scanner completed');
      }
      // ==================== WEB MODE ====================
      else {
        // Verify video element exists
        if (!videoRef.current) {
          const normalizedError = normalizeScannerError(new Error('Video element not available'));
          console.error('[Scanner] ❌ Start error:', normalizedError.message, {
            code: normalizedError.code,
          });
          setError('Video element not ready');
          setErrorCode('UNKNOWN');
          throw normalizedError;
        }

        console.log('[Scanner] Video element ready:', {
          width: videoRef.current.offsetWidth,
          height: videoRef.current.offsetHeight,
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight,
        });

        // Request permission and enumerate cameras
        // This will trigger the browser's native permission dialog
        console.log('[Scanner] Requesting camera permission...');

        // Check if API is available before calling it
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('MediaDevices API not supported');
        }

        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        tempStream.getTracks().forEach(track => track.stop());
        setHasPermission(true);
        console.log('[Scanner] Camera permission granted');

        await enumerateCameras();

        // Initialize reader
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        // Start decoding
        const constraints = {
          video: activeDeviceId
            ? { deviceId: { exact: activeDeviceId } }
            : { facingMode: 'environment' },
        };

        console.log('[Scanner] Starting ZXing decoder with constraints:', constraints);

        // Start decoding and store the controls
        const controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result: Result | undefined) => {
            if (result) {
              const now = Date.now();
              if (now - lastScanRef.current > throttleMs) {
                const barcode = result.getText();
                console.log('[Scanner] Detected:', barcode);
                setLastBarcode(barcode);
                lastScanRef.current = now;
                onDetected?.(barcode);
              }
            }
          }
        );

        // Store the controls for later cleanup
        controlsRef.current = controls;
        console.log('[Scanner] ZXing decoder started successfully');

        // iOS-specific: Explicitly call play() on the video element
        // iOS WebKit sometimes needs this even with autoPlay attribute
        if (videoRef.current && videoRef.current.paused) {
          try {
            await videoRef.current.play();
            console.log('[Scanner] Video.play() called successfully (iOS fix)');
          } catch (playErr) {
            console.warn('[Scanner] Video.play() failed (non-critical):', playErr);
          }
        }

        // Get the stream from the video element (ZXing already attached it)
        // This avoids creating a duplicate stream
        const videoStream = videoRef.current.srcObject as MediaStream;
        if (videoStream) {
          streamRef.current = videoStream;
          console.log('[Scanner] Using stream from video element:', {
            streamId: videoStream.id,
            tracks: videoStream.getTracks().length,
            videoTracks: videoStream.getVideoTracks().length,
          });

          // Check torch capability using the existing stream
          await checkTorchCapability(videoStream);
        } else {
          console.warn('[Scanner] No stream found on video element after ZXing setup');
        }

        // Verify video is actually playing
        setTimeout(() => {
          if (videoRef.current) {
            console.log('[Scanner] Video state check:', {
              srcObject: !!videoRef.current.srcObject,
              paused: videoRef.current.paused,
              readyState: videoRef.current.readyState,
              videoWidth: videoRef.current.videoWidth,
              videoHeight: videoRef.current.videoHeight,
              currentTime: videoRef.current.currentTime,
            });

            // iOS-specific: If video still has no dimensions, something went wrong
            if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
              console.error('[Scanner] ⚠️ iOS Issue: Video has no dimensions. Stream may not be rendering.');
            }
          }
        }, 1000);

        setIsActive(true);
        setError(null);
        setErrorCode(null);
        console.log('[Scanner] ✅ Web scanner started successfully');
      } // End of web mode else block
    } catch (err: any) {
      const normalizedError = normalizeScannerError(err);

      console.error('[Scanner] ❌ Start error:', err, {
        name: err?.name,
        message: err?.message,
        code: normalizedError.code,
        normalizedMessage: normalizedError.message,
      });

      // Update state based on error type
      setError(normalizedError.message);
      setErrorCode(normalizedError.code);

      if (normalizedError.code === 'PERMISSION_DENIED' || normalizedError.code === 'NO_PERMISSION') {
        setHasPermission(false);
      }

      // Re-throw the normalized error for the UI to handle
      throw normalizedError;
    } finally {
      setIsInitializing(false);
    }
  }, [isActive, isInitializing, activeDeviceId, throttleMs, enumerateCameras, checkTorchCapability, onDetected, isNative]);

  // Stop scanning
  const stopScanning = useCallback(async () => {
    console.log('[Scanner] Stopping...', { isNative });

    // For native mode with scan(), there's nothing to stop - it's a modal that closes automatically
    // Just clean up state
    if (isNative) {
      console.log('[Scanner] Native scanner - no cleanup needed (scan() method)');
    }

    // Stop the ZXing decoder using the controls (web mode)
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
        controlsRef.current = null;
      } catch (err) {
        console.error('[Scanner] Error stopping controls:', err);
      }
    }

    // Clear the reader reference
    if (readerRef.current) {
      readerRef.current = null;
    }

    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Stop video element if it exists
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setTorchEnabled(false);
    setHasTorch(false);
    setError(null);
    console.log('[Scanner] Stopped');
  }, [isNative]);

  // Set video ref
  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    isActive,
    isInitializing,
    lastBarcode,
    error,
    errorCode,
    hasTorch,
    torchEnabled,
    cameras,
    activeDeviceId,
    hasPermission,
    isNative,
    startScanning,
    stopScanning,
    toggleTorch,
    setActiveDevice: setActiveDeviceId,
    setVideoElement,
  } as UseScannerReturn & { setVideoElement: (element: HTMLVideoElement | null) => void };
}