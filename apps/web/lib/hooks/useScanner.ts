/**
 * useScanner Hook
 * Manages barcode scanning with ZXing and camera permissions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Result } from '@zxing/library';

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
  hasTorch: boolean;
  torchEnabled: boolean;
  cameras: CameraDevice[];
  activeDeviceId: string | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  toggleTorch: () => Promise<void>;
  setActiveDevice: (deviceId: string) => void;
  hasPermission: boolean;
}

export function useScanner({
  onDetected,
  throttleMs = 1500,
}: UseScannerOptions = {}): UseScannerReturn {
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

    setIsInitializing(true);
    setError(null);

    try {
      // Request permission and enumerate cameras
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      tempStream.getTracks().forEach(track => track.stop());
      setHasPermission(true);

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

      // Start decoding and store the controls
      const controls = await reader.decodeFromConstraints(
        constraints,
        videoRef.current!,
        (result: Result | undefined, error: Error | undefined) => {
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

      // Get stream for torch control
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      await checkTorchCapability(stream);

      setIsActive(true);
      setError(null);
      console.log('[Scanner] Started successfully');
    } catch (err: any) {
      console.error('[Scanner] Start error:', err);

      if (err.name === 'NotAllowedError') {
        setError('אין הרשאה למצלמה');
        setHasPermission(false);
      } else if (err.name === 'NotFoundError') {
        setError('לא נמצאה מצלמה');
      } else {
        setError('שגיאה בהפעלת המצלמה');
      }
    } finally {
      setIsInitializing(false);
    }
  }, [isActive, isInitializing, activeDeviceId, throttleMs, enumerateCameras, checkTorchCapability, onDetected]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    // Stop the ZXing decoder using the controls
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
  }, []);

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
    hasTorch,
    torchEnabled,
    cameras,
    activeDeviceId,
    hasPermission,
    startScanning,
    stopScanning,
    toggleTorch,
    setActiveDevice: setActiveDeviceId,
    setVideoElement,
  } as UseScannerReturn & { setVideoElement: (element: HTMLVideoElement | null) => void };
}