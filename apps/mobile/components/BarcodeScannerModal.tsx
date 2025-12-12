/**
 * BarcodeScannerModal - Full screen camera scanner for barcodes
 * Uses expo-camera with barcode scanning capabilities
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { X, Zap, ZapOff } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius } from '../lib/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_WINDOW_SIZE = Math.min(SCREEN_WIDTH * 0.75, 300);

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => void;
  isLoading?: boolean;
}

export function BarcodeScannerModal({
  visible,
  onClose,
  onBarcodeScanned,
  isLoading = false,
}: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Reset scanned state when modal opens
  useEffect(() => {
    if (visible) {
      setScanned(false);
    }
  }, [visible]);

  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (scanned || isLoading) return;

    const { data, type } = result;
    console.log('[Scanner] Detected:', type, data);

    // Only accept valid barcode types
    const validTypes = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'org.iso.QRCode'];
    if (!validTypes.some(t => type.toLowerCase().includes(t.toLowerCase()))) {
      console.log('[Scanner] Ignoring barcode type:', type);
      return;
    }

    setScanned(true);
    onBarcodeScanned(data);
  }, [scanned, isLoading, onBarcodeScanned]);

  // Handle permissions not loaded yet
  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </Modal>
    );
  }

  // Handle permission not granted
  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan barcodes and look up nutrition information for your food items.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
          }}
          onBarcodeScanned={scanned || isLoading ? undefined : handleBarcodeScanned}
        />

        {/* Overlay with scanning area */}
        <View style={styles.overlay}>
          {/* Top dark area */}
          <View style={styles.overlayTop}>
            {/* Header Controls */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Scan Barcode</Text>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setTorch(!torch)}
              >
                {torch ? (
                  <ZapOff size={24} color={colors.accent.primary} />
                ) : (
                  <Zap size={24} color={colors.text.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Middle row with scanning window */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanWindow}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <View style={styles.overlaySide} />
          </View>

          {/* Bottom dark area */}
          <View style={styles.overlayBottom}>
            <Text style={styles.instructionText}>
              {isLoading
                ? 'Looking up product...'
                : 'Point camera at barcode'}
            </Text>
            {isLoading && (
              <ActivityIndicator
                color={colors.accent.primary}
                style={styles.loader}
                size="large"
              />
            )}
            <Text style={styles.hintText}>
              Supports EAN-13, EAN-8, UPC codes
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  scanWindow: {
    width: SCAN_WINDOW_SIZE,
    height: SCAN_WINDOW_SIZE,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.accent.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: borderRadius.lg,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: borderRadius.lg,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: borderRadius.lg,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: borderRadius.lg,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    minHeight: 200,
  },
  instructionText: {
    color: colors.text.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  hintText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  loader: {
    marginTop: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    marginTop: spacing.lg,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  permissionTitle: {
    color: colors.text.primary,
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  permissionText: {
    color: colors.text.secondary,
    fontSize: typography.size.base,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: colors.background.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  cancelButton: {
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
  },
});
