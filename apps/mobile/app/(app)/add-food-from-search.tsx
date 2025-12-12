import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  X,
  Utensils,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Coffee,
  Sun,
  Moon,
  Cookie,
} from 'lucide-react-native';
import type { FoodSearchResult, ServingOption } from '../../types/food-search';
import { colors, spacing, typography, borderRadius } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const MEAL_TYPE_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

const MEAL_TYPE_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function AddFoodFromSearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { foodData } = useLocalSearchParams();

  if (!foodData || typeof foodData !== 'string') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invalid food data</Text>
      </View>
    );
  }

  const food: FoodSearchResult = JSON.parse(foodData);

  const [customGrams, setCustomGrams] = useState<string>('100');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [saving, setSaving] = useState(false);

  // Calculate nutrition based on custom grams
  const calculatedNutrition = useMemo(() => {
    const grams = parseFloat(customGrams) || 100;
    const factor = grams / 100;

    return {
      grams,
      kcal: Math.round(food.per100g.kcal * factor),
      protein_g: Math.round(food.per100g.protein_g * factor * 10) / 10,
      carbs_g: Math.round(food.per100g.carbs_g * factor * 10) / 10,
      fat_g: Math.round(food.per100g.fat_g * factor * 10) / 10,
    };
  }, [customGrams, food.per100g]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add meals');
      return;
    }

    setSaving(true);

    try {
      // Save meal to meals table
      const { error } = await supabase.from('meals').insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        name: food.name,
        calories: calculatedNutrition.kcal,
        protein: Math.round(calculatedNutrition.protein_g),
        carbs: Math.round(calculatedNutrition.carbs_g),
        fat: Math.round(calculatedNutrition.fat_g),
        meal_type: mealType,
        source: 'manual',
        portion_grams: calculatedNutrition.grams,
        brand: food.brand || null,
      });

      if (error) throw error;

      // Save to user's personal food database
      try {
        // Check if food already exists
        const { data: existing } = await supabase
          .from('user_foods')
          .select('id')
          .eq('user_id', user.id)
          .eq('name_he', food.name)
          .eq('brand', food.brand || '')
          .maybeSingle();

        if (existing) {
          // Food already exists, just update created_at to move to top of recent
          await supabase
            .from('user_foods')
            .update({ created_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          // Insert new food
          await supabase.from('user_foods').insert({
            user_id: user.id,
            name_he: food.name,
            brand: food.brand || null,
            serving_grams: 100,
            per_100g: {
              kcal: food.per100g.kcal,
              protein_g: food.per100g.protein_g,
              carbs_g: food.per100g.carbs_g,
              fat_g: food.per100g.fat_g,
            },
            is_verified: false,
          });
        }
      } catch (userFoodError) {
        console.error('[AddFood] Error saving to user_foods:', userFoodError);
        // Don't fail the whole operation if user_foods fails
      }

      // Navigate back to search screen
      router.push('/(app)/food-search');

      Alert.alert('Success', 'Food added to your diary');
    } catch (error) {
      console.error('[AddFood] Error saving meal:', error);
      Alert.alert('Error', 'Failed to add food. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/(app)/food-search')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Food</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Meal Type Selector - Premium Pills */}
        <Text style={styles.inputLabel}>Meal Type</Text>
        <View style={styles.mealTypeSelectorPremium}>
          {(Object.keys(MEAL_TYPE_LABELS) as Array<keyof typeof MEAL_TYPE_LABELS>).map((type) => {
            const Icon = MEAL_TYPE_ICONS[type];
            const isSelected = mealType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.mealTypePill,
                  isSelected && styles.mealTypePillSelected,
                ]}
                onPress={() => setMealType(type)}
                activeOpacity={0.7}
              >
                <Icon
                  size={20}
                  color={isSelected ? colors.background.primary : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.mealTypePillText,
                    isSelected && styles.mealTypePillTextSelected,
                  ]}
                >
                  {MEAL_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Food Name - Premium Card */}
        <View style={styles.inputCard}>
          <View style={styles.inputCardHeader}>
            <Utensils size={18} color={colors.accent.primary} />
            <Text style={styles.inputCardLabel}>Food Name</Text>
          </View>
          <Text style={styles.foodNameText}>{food.name_he || food.name}</Text>
          {food.brand && <Text style={styles.foodBrandText}>{food.brand}</Text>}
          {food.isPartial && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                ⚠️ This food has incomplete nutrition data
              </Text>
            </View>
          )}
        </View>

        {/* Manual Quantity Input */}
        <Text style={styles.sectionTitle}>Quantity (grams)</Text>
        <View style={styles.quantityInputContainer}>
          <TextInput
            style={styles.quantityInput}
            value={customGrams}
            onChangeText={setCustomGrams}
            keyboardType="numeric"
            placeholder="Enter grams"
            placeholderTextColor={colors.text.placeholder}
          />
          <Text style={styles.quantityUnit}>g</Text>
        </View>

        {/* Quick quantity buttons */}
        <View style={styles.quickQuantityGrid}>
          {[50, 100, 150, 200, 250].map((grams) => (
            <TouchableOpacity
              key={grams}
              style={[
                styles.quickQuantityPill,
                customGrams === String(grams) && styles.quickQuantityPillSelected,
              ]}
              onPress={() => setCustomGrams(String(grams))}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.quickQuantityText,
                  customGrams === String(grams) && styles.quickQuantityTextSelected,
                ]}
              >
                {grams}g
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nutrition Info */}
        <Text style={styles.macroSectionTitle}>Nutrition Info</Text>

        {/* Calories - Hero Card */}
        <View style={styles.caloriesCard}>
          <View style={styles.caloriesLeft}>
            <Flame size={24} color={colors.accent.primary} />
            <Text style={styles.caloriesLabel}>Calories</Text>
          </View>
          <View style={styles.caloriesRight}>
            <Text style={styles.caloriesValue}>{calculatedNutrition.kcal}</Text>
            <Text style={styles.caloriesUnit}>kcal</Text>
          </View>
        </View>

        {/* Macros Grid */}
        <View style={styles.macroGrid}>
          <View style={styles.macroCard}>
            <View style={[styles.macroIcon, { backgroundColor: 'rgba(201, 69, 108, 0.2)' }]}>
              <Beef size={18} color={colors.accent.pink} />
            </View>
            <Text style={styles.macroLabel}>Protein</Text>
            <View style={styles.macroValueRow}>
              <Text style={styles.macroValue}>{calculatedNutrition.protein_g}</Text>
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>

          <View style={styles.macroCard}>
            <View style={[styles.macroIcon, { backgroundColor: 'rgba(255, 168, 86, 0.2)' }]}>
              <Wheat size={18} color={colors.accent.orange} />
            </View>
            <Text style={styles.macroLabel}>Carbs</Text>
            <View style={styles.macroValueRow}>
              <Text style={styles.macroValue}>{calculatedNutrition.carbs_g}</Text>
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>

          <View style={styles.macroCard}>
            <View style={[styles.macroIcon, { backgroundColor: 'rgba(91, 155, 255, 0.2)' }]}>
              <Droplet size={18} color={colors.accent.blue} />
            </View>
            <Text style={styles.macroLabel}>Fat</Text>
            <View style={styles.macroValueRow}>
              <Text style={styles.macroValue}>{calculatedNutrition.fat_g}</Text>
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: spacing['4xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  saveText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.accent.primary,
  },
  saveTextDisabled: {
    color: colors.text.tertiary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealTypeSelectorPremium: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  mealTypePill: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  mealTypePillSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  mealTypePillText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  mealTypePillTextSelected: {
    color: colors.background.primary,
    fontWeight: typography.weight.semibold,
  },
  inputCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inputCardLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  foodNameText: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  foodBrandText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  warningBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningText: {
    fontSize: typography.size.xs,
    color: colors.semantic.warning,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  quantityInput: {
    flex: 1,
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    padding: spacing.sm,
  },
  quantityUnit: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  quickQuantityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickQuantityPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    minWidth: '18%',
    alignItems: 'center',
  },
  quickQuantityPillSelected: {
    backgroundColor: `${colors.accent.primary}15`,
    borderColor: colors.accent.primary,
  },
  quickQuantityText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  quickQuantityTextSelected: {
    color: colors.accent.primary,
    fontWeight: typography.weight.semibold,
  },
  macroSectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caloriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  caloriesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  caloriesLabel: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  caloriesRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  caloriesValue: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
  },
  caloriesUnit: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  macroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  macroLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  macroValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  macroUnit: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.size.base,
    color: colors.semantic.error,
    textAlign: 'center',
    padding: spacing['2xl'],
  },
});
