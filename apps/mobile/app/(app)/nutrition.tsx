import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, texts, typography, borderRadius, spacing } from '../../lib/theme';
import { Camera, ScanBarcode, Plus } from 'lucide-react-native';

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Day names in Hebrew
const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

// Circular progress component for calories
function CaloriesWidget({
  target,
  consumed,
}: {
  target: number;
  consumed: number;
}) {
  const remaining = Math.max(0, target - consumed);
  const percentage = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;

  return (
    <View style={styles.caloriesWidget}>
      <View style={styles.caloriesContent}>
        <View style={styles.caloriesInfo}>
          <Text style={styles.caloriesLabel}>{texts.nutrition.remaining}</Text>
          <Text style={styles.caloriesValue}>{remaining}</Text>
          <Text style={styles.caloriesUnit}>קק״ל</Text>
        </View>
        <View style={styles.caloriesRing}>
          {/* Simple ring representation */}
          <View style={[styles.ringOuter, { borderColor: `${colors.accent.primary}30` }]}>
            <View
              style={[
                styles.ringProgress,
                {
                  width: `${percentage}%`,
                  backgroundColor: colors.accent.primary,
                },
              ]}
            />
          </View>
        </View>
      </View>
      <View style={styles.caloriesRow}>
        <View style={styles.caloriesStat}>
          <Text style={styles.caloriesStatLabel}>{texts.nutrition.consumed}</Text>
          <Text style={styles.caloriesStatValue}>{consumed}</Text>
        </View>
        <View style={styles.caloriesStat}>
          <Text style={styles.caloriesStatLabel}>{texts.nutrition.target}</Text>
          <Text style={styles.caloriesStatValue}>{target}</Text>
        </View>
      </View>
    </View>
  );
}

// Macro card component
function MacroCard({
  label,
  consumed,
  target,
  color,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
}) {
  const percentage = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;

  return (
    <View style={styles.macroCard}>
      <View style={[styles.macroIcon, { backgroundColor: `${color}20` }]}>
        <View style={[styles.macroIconDot, { backgroundColor: color }]} />
      </View>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {consumed}
        <Text style={styles.macroUnit}>/{target}g</Text>
      </Text>
      <View style={styles.macroProgressBar}>
        <View
          style={[
            styles.macroProgressFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

// Week day selector
function WeekDaySelector({
  currentDayIndex,
  onDayChange,
}: {
  currentDayIndex: number;
  onDayChange: (index: number) => void;
}) {
  const today = new Date().getDay();

  return (
    <View style={styles.weekDaySelector}>
      {DAYS_HE.map((day, index) => {
        const isSelected = index === currentDayIndex;
        const isToday = index === today;

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayButton,
              isSelected && styles.dayButtonSelected,
            ]}
            onPress={() => onDayChange(index)}
          >
            <Text
              style={[
                styles.dayText,
                isSelected && styles.dayTextSelected,
                isToday && !isSelected && styles.dayTextToday,
              ]}
            >
              {day}
            </Text>
            {isToday && <View style={styles.todayDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function NutritionScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentDayIndex, setCurrentDayIndex] = useState(() => new Date().getDay());

  // Mock data for now - will be fetched from API later
  const [nutritionData, setNutritionData] = useState({
    targets: {
      calories: 2000,
      protein: 150,
      carbs: 250,
      fat: 65,
    },
    consumed: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  });

  useEffect(() => {
    loadNutritionData();
  }, [user, currentDayIndex]);

  const loadNutritionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch nutrition plan
      const { data: plan } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (plan) {
        setNutritionData(prev => ({
          ...prev,
          targets: {
            calories: plan.daily_calories || 2000,
            protein: plan.daily_protein || 150,
            carbs: plan.daily_carbs || 250,
            fat: plan.daily_fat || 65,
          },
        }));
      }

      // For now, consumed values remain at 0
      // TODO: Fetch logged meals for current day
    } catch (error) {
      console.error('Error loading nutrition data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{texts.nutrition.title}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Week Day Selector */}
        <View style={styles.section}>
          <WeekDaySelector
            currentDayIndex={currentDayIndex}
            onDayChange={setCurrentDayIndex}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.lime} />
          </View>
        ) : (
          <>
            {/* Calories Widget */}
            <View style={styles.section}>
              <CaloriesWidget
                target={nutritionData.targets.calories}
                consumed={nutritionData.consumed.calories}
              />
            </View>

            {/* Macro Cards */}
            <View style={styles.macroRow}>
              <MacroCard
                label={texts.nutrition.protein}
                consumed={nutritionData.consumed.protein}
                target={nutritionData.targets.protein}
                color={colors.accent.pink}
              />
              <MacroCard
                label={texts.nutrition.carbs}
                consumed={nutritionData.consumed.carbs}
                target={nutritionData.targets.carbs}
                color={colors.accent.orange}
              />
              <MacroCard
                label={texts.nutrition.fat}
                consumed={nutritionData.consumed.fat}
                target={nutritionData.targets.fat}
                color={colors.accent.blue}
              />
            </View>

            {/* Meals Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{texts.nutrition.meals}</Text>
              <View style={styles.emptyMeals}>
                <Text style={styles.emptyMealsText}>
                  עדיין לא הוספת ארוחות להיום
                </Text>
                <Text style={styles.emptyMealsSubtext}>
                  הוסף ארוחות כדי לעקוב אחר הצריכה שלך
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Add Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fabSecondary}>
          <ScanBarcode size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fabSecondary}>
          <Camera size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fabPrimary}>
          <Plus size={24} color={colors.background.primary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },

  // Week Day Selector
  weekDaySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  dayButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  dayButtonSelected: {
    backgroundColor: colors.accent.primary,
  },
  dayText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.tertiary,
  },
  dayTextSelected: {
    color: colors.background.primary,
    fontWeight: typography.weight.bold,
  },
  dayTextToday: {
    color: colors.accent.primary,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent.primary,
    marginTop: 2,
  },

  // Calories Widget
  caloriesWidget: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
  },
  caloriesContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  caloriesInfo: {
    flex: 1,
  },
  caloriesLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'right',
  },
  caloriesUnit: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  caloriesRing: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringOuter: {
    width: 100,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    overflow: 'hidden',
  },
  ringProgress: {
    height: '100%',
    borderRadius: 6,
  },
  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    paddingTop: spacing.md,
  },
  caloriesStat: {
    alignItems: 'center',
  },
  caloriesStatLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  caloriesStatValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  // Macro Cards
  macroRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
  },
  macroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  macroIconDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  macroLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  macroValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  macroUnit: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.normal,
    color: colors.text.tertiary,
  },
  macroProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border.primary,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Empty Meals
  emptyMeals: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyMealsText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyMealsSubtext: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: spacing['2xl'],
    left: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  fabPrimary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabSecondary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bottomSpacing: {
    height: 120,
  },
});
