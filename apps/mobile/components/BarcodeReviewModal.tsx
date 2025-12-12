/**
 * BarcodeReviewModal - Review and edit scanned product before saving
 * Allows serving size adjustment with automatic nutrition recalculation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Utensils,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Scale,
  Coffee,
  Sun,
  Moon,
  Cookie,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius } from '../lib/theme';
import type { BarcodeProduct } from '../types/barcode';

// Meal type icons and labels
const MEAL_TYPE_CONFIG = {
  breakfast: { label: 'Breakfast', Icon: Coffee },
  lunch: { label: 'Lunch', Icon: Sun },
  dinner: { label: 'Dinner', Icon: Moon },
  snack: { label: 'Snack', Icon: Cookie },
} as const;

type MealType = keyof typeof MEAL_TYPE_CONFIG;

// Quick serving presets
const SERVING_PRESETS = [
  { label: '50g', grams: 50 },
  { label: '100g', grams: 100 },
  { label: '150g', grams: 150 },
  { label: '200g', grams: 200 },
];

interface BarcodeReviewModalProps {
  visible: boolean;
  product: BarcodeProduct | null;
  mealType: MealType;
  onClose: () => void;
  onSave: (data: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealType: MealType;
    portion_grams: number;
    barcode?: string;
    brand?: string;
  }) => void;
  onRetry: () => void;
}

export function BarcodeReviewModal({
  visible,
  product,
  mealType,
  onClose,
  onSave,
  onRetry,
}: BarcodeReviewModalProps) {
  const [name, setName] = useState('');
  const [servingGrams, setServingGrams] = useState('100');
  const [selectedMealType, setSelectedMealType] = useState<MealType>(mealType);
  const [saving, setSaving] = useState(false);

  // Initialize form when product changes
  useEffect(() => {
    if (product) {
      // Prefer Hebrew name, fall back to English
      setName(product.name_he || product.name);
      setServingGrams(String(product.serving_grams || 100));
    }
  }, [product]);

  useEffect(() => {
    setSelectedMealType(mealType);
  }, [mealType]);

  // Calculate nutrition based on serving size
  const grams = parseInt(servingGrams) || 100;
  const multiplier = grams / 100;

  const calculated = product?.per100g ? {
    calories: Math.round((product.per100g.kcal || 0) * multiplier),
    protein: Math.round((product.per100g.protein_g || 0) * multiplier * 10) / 10,
    carbs: Math.round((product.per100g.carbs_g || 0) * multiplier * 10) / 10,
    fat: Math.round((product.per100g.fat_g || 0) * multiplier * 10) / 10,
  } : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const handleSave = async () => {
    if (!name.trim() || !product) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        calories: calculated.calories,
        protein: Math.round(calculated.protein),
        carbs: Math.round(calculated.carbs),
        fat: Math.round(calculated.fat),
        mealType: selectedMealType,
        portion_grams: grams,
        barcode: product.barcode,
        brand: product.brand,
      });
    } finally {
      setSaving(false);
    }
  };

  // Get source display label
  const getSourceLabel = (source?: string): string => {
    switch (source) {
      case 'israel_moh':
        return 'Israeli Ministry of Health';
      case 'off':
        return 'Open Food Facts';
      case 'fatsecret':
        return 'FatSecret';
      case 'cache':
        return 'Cached';
      default:
        return source || 'Unknown';
    }
  };

  if (!product) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <SafeAreaView style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Review Product</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={styles.headerButton}
            >
              <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
                {saving ? 'Adding...' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Product Image */}
            {product.imageUrl && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Source Badge */}
            {product.source && product.source !== 'not_found' && (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceText}>
                  Source: {getSourceLabel(product.source)}
                </Text>
              </View>
            )}

            {/* Partial Data Warning */}
            {product.isPartial && (
              <View style={styles.warningBadge}>
                <AlertTriangle size={16} color={colors.semantic.warning} />
                <Text style={styles.warningText}>
                  Nutrition data may be incomplete
                </Text>
              </View>
            )}

            {/* Product Name */}
            <View style={styles.inputCard}>
              <View style={styles.inputHeader}>
                <Utensils size={18} color={colors.accent.primary} />
                <Text style={styles.inputLabel}>Product Name</Text>
              </View>
              <TextInput
                style={styles.inputField}
                value={name}
                onChangeText={setName}
                placeholder="Product name"
                placeholderTextColor={colors.text.placeholder}
              />
              {product.brand && (
                <Text style={styles.brandText}>{product.brand}</Text>
              )}
              {product.barcode && (
                <Text style={styles.barcodeText}>Barcode: {product.barcode}</Text>
              )}
            </View>

            {/* Serving Size */}
            <View style={styles.inputCard}>
              <View style={styles.inputHeader}>
                <Scale size={18} color={colors.accent.primary} />
                <Text style={styles.inputLabel}>Serving Size</Text>
              </View>
              <View style={styles.servingRow}>
                <TextInput
                  style={styles.servingInput}
                  value={servingGrams}
                  onChangeText={setServingGrams}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor={colors.text.placeholder}
                />
                <Text style={styles.servingUnit}>grams</Text>
              </View>

              {/* Quick presets */}
              <View style={styles.presetsRow}>
                {SERVING_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.grams}
                    style={[
                      styles.presetButton,
                      parseInt(servingGrams) === preset.grams && styles.presetButtonActive,
                    ]}
                    onPress={() => setServingGrams(String(preset.grams))}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        parseInt(servingGrams) === preset.grams && styles.presetTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Meal Type Selector */}
            <Text style={styles.sectionLabel}>Meal Type</Text>
            <View style={styles.mealTypeRow}>
              {(Object.keys(MEAL_TYPE_CONFIG) as MealType[]).map((type) => {
                const { label, Icon } = MEAL_TYPE_CONFIG[type];
                const isSelected = selectedMealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypePill,
                      isSelected && styles.mealTypePillActive,
                    ]}
                    onPress={() => setSelectedMealType(type)}
                  >
                    <Icon
                      size={16}
                      color={isSelected ? colors.background.primary : colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.mealTypePillText,
                        isSelected && styles.mealTypePillTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calculated Nutrition */}
            <Text style={styles.sectionLabel}>
              Nutrition ({grams}g serving)
            </Text>

            {/* Calories */}
            <View style={styles.caloriesCard}>
              <Flame size={28} color={colors.accent.primary} />
              <Text style={styles.caloriesValue}>{calculated.calories}</Text>
              <Text style={styles.caloriesUnit}>kcal</Text>
            </View>

            {/* Macros */}
            <View style={styles.macrosRow}>
              <View style={styles.macroCard}>
                <Beef size={22} color={colors.accent.pink} />
                <Text style={styles.macroValue}>{calculated.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroCard}>
                <Wheat size={22} color={colors.accent.orange} />
                <Text style={styles.macroValue}>{calculated.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroCard}>
                <Droplet size={22} color={colors.accent.blue} />
                <Text style={styles.macroValue}>{calculated.fat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>

            {/* Per 100g reference */}
            <View style={styles.per100gCard}>
              <Text style={styles.per100gTitle}>Per 100g</Text>
              <Text style={styles.per100gText}>
                {product.per100g.kcal} kcal • {product.per100g.protein_g}g P • {product.per100g.carbs_g}g C • {product.per100g.fat_g}g F
              </Text>
            </View>

            {/* Retry Button */}
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <RefreshCw size={18} color={colors.text.secondary} />
              <Text style={styles.retryText}>Scan Different Barcode</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerButton: {
    minWidth: 60,
  },
  headerTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  saveText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.accent.primary,
    textAlign: 'right',
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  imageContainer: {
    height: 180,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: spacing.md,
  },
  sourceText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: spacing.md,
  },
  warningText: {
    color: colors.semantic.warning,
    fontSize: typography.size.sm,
  },
  inputCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputLabel: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
  },
  inputField: {
    color: colors.text.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    paddingVertical: spacing.xs,
  },
  brandText: {
    color: colors.text.tertiary,
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },
  barcodeText: {
    color: colors.text.muted,
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  servingInput: {
    color: colors.text.primary,
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    minWidth: 80,
  },
  servingUnit: {
    color: colors.text.secondary,
    fontSize: typography.size.lg,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  presetButton: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.input,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  presetText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  presetTextActive: {
    color: colors.background.primary,
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mealTypePill: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: spacing.sm,
  },
  mealTypePillActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  mealTypePillText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  mealTypePillTextActive: {
    color: colors.background.primary,
    fontWeight: typography.weight.semibold,
  },
  caloriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  caloriesValue: {
    fontSize: typography.size['4xl'],
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
  },
  caloriesUnit: {
    color: colors.text.secondary,
    fontSize: typography.size.lg,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  macroValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  macroLabel: {
    color: colors.text.tertiary,
    fontSize: typography.size.xs,
  },
  per100gCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  per100gTitle: {
    color: colors.text.tertiary,
    fontSize: typography.size.xs,
    marginBottom: spacing.xs,
  },
  per100gText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  retryText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});
