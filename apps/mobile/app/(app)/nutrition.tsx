import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
// Note: expo-image-picker and expo-image-manipulator require a development build
// They don't work in Expo Go. We'll import them dynamically when needed.
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { analyzeVisionMeal, VisionMealResult, lookupBarcode, BarcodeProduct } from '../../lib/api';
import { colors, texts, typography, borderRadius, spacing } from '../../lib/theme';
import { BarcodeScannerModal } from '../../components/BarcodeScannerModal';
import { BarcodeReviewModal } from '../../components/BarcodeReviewModal';
import {
  Camera,
  ScanBarcode,
  Plus,
  Check,
  X,
  Utensils,
  Coffee,
  Sun,
  Moon,
  Cookie,
  ChevronDown,
  Trash2,
  Edit3,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Image as ImageIcon,
  Search,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Day names in English (Sunday first)
const DAYS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Meal type icons
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

// Types
interface NutritionPlan {
  summary?: string;
  dailyTargets?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    water_l?: number;
  };
  days?: DayPlan[];
  tips?: string[];
}

interface DayPlan {
  day: number;
  meals: PlanMeal[];
}

interface PlanMeal {
  name: string;
  items?: { food: string; amount_g: number; notes?: string }[];
  macros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  prep?: string;
  swaps?: { option: string; equivalence_note: string }[];
}

interface UserMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'manual' | 'ai_vision' | 'plan';
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  portion_grams?: number;
  brand?: string;
  created_at: string;
  plan_meal_id?: string;
  image_url?: string;
  health_score?: number;
}

// Circular progress component for calories
function CaloriesWidget({
  target,
  consumed,
  onPress,
}: {
  target: number;
  consumed: number;
  onPress?: () => void;
}) {
  const caloriesLeft = target - consumed;
  const isOver = caloriesLeft < 0;
  const displayValue = Math.abs(caloriesLeft);
  const percentage = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;

  // SVG circle calculations - matching web
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <TouchableOpacity
      style={styles.caloriesWidget}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.caloriesContent}>
        {/* Text info */}
        <View style={styles.caloriesInfo}>
          <Text style={[styles.caloriesValue, isOver && styles.caloriesValueOver]}>
            {displayValue.toLocaleString()}
          </Text>
          <Text style={styles.caloriesLabel}>
            {isOver ? 'calories over target' : 'calories left today'}
          </Text>
        </View>

        {/* Circular progress with flame icon */}
        <View style={styles.caloriesRing}>
          <Svg width={size} height={size}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.text.tertiary}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isOver ? colors.semantic.error : colors.accent.primary}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          {/* Flame icon in center */}
          <View style={styles.caloriesIconContainer}>
            <Flame
              size={32}
              color={isOver ? colors.semantic.error : colors.accent.primary}
              fill={isOver ? colors.semantic.error : colors.accent.primary}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Macro card component with circular progress - matching web layout
function MacroCard({
  label,
  consumed,
  target,
  color,
  icon,
  onPress,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  const percentage = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const isOver = consumed > target;

  // SVG circle calculations - matching web size
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <TouchableOpacity
      style={styles.macroCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Value at top */}
      <Text style={styles.macroValue}>
        {consumed}
        <Text style={styles.macroUnit}>/{target}g</Text>
      </Text>

      {/* Label */}
      <Text style={styles.macroLabel}>{label}</Text>

      {/* Circular progress with icon */}
      <View style={styles.macroCircle}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border.primary}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isOver ? colors.semantic.error : color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {/* Icon in center */}
        <View style={styles.macroIconContainer}>
          {icon}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Dashed circle component for future days
function DashedCircle({ size = 44 }: { size?: number }) {
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashLength = 6;
  const gapLength = 4;

  return (
    <View style={{ position: 'absolute' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.text.tertiary}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${dashLength} ${gapLength}`}
        />
      </Svg>
    </View>
  );
}

// Week day selector with circular design
function WeekDaySelector({
  currentDayIndex,
  onDayChange,
}: {
  currentDayIndex: number;
  onDayChange: (index: number) => void;
}) {
  const today = new Date();
  const todayDayOfWeek = today.getDay();

  // Calculate the start of the current week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - todayDayOfWeek);

  // Generate 7 days from Sunday to Saturday
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      index: i,
      dayName: DAYS_EN[i],
      dayNumber: date.getDate(),
      isToday: i === todayDayOfWeek,
      isFuture: i > todayDayOfWeek,
    };
  });

  return (
    <View style={styles.weekDaySelector}>
      {days.map((day) => {
        const isSelected = day.index === currentDayIndex;

        return (
          <TouchableOpacity
            key={day.index}
            style={styles.dayButtonContainer}
            onPress={() => onDayChange(day.index)}
            activeOpacity={0.7}
          >
            {/* Circular button */}
            <View style={styles.dayCircle}>
              {/* Show dashed circle for future unselected days */}
              {!isSelected && day.isFuture && <DashedCircle />}
              {/* Selected background */}
              {isSelected && <View style={styles.dayCircleSelectedBg} />}
              {/* Day letter */}
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                ]}
              >
                {day.dayName}
              </Text>
            </View>
            {/* Day number below */}
            <Text
              style={[
                styles.dayNumber,
                isSelected && styles.dayNumberSelected,
              ]}
            >
              {day.dayNumber}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Plan Meal Card with checkbox
function PlanMealCard({
  meal,
  isEaten,
  onToggle,
  mealIndex,
}: {
  meal: PlanMeal;
  isEaten: boolean;
  onToggle: () => void;
  mealIndex: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.planMealCard}>
      <TouchableOpacity
        style={styles.planMealHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isEaten && styles.checkboxChecked]}>
          {isEaten && <Check size={14} color={colors.background.primary} strokeWidth={3} />}
        </View>
        <View style={styles.planMealInfo}>
          <Text style={[styles.planMealName, isEaten && styles.planMealNameEaten]}>
            {meal.name}
          </Text>
          <Text style={styles.planMealMacros}>
            {meal.macros.calories} cal • {meal.macros.protein_g}g P • {meal.macros.carbs_g}g C • {meal.macros.fat_g}g F
          </Text>
        </View>
        {meal.items && meal.items.length > 0 && (
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            style={styles.expandButton}
          >
            <ChevronDown
              size={20}
              color={colors.text.secondary}
              style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {expanded && meal.items && (
        <View style={styles.planMealItems}>
          {meal.items.map((item, idx) => (
            <Text key={idx} style={styles.planMealItem}>
              • {item.food} ({item.amount_g}g)
            </Text>
          ))}
          {meal.prep && (
            <Text style={styles.planMealPrep}>{meal.prep}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// User Meal Card
function UserMealCard({
  meal,
  onDelete,
  onPress,
}: {
  meal: UserMeal;
  onDelete: () => void;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.userMealCard} onPress={onPress} activeOpacity={0.7}>
      {/* Meal Image Thumbnail */}
      {meal.image_url && (
        <Image
          source={{ uri: meal.image_url }}
          style={styles.userMealImage}
          resizeMode="cover"
        />
      )}
      <View style={[styles.userMealInfo, meal.image_url && styles.userMealInfoWithImage]}>
        <Text style={styles.userMealName} numberOfLines={2}>{meal.name}</Text>
        <Text style={styles.userMealMacros}>
          {meal.calories} cal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F
        </Text>
        {meal.portion_grams && (
          <Text style={styles.userMealPortion}>{meal.portion_grams}g</Text>
        )}
      </View>
      {/* Health Score Badge */}
      {meal.health_score !== undefined && meal.health_score !== null && (
        <View style={[
          styles.userMealHealthBadge,
          meal.health_score >= 70 ? styles.healthScoreGood :
          meal.health_score >= 40 ? styles.healthScoreMedium :
          styles.healthScoreLow
        ]}>
          <Text style={styles.userMealHealthText}>{Math.round(meal.health_score / 10)}/10</Text>
        </View>
      )}
      {/* Delete Button Only */}
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={styles.userMealDeleteButton}
      >
        <Trash2 size={18} color={colors.semantic.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// Meal Type Section - groups meals by type with add button
function MealTypeSection({
  mealType,
  meals,
  planMeal,
  isPlanMealEaten,
  onTogglePlanMeal,
  onAddMeal,
  onDeleteMeal,
  onEditMeal,
}: {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  meals: UserMeal[];
  planMeal?: PlanMeal;
  isPlanMealEaten?: boolean;
  onTogglePlanMeal?: () => void;
  onAddMeal: (type: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void;
  onDeleteMeal: (mealId: string) => void;
  onEditMeal: (meal: UserMeal) => void;
}) {
  const label = MEAL_TYPE_LABELS[mealType];
  const [expanded, setExpanded] = useState(false);

  // Calculate totals for this meal type (user meals + eaten plan meal)
  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.protein || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      fat: acc.fat + (meal.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Add plan meal to totals if eaten
  if (planMeal && isPlanMealEaten) {
    totals.calories += planMeal.macros.calories || 0;
    totals.protein += planMeal.macros.protein_g || 0;
    totals.carbs += planMeal.macros.carbs_g || 0;
    totals.fat += planMeal.macros.fat_g || 0;
  }

  const hasContent = meals.length > 0 || planMeal;

  return (
    <View style={styles.mealTypeSection}>
      {/* Title */}
      <Text style={styles.mealTypeSectionTitle}>{label}</Text>

      {/* Totals if meals exist */}
      {(meals.length > 0 || isPlanMealEaten) && (
        <Text style={styles.mealTypeSectionTotals}>
          {totals.calories} cal • {totals.protein}g P • {totals.carbs}g C • {totals.fat}g F
        </Text>
      )}

      {/* Plan meal card */}
      {planMeal && (
        <View style={styles.planMealInSection}>
          <TouchableOpacity
            style={styles.planMealRow}
            onPress={onTogglePlanMeal}
            activeOpacity={0.7}
          >
            <View style={[styles.planMealCheckbox, isPlanMealEaten && styles.planMealCheckboxChecked]}>
              {isPlanMealEaten && <Check size={14} color={colors.background.primary} strokeWidth={3} />}
            </View>
            <View style={styles.planMealInfo}>
              <Text style={[styles.planMealName, isPlanMealEaten && styles.planMealNameEaten]}>
                Suggested: {planMeal.name}
              </Text>
              <Text style={styles.planMealMacros}>
                {planMeal.macros.calories} cal • {planMeal.macros.protein_g}g P • {planMeal.macros.carbs_g}g C • {planMeal.macros.fat_g}g F
              </Text>
            </View>
            {planMeal.items && planMeal.items.length > 0 && (
              <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                style={styles.planMealExpandButton}
              >
                <ChevronDown
                  size={18}
                  color={colors.text.secondary}
                  style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {expanded && planMeal.items && (
            <View style={styles.planMealItems}>
              {planMeal.items.map((item, idx) => (
                <Text key={idx} style={styles.planMealItem}>
                  • {item.food} ({item.amount_g}g)
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* User meals list */}
      {meals.length > 0 && (
        <View style={styles.mealTypeSectionMeals}>
          {meals.map((meal) => (
            <UserMealCard
              key={meal.id}
              meal={meal}
              onDelete={() => onDeleteMeal(meal.id)}
              onPress={() => onEditMeal(meal)}
            />
          ))}
        </View>
      )}

      {/* Add button */}
      <TouchableOpacity
        style={styles.mealTypeSectionAddButton}
        onPress={() => onAddMeal(mealType)}
        activeOpacity={0.7}
      >
        <Plus size={18} color={colors.accent.primary} />
        <Text style={styles.mealTypeSectionAddText}>Add</Text>
      </TouchableOpacity>
    </View>
  );
}

// Add Meal Options Modal - shows 5 ways to add a meal
function AddMealOptionsModal({
  visible,
  onClose,
  mealType,
  onSelectOption,
}: {
  visible: boolean;
  onClose: () => void;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  onSelectOption: (option: 'barcode' | 'camera' | 'gallery' | 'database' | 'manual') => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.addOptionsOverlay}>
        <TouchableOpacity
          style={styles.addOptionsBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Floating Options Grid */}
        <View style={styles.addOptionsList}>
          {/* Row 1: Database | Scan */}
          <View style={styles.addOptionsRow}>
            <TouchableOpacity
              style={styles.addOptionItemSquare}
              onPress={() => {
                onClose();
                onSelectOption('database');
              }}
              activeOpacity={0.7}
            >
              <Search size={28} color={colors.accent.primary} />
              <Text style={styles.addOptionTitleSquare}>Food Database</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addOptionItemSquare}
              onPress={() => {
                onClose();
                onSelectOption('barcode');
              }}
              activeOpacity={0.7}
            >
              <ScanBarcode size={28} color={colors.accent.primary} />
              <Text style={styles.addOptionTitleSquare}>Scan Barcode</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Camera | Gallery */}
          <View style={styles.addOptionsRow}>
            <TouchableOpacity
              style={styles.addOptionItemSquare}
              onPress={() => {
                onClose();
                onSelectOption('camera');
              }}
              activeOpacity={0.7}
            >
              <Camera size={28} color={colors.accent.primary} />
              <Text style={styles.addOptionTitleSquare}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addOptionItemSquare}
              onPress={() => {
                onClose();
                onSelectOption('gallery');
              }}
              activeOpacity={0.7}
            >
              <ImageIcon size={28} color={colors.accent.primary} />
              <Text style={styles.addOptionTitleSquare}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Row 3: Manual - full width */}
          <TouchableOpacity
            style={styles.addOptionItemFull}
            onPress={() => {
              onClose();
              onSelectOption('manual');
            }}
            activeOpacity={0.7}
          >
            <Edit3 size={28} color={colors.accent.primary} />
            <Text style={styles.addOptionTitleSquare}>Add Manually</Text>
          </TouchableOpacity>
        </View>

        {/* Floating Close Button */}
        <TouchableOpacity style={styles.addOptionsCloseButton} onPress={onClose}>
          <X size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// Add Meal Modal
function AddMealModal({
  visible,
  onClose,
  onSave,
  initialMealType = 'snack',
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (meal: Partial<UserMeal>) => void;
  initialMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(initialMealType);
  const [saving, setSaving] = useState(false);

  // Update meal type when modal opens with new initial type
  useEffect(() => {
    if (visible) {
      setMealType(initialMealType);
    }
  }, [visible, initialMealType]);

  const handleSave = async () => {
    if (!name.trim() || !calories.trim()) {
      Alert.alert('Error', 'Please enter at least a name and calories');
      return;
    }

    setSaving(true);
    await onSave({
      name: name.trim(),
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      meal_type: mealType,
      source: 'manual',
    });
    setSaving(false);

    // Reset form
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setMealType('snack');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <SafeAreaView style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Meal</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSaveText, saving && styles.modalSaveTextDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScrollContent}
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

            {/* Food Name Input - Premium Card */}
            <View style={styles.inputCard}>
              <View style={styles.inputCardHeader}>
                <Utensils size={18} color={colors.accent.primary} />
                <Text style={styles.inputCardLabel}>Food Name</Text>
              </View>
              <TextInput
                style={styles.inputCardField}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Grilled Chicken Salad"
                placeholderTextColor={colors.text.placeholder}
              />
            </View>

            {/* Macros Section - Premium Cards */}
            <Text style={styles.macroSectionTitle}>Nutrition Info</Text>

            {/* Calories - Hero Card */}
            <View style={styles.caloriesInputCard}>
              <View style={styles.caloriesInputLeft}>
                <Flame size={24} color={colors.accent.primary} />
                <Text style={styles.caloriesInputLabel}>Calories</Text>
              </View>
              <TextInput
                style={styles.caloriesInputField}
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                placeholderTextColor={colors.text.placeholder}
                keyboardType="numeric"
              />
              <Text style={styles.caloriesInputUnit}>kcal</Text>
            </View>

            {/* Macros Grid */}
            <View style={styles.macroGrid}>
              <View style={styles.macroInputCard}>
                <View style={styles.macroInputIcon}>
                  <Beef size={18} color={colors.accent.pink} />
                </View>
                <Text style={styles.macroInputLabel}>Protein</Text>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInputField}
                    value={protein}
                    onChangeText={setProtein}
                    placeholder="0"
                    placeholderTextColor={colors.text.placeholder}
                    keyboardType="numeric"
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>

              <View style={styles.macroInputCard}>
                <View style={styles.macroInputIcon}>
                  <Wheat size={18} color={colors.accent.orange} />
                </View>
                <Text style={styles.macroInputLabel}>Carbs</Text>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInputField}
                    value={carbs}
                    onChangeText={setCarbs}
                    placeholder="0"
                    placeholderTextColor={colors.text.placeholder}
                    keyboardType="numeric"
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>

              <View style={styles.macroInputCard}>
                <View style={styles.macroInputIcon}>
                  <Droplet size={18} color={colors.accent.blue} />
                </View>
                <Text style={styles.macroInputLabel}>Fat</Text>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInputField}
                    value={fat}
                    onChangeText={setFat}
                    placeholder="0"
                    placeholderTextColor={colors.text.placeholder}
                    keyboardType="numeric"
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Analyzing Modal - Shows scanning animation while AI analyzes photo
function AnalyzingModal({
  visible,
  imageUri,
  onClose,
}: {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}) {
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate scanning line up and down
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [visible]);

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.analyzingOverlay}>
        <View style={styles.analyzingContainer}>
          {/* Image Preview with Scanning Effect */}
          <View style={styles.analyzingImageContainer}>
            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={styles.analyzingImage}
                resizeMode="cover"
              />
            )}
            {/* Scanning Line */}
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanLineTranslate }] },
              ]}
            />
            {/* Grid Overlay */}
            <View style={styles.scanGridOverlay}>
              <View style={styles.scanCorner} />
              <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
              <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
              <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
            </View>
          </View>

          {/* Loading Info */}
          <View style={styles.analyzingInfo}>
            <View style={styles.analyzingIconContainer}>
              <Sparkles size={24} color={colors.accent.primary} />
            </View>
            <Text style={styles.analyzingTitle}>Analyzing your meal...</Text>
            <Text style={styles.analyzingSubtitle}>
              AI is identifying food items and calculating nutrition
            </Text>
            <ActivityIndicator
              size="small"
              color={colors.accent.primary}
              style={styles.analyzingSpinner}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Meal Review Modal - Shows analysis results for editing before saving
function MealReviewModal({
  visible,
  imageUri,
  result,
  mealType,
  onClose,
  onSave,
  onRetry,
}: {
  visible: boolean;
  imageUri: string | null;
  result: VisionMealResult | null;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  onClose: () => void;
  onSave: (data: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    image_url?: string;
    health_score?: number;
  }) => void;
  onRetry: () => void;
}) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(mealType);
  const [saving, setSaving] = useState(false);

  // Update form when result changes
  useEffect(() => {
    if (result) {
      setName(result.name || '');
      setCalories(String(result.calories || 0));
      setProtein(String(result.protein || 0));
      setCarbs(String(result.carbs || 0));
      setFat(String(result.fat || 0));
    }
  }, [result]);

  useEffect(() => {
    setSelectedMealType(mealType);
  }, [mealType]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a meal name');
      return;
    }

    setSaving(true);
    await onSave({
      name: name.trim(),
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      mealType: selectedMealType,
      image_url: result?.image_url,
      health_score: result?.health_score,
    });
    setSaving(false);
  };

  const confidenceLabel = result?.confidence
    ? result.confidence >= 80
      ? 'High confidence'
      : result.confidence >= 50
      ? 'Medium confidence'
      : 'Low confidence'
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <SafeAreaView style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Review Meal</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSaveText, saving && styles.modalSaveTextDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* Image Preview */}
            {imageUri && (
              <View style={styles.reviewImageContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.reviewImage}
                  resizeMode="cover"
                />
                {/* Badges Row */}
                <View style={styles.reviewBadgesRow}>
                  {confidenceLabel && (
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>{confidenceLabel}</Text>
                    </View>
                  )}
                  {result?.health_score !== undefined && (
                    <View style={[
                      styles.healthScoreBadge,
                      result.health_score >= 70 ? styles.healthScoreGood :
                      result.health_score >= 40 ? styles.healthScoreMedium :
                      styles.healthScoreLow
                    ]}>
                      <Text style={styles.healthScoreText}>
                        Health: {Math.round(result.health_score / 10)}/10
                      </Text>
                    </View>
                  )}
                </View>
                {/* Retry Button */}
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={onRetry}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={18} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Meal Name */}
            <View style={styles.inputCard}>
              <View style={styles.inputCardHeader}>
                <Utensils size={18} color={colors.accent.primary} />
                <Text style={styles.inputCardLabel}>Meal Name</Text>
              </View>
              <TextInput
                style={styles.inputCardField}
                value={name}
                onChangeText={setName}
                placeholder="Enter meal name"
                placeholderTextColor={colors.text.placeholder}
              />
            </View>

            {/* Meal Type */}
            <Text style={styles.inputLabel}>Meal Type</Text>
            <View style={styles.mealTypeSelectorPremium}>
              {(Object.keys(MEAL_TYPE_LABELS) as Array<keyof typeof MEAL_TYPE_LABELS>).map((type) => {
                const Icon = MEAL_TYPE_ICONS[type];
                const isSelected = selectedMealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypePill,
                      isSelected && styles.mealTypePillSelected,
                    ]}
                    onPress={() => setSelectedMealType(type)}
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

            {/* Nutrition Info */}
            <Text style={styles.macroSectionTitle}>Nutrition Info</Text>

            {/* Calories */}
            <View style={styles.caloriesInputCard}>
              <View style={styles.caloriesInputLeft}>
                <Flame size={24} color={colors.accent.primary} />
                <Text style={styles.caloriesInputLabel}>Calories</Text>
              </View>
              <TextInput
                style={styles.caloriesInputField}
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                placeholderTextColor={colors.text.placeholder}
                keyboardType="numeric"
              />
              <Text style={styles.caloriesInputUnit}>kcal</Text>
            </View>

            {/* Macros */}
            <View style={styles.macroGrid}>
              <View style={styles.macroInputCard}>
                <View style={styles.macroInputIcon}>
                  <Beef size={18} color={colors.accent.pink} />
                </View>
                <Text style={styles.macroInputLabel}>Protein</Text>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInputField}
                    value={protein}
                    onChangeText={setProtein}
                    placeholder="0"
                    placeholderTextColor={colors.text.placeholder}
                    keyboardType="numeric"
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>

              <View style={styles.macroInputCard}>
                <View style={styles.macroInputIcon}>
                  <Wheat size={18} color={colors.accent.orange} />
                </View>
                <Text style={styles.macroInputLabel}>Carbs</Text>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInputField}
                    value={carbs}
                    onChangeText={setCarbs}
                    placeholder="0"
                    placeholderTextColor={colors.text.placeholder}
                    keyboardType="numeric"
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>

              <View style={styles.macroInputCard}>
                <View style={styles.macroInputIcon}>
                  <Droplet size={18} color={colors.accent.blue} />
                </View>
                <Text style={styles.macroInputLabel}>Fat</Text>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInputField}
                    value={fat}
                    onChangeText={setFat}
                    placeholder="0"
                    placeholderTextColor={colors.text.placeholder}
                    keyboardType="numeric"
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>
            </View>

            {/* Ingredients (if available) */}
            {result?.ingredients && result.ingredients.length > 0 && (
              <View style={styles.ingredientsCard}>
                <Text style={styles.ingredientsTitle}>Detected Ingredients</Text>
                <View style={styles.ingredientsList}>
                  {result.ingredients.map((ing, idx) => (
                    <View key={idx} style={styles.ingredientChip}>
                      <Text style={styles.ingredientText}>{ing}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Meal Edit Modal - for editing existing meals
function MealEditModal({
  visible,
  meal,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  meal: UserMeal | null;
  onClose: () => void;
  onSave: (updatedMeal: Partial<UserMeal> & { id: string }) => void;
  onDelete: (mealId: string) => void;
}) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');
  const [saving, setSaving] = useState(false);

  // Update form when meal changes
  useEffect(() => {
    if (meal) {
      setName(meal.name || '');
      setCalories(String(meal.calories || 0));
      setProtein(String(meal.protein || 0));
      setCarbs(String(meal.carbs || 0));
      setFat(String(meal.fat || 0));
      setSelectedMealType(meal.meal_type || 'snack');
    }
  }, [meal]);

  const handleSave = async () => {
    if (!meal) return;
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a meal name');
      return;
    }

    setSaving(true);
    await onSave({
      id: meal.id,
      name: name.trim(),
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      meal_type: selectedMealType,
    });
    setSaving(false);
  };

  const handleDelete = () => {
    if (!meal) return;
    onDelete(meal.id);
  };

  if (!meal) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <SafeAreaView style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Meal</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSaveText, saving && styles.modalSaveTextDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* Image Preview (if available) */}
            {meal.image_url && (
              <View style={styles.reviewImageContainer}>
                <Image
                  source={{ uri: meal.image_url }}
                  style={styles.reviewImage}
                  resizeMode="cover"
                />
                {/* Health Score Badge */}
                {meal.health_score !== undefined && meal.health_score !== null && (
                  <View style={styles.reviewBadgesRow}>
                    <View style={[
                      styles.healthScoreBadge,
                      meal.health_score >= 70 ? styles.healthScoreGood :
                      meal.health_score >= 40 ? styles.healthScoreMedium :
                      styles.healthScoreLow
                    ]}>
                      <Text style={styles.healthScoreText}>
                        Health: {Math.round(meal.health_score / 10)}/10
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Meal Name */}
            <View style={styles.inputCard}>
              <View style={styles.inputCardHeader}>
                <Utensils size={18} color={colors.accent.primary} />
                <Text style={styles.inputCardLabel}>Meal Name</Text>
              </View>
              <TextInput
                style={styles.inputCardField}
                value={name}
                onChangeText={setName}
                placeholder="Enter meal name"
                placeholderTextColor={colors.text.placeholder}
              />
            </View>

            {/* Meal Type */}
            <Text style={styles.inputLabel}>Meal Type</Text>
            <View style={styles.mealTypeSelectorPremium}>
              {(Object.keys(MEAL_TYPE_LABELS) as Array<keyof typeof MEAL_TYPE_LABELS>).map((type) => {
                const Icon = MEAL_TYPE_ICONS[type];
                const isSelected = selectedMealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypePill,
                      isSelected && styles.mealTypePillSelected,
                    ]}
                    onPress={() => setSelectedMealType(type)}
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

            {/* Nutrition Info */}
            <Text style={styles.macroSectionTitle}>Nutrition Info</Text>

            {/* Calories */}
            <View style={styles.caloriesInputCard}>
              <View style={styles.caloriesInputLeft}>
                <Flame size={24} color={colors.accent.primary} />
                <Text style={styles.caloriesInputLabel}>Calories</Text>
              </View>
              <TextInput
                style={styles.caloriesInputField}
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                placeholderTextColor={colors.text.placeholder}
                keyboardType="numeric"
              />
              <Text style={styles.caloriesInputUnit}>kcal</Text>
            </View>

            {/* Macros */}
            <View style={styles.macroGrid}>
              <View style={styles.macroInputCard}>
                <View style={styles.macroInputIcon}>
                  <Beef size={18} color={colors.accent.pink} />
                </View>
                <Text style={styles.macroInputLabel}>Protein</Text>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInputField}
                    value={protein}
                    onChangeText={setProtein}
                    placeholder="0"
                    placeholderTextColor={colors.text.placeholder}
                    keyboardType="numeric"
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>

              <View style={styles.macroInputCard}>
                <View style={styles.macroInputIcon}>
                  <Wheat size={18} color={colors.accent.orange} />
                </View>
                <Text style={styles.macroInputLabel}>Carbs</Text>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInputField}
                    value={carbs}
                    onChangeText={setCarbs}
                    placeholder="0"
                    placeholderTextColor={colors.text.placeholder}
                    keyboardType="numeric"
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>

              <View style={styles.macroInputCard}>
                <View style={styles.macroInputIcon}>
                  <Droplet size={18} color={colors.accent.blue} />
                </View>
                <Text style={styles.macroInputLabel}>Fat</Text>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInputField}
                    value={fat}
                    onChangeText={setFat}
                    placeholder="0"
                    placeholderTextColor={colors.text.placeholder}
                    keyboardType="numeric"
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>
            </View>

            {/* Delete Button */}
            <TouchableOpacity
              style={styles.editMealDeleteButton}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Trash2 size={20} color={colors.semantic.error} />
              <Text style={styles.editMealDeleteText}>Delete Meal</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Edit Target Modal for editing nutrition targets
type TargetType = 'calories' | 'protein' | 'carbs' | 'fat';

function EditTargetModal({
  visible,
  onClose,
  onSave,
  targetType,
  currentValue,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (type: TargetType, value: number) => void;
  targetType: TargetType | null;
  currentValue: number;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Update value when modal opens with new target
  useEffect(() => {
    if (visible && currentValue) {
      setValue(currentValue.toString());
    }
  }, [visible, currentValue]);

  const targetLabels: Record<TargetType, string> = {
    calories: 'Daily Calories',
    protein: 'Daily Protein (g)',
    carbs: 'Daily Carbs (g)',
    fat: 'Daily Fat (g)',
  };

  const targetUnits: Record<TargetType, string> = {
    calories: 'kcal',
    protein: 'g',
    carbs: 'g',
    fat: 'g',
  };

  const handleSave = async () => {
    if (!value.trim() || !targetType) {
      return;
    }

    const numValue = parseInt(value) || 0;
    if (numValue <= 0) {
      Alert.alert('Error', 'Please enter a valid value greater than 0');
      return;
    }

    setSaving(true);
    await onSave(targetType, numValue);
    setSaving(false);
    setValue('');
    onClose();
  };

  const handleClose = () => {
    setValue('');
    onClose();
  };

  if (!targetType) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.editTargetOverlay}
      >
        <TouchableOpacity
          style={styles.editTargetBackdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.editTargetContainer}>
          {/* Header */}
          <View style={styles.editTargetHeader}>
            <Text style={styles.editTargetTitle}>Edit {targetLabels[targetType]}</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Input */}
          <View style={styles.editTargetInputContainer}>
            <TextInput
              style={styles.editTargetInput}
              value={value}
              onChangeText={setValue}
              placeholder="0"
              placeholderTextColor={colors.text.placeholder}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
            />
            <Text style={styles.editTargetUnit}>{targetUnits[targetType]}</Text>
          </View>

          {/* Quick adjust buttons */}
          <View style={styles.quickAdjustRow}>
            {[-100, -50, +50, +100].map((delta) => (
              <TouchableOpacity
                key={delta}
                style={styles.quickAdjustButton}
                onPress={() => {
                  const current = parseInt(value) || currentValue || 0;
                  const newVal = Math.max(0, current + delta);
                  setValue(newVal.toString());
                }}
              >
                <Text style={styles.quickAdjustText}>
                  {delta > 0 ? `+${delta}` : delta}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.editTargetSaveButton, saving && styles.editTargetSaveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.editTargetSaveText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Helper function to get date string
function getDateString(dayIndex: number): string {
  const today = new Date();
  const currentDayIndex = today.getDay();
  const diff = dayIndex - currentDayIndex;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return targetDate.toISOString().split('T')[0];
}

export default function NutritionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentDayIndex, setCurrentDayIndex] = useState(() => new Date().getDay());
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [addMealType, setAddMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');
  const [showAddOptionsModal, setShowAddOptionsModal] = useState(false);

  // Edit target modal state
  const [editTargetType, setEditTargetType] = useState<TargetType | null>(null);
  const [showEditTargetModal, setShowEditTargetModal] = useState(false);

  // Vision analysis state
  const [visionImageUri, setVisionImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VisionMealResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Edit meal modal state
  const [editingMeal, setEditingMeal] = useState<UserMeal | null>(null);
  const [showEditMealModal, setShowEditMealModal] = useState(false);

  // Barcode scanning state
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<BarcodeProduct | null>(null);
  const [showBarcodeReview, setShowBarcodeReview] = useState(false);

  // Nutrition plan data
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null);

  // User meals for the selected day
  const [userMeals, setUserMeals] = useState<UserMeal[]>([]);

  // Track which plan meals are eaten (by dayIndex_mealIndex key)
  const [eatenPlanMeals, setEatenPlanMeals] = useState<Set<string>>(new Set());

  // Calculated values
  const targets = {
    calories: nutritionPlan?.dailyTargets?.calories || 2000,
    protein: nutritionPlan?.dailyTargets?.protein_g || 150,
    carbs: nutritionPlan?.dailyTargets?.carbs_g || 250,
    fat: nutritionPlan?.dailyTargets?.fat_g || 65,
  };

  // Calculate consumed values from both eaten plan meals and user meals
  const consumed = (() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    // Add user meals
    userMeals.forEach((meal) => {
      calories += meal.calories || 0;
      protein += meal.protein || 0;
      carbs += meal.carbs || 0;
      fat += meal.fat || 0;
    });

    // Add eaten plan meals
    const planDays = nutritionPlan?.days || [];
    const planDayIndex = currentDayIndex % (planDays.length || 1);
    const dayPlan = planDays[planDayIndex];

    if (dayPlan) {
      dayPlan.meals.forEach((meal, mealIndex) => {
        const mealKey = `${currentDayIndex}_${mealIndex}`;
        if (eatenPlanMeals.has(mealKey)) {
          calories += meal.macros.calories || 0;
          protein += meal.macros.protein_g || 0;
          carbs += meal.macros.carbs_g || 0;
          fat += meal.macros.fat_g || 0;
        }
      });
    }

    return { calories, protein, carbs, fat };
  })();

  // Get current day's plan meals
  const currentDayPlanMeals = (() => {
    const planDays = nutritionPlan?.days || [];
    if (planDays.length === 0) return [];
    const planDayIndex = currentDayIndex % planDays.length;
    return planDays[planDayIndex]?.meals || [];
  })();

  // Group user meals by meal type
  const mealsByType = {
    breakfast: userMeals.filter((m) => m.meal_type === 'breakfast'),
    snack: userMeals.filter((m) => m.meal_type === 'snack'),
    lunch: userMeals.filter((m) => m.meal_type === 'lunch'),
    dinner: userMeals.filter((m) => m.meal_type === 'dinner'),
  };

  // Map plan meals to meal types
  const planMealsByType: Record<string, { meal: PlanMeal; index: number } | undefined> = {};
  currentDayPlanMeals.forEach((meal, index) => {
    const mealName = meal.name.toLowerCase();
    if (mealName === 'breakfast') {
      planMealsByType.breakfast = { meal, index };
    } else if (mealName === 'snack') {
      planMealsByType.snack = { meal, index };
    } else if (mealName === 'lunch') {
      planMealsByType.lunch = { meal, index };
    } else if (mealName === 'dinner') {
      planMealsByType.dinner = { meal, index };
    }
  });

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadNutritionData();
    }, [user, currentDayIndex])
  );

  const loadNutritionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch nutrition plan from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('nutrition_plan, nutrition_calories')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      if (profile && profile.nutrition_plan) {
        setNutritionPlan(profile.nutrition_plan);
      }

      // Fetch user meals for the selected date
      const dateString = getDateString(currentDayIndex);
      const { data: meals, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateString)
        .order('created_at', { ascending: true });

      if (mealsError) {
        console.error('Error fetching meals:', mealsError);
      }

      if (meals) {
        // Separate user meals from plan meals
        const userOnlyMeals = meals.filter((m) => m.source !== 'plan');
        const planMeals = meals.filter((m) => m.source === 'plan');

        setUserMeals(userOnlyMeals);

        // Update eaten plan meals set
        const eatenSet = new Set<string>();
        planMeals.forEach((meal) => {
          if (meal.plan_meal_id) {
            eatenSet.add(meal.plan_meal_id);
          }
        });
        setEatenPlanMeals(eatenSet);
      }
    } catch (error) {
      console.error('Error loading nutrition data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle plan meal eaten status
  const handleTogglePlanMeal = async (mealIndex: number, meal: PlanMeal) => {
    if (!user) return;

    const mealKey = `${currentDayIndex}_${mealIndex}`;
    const isCurrentlyEaten = eatenPlanMeals.has(mealKey);
    const dateString = getDateString(currentDayIndex);

    // Optimistic update
    const newEatenSet = new Set(eatenPlanMeals);
    if (isCurrentlyEaten) {
      newEatenSet.delete(mealKey);
    } else {
      newEatenSet.add(mealKey);
    }
    setEatenPlanMeals(newEatenSet);

    try {
      if (isCurrentlyEaten) {
        // Delete the plan meal record
        await supabase
          .from('meals')
          .delete()
          .eq('user_id', user.id)
          .eq('date', dateString)
          .eq('plan_meal_id', mealKey);
      } else {
        // Create a plan meal record
        await supabase.from('meals').insert({
          user_id: user.id,
          date: dateString,
          name: meal.name,
          calories: meal.macros.calories,
          protein: meal.macros.protein_g,
          carbs: meal.macros.carbs_g,
          fat: meal.macros.fat_g,
          source: 'plan',
          plan_meal_id: mealKey,
        });
      }
    } catch (error) {
      console.error('Error toggling plan meal:', error);
      // Revert optimistic update
      setEatenPlanMeals(eatenPlanMeals);
    }
  };

  // Add new user meal
  const handleAddMeal = async (mealData: Partial<UserMeal>) => {
    if (!user) return;

    const dateString = getDateString(currentDayIndex);

    try {
      // Build insert object - health_score is optional (column may not exist yet)
      const insertData: Record<string, any> = {
        user_id: user.id,
        date: dateString,
        name: mealData.name,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fat: mealData.fat,
        meal_type: mealData.meal_type,
        source: mealData.source || 'manual',
        image_url: mealData.image_url || null,
      };

      // Try with health_score first, if it fails we'll retry without
      if (mealData.health_score !== undefined && mealData.health_score !== null) {
        insertData.health_score = mealData.health_score;
      }

      let { data, error } = await supabase
        .from('meals')
        .insert(insertData)
        .select()
        .single();

      // If health_score column doesn't exist, retry without it
      if (error && error.message?.includes('health_score')) {
        console.warn('health_score column not found, retrying without it');
        delete insertData.health_score;
        const retry = await supabase
          .from('meals')
          .insert(insertData)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      if (data) {
        setUserMeals((prev) => [...prev, data]);

        // Save to user's personal food database
        try {
          // Calculate per 100g nutrition
          const portionGrams = mealData.portion_grams || 100;
          const per100g = {
            kcal: Math.round((mealData.calories! / portionGrams) * 100),
            protein_g: Math.round(((mealData.protein || 0) / portionGrams) * 100),
            carbs_g: Math.round(((mealData.carbs || 0) / portionGrams) * 100),
            fat_g: Math.round(((mealData.fat || 0) / portionGrams) * 100),
          };

          // Check if food already exists
          const { data: existing } = await supabase
            .from('user_foods')
            .select('id')
            .eq('user_id', user.id)
            .eq('name_he', mealData.name!)
            .eq('brand', mealData.brand || '')
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
              name_he: mealData.name!,
              brand: mealData.brand || null,
              serving_grams: 100,
              per_100g: per100g,
              is_verified: false,
            });
          }
        } catch (userFoodError) {
          console.error('[Nutrition] Error saving to user_foods:', userFoodError);
          // Don't fail the whole operation if user_foods fails
        }
      }

      setShowAddMealModal(false);
    } catch (error) {
      console.error('Error adding meal:', error);
      Alert.alert('Error', 'Failed to add meal. Please try again.');
    }
  };

  // Delete user meal
  const handleDeleteMeal = async (mealId: string) => {
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('meals').delete().eq('id', mealId);
              setUserMeals((prev) => prev.filter((m) => m.id !== mealId));
            } catch (error) {
              console.error('Error deleting meal:', error);
              Alert.alert('Error', 'Failed to delete meal');
            }
          },
        },
      ]
    );
  };

  // Open edit meal modal
  const handleOpenEditMeal = (meal: UserMeal) => {
    setEditingMeal(meal);
    setShowEditMealModal(true);
  };

  // Update user meal
  const handleUpdateMeal = async (updatedMeal: Partial<UserMeal> & { id: string }) => {
    try {
      const { error } = await supabase
        .from('meals')
        .update({
          name: updatedMeal.name,
          calories: updatedMeal.calories,
          protein: updatedMeal.protein,
          carbs: updatedMeal.carbs,
          fat: updatedMeal.fat,
          meal_type: updatedMeal.meal_type,
        })
        .eq('id', updatedMeal.id);

      if (error) throw error;

      // Update local state
      setUserMeals((prev) =>
        prev.map((m) =>
          m.id === updatedMeal.id
            ? { ...m, ...updatedMeal }
            : m
        )
      );

      setShowEditMealModal(false);
      setEditingMeal(null);
    } catch (error) {
      console.error('Error updating meal:', error);
      Alert.alert('Error', 'Failed to update meal');
    }
  };

  // Delete meal from edit modal
  const handleDeleteMealFromEdit = (mealId: string) => {
    setShowEditMealModal(false);
    setEditingMeal(null);
    // Use the existing delete handler
    handleDeleteMeal(mealId);
  };

  // Open add meal options modal with specific meal type
  const handleOpenAddMeal = (type: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setAddMealType(type);
    setShowAddOptionsModal(true);
  };

  // Handle barcode scan result
  const handleBarcodeScanned = async (barcode: string) => {
    setBarcodeLoading(true);

    try {
      const response = await lookupBarcode(barcode);

      if (response.ok) {
        console.log('[Barcode] Product found:', response.product.name);
        setScannedProduct(response.product);
        setShowBarcodeScanner(false);
        setShowBarcodeReview(true);
      } else {
        // Product not found
        console.log('[Barcode] Product not found:', response.reason);
        setShowBarcodeScanner(false);
        Alert.alert(
          'Product Not Found',
          response.message || 'This barcode is not in our database.',
          [
            {
              text: 'Scan Again',
              onPress: () => setShowBarcodeScanner(true),
            },
            {
              text: 'Add Manually',
              onPress: () => setShowAddMealModal(true),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error) {
      console.error('[Barcode] Scan error:', error);
      setShowBarcodeScanner(false);
      Alert.alert('Error', 'Failed to look up product. Please try again.');
    } finally {
      setBarcodeLoading(false);
    }
  };

  // Handle saving scanned product as meal
  const handleSaveScannedProduct = async (data: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    portion_grams: number;
    barcode?: string;
    brand?: string;
  }) => {
    await handleAddMeal({
      name: data.name,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      meal_type: data.mealType,
      portion_grams: data.portion_grams,
      brand: data.brand,
      source: 'manual', // Track as manual for now, could add 'barcode' source later
    });

    // Reset barcode state
    setShowBarcodeReview(false);
    setScannedProduct(null);
  };

  // Compress image for upload
  const compressImage = async (uri: string): Promise<string> => {
    try {
      // Dynamic import for expo-image-manipulator
      const ImageManipulator = await import('expo-image-manipulator');
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }], // Resize to max 1024px width
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      console.warn('[Vision] Image compression failed, using original:', error);
      return uri;
    }
  };

  // Handle image analysis with AI Vision
  const handleAnalyzeImage = async (imageUri: string) => {
    setVisionImageUri(imageUri);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Compress image before upload
      const compressedUri = await compressImage(imageUri);

      // Call the Vision API
      const response = await analyzeVisionMeal(compressedUri);

      if (response.ok && response.meal) {
        setAnalysisResult(response.meal);
        setIsAnalyzing(false);
        setShowReviewModal(true);
      } else {
        setIsAnalyzing(false);
        Alert.alert(
          'Analysis Failed',
          response.message || 'Could not analyze this image. Please try again with a clearer photo.',
          [
            { text: 'Try Again', onPress: () => handleSelectAddOption('camera') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } catch (error: any) {
      console.error('[Vision] Analysis error:', error);
      setIsAnalyzing(false);
      Alert.alert('Error', error.message || 'Failed to analyze image');
    }
  };

  // Handle option selection from add meal options modal
  const handleSelectAddOption = async (option: 'barcode' | 'camera' | 'gallery' | 'database' | 'manual') => {
    switch (option) {
      case 'barcode':
        // Open barcode scanner
        setShowBarcodeScanner(true);
        break;
      case 'camera':
        try {
          // Dynamic import for expo-image-picker
          const ImagePicker = await import('expo-image-picker');

          // Request camera permission and launch camera
          const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
          if (cameraPermission.status !== 'granted') {
            Alert.alert(
              'Permission Required',
              'Please allow camera access to take photos of your meals.',
              [{ text: 'OK' }]
            );
            return;
          }

          const cameraResult = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

          if (!cameraResult.canceled && cameraResult.assets[0]) {
            handleAnalyzeImage(cameraResult.assets[0].uri);
          }
        } catch (error) {
          console.warn('[Camera] Image picker not available:', error);
          Alert.alert(
            'Development Build Required',
            'Photo analysis requires a development build. This feature is not available in Expo Go.\n\nRun "npx expo run:ios" or "npx expo run:android" to create a development build.',
            [{ text: 'OK' }]
          );
        }
        break;
      case 'gallery':
        try {
          // Dynamic import for expo-image-picker
          const ImagePicker = await import('expo-image-picker');

          // Request media library permission and launch gallery
          const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (galleryPermission.status !== 'granted') {
            Alert.alert(
              'Permission Required',
              'Please allow photo library access to select photos of your meals.',
              [{ text: 'OK' }]
            );
            return;
          }

          const galleryResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

          if (!galleryResult.canceled && galleryResult.assets[0]) {
            handleAnalyzeImage(galleryResult.assets[0].uri);
          }
        } catch (error) {
          console.warn('[Gallery] Image picker not available:', error);
          Alert.alert(
            'Development Build Required',
            'Photo analysis requires a development build. This feature is not available in Expo Go.\n\nRun "npx expo run:ios" or "npx expo run:android" to create a development build.',
            [{ text: 'OK' }]
          );
        }
        break;
      case 'database':
        // Open food database search
        router.push('/(app)/food-search');
        break;
      case 'manual':
        // Open manual add meal modal
        setShowAddMealModal(true);
        break;
    }
  };

  // Handle saving analyzed meal
  const handleSaveAnalyzedMeal = async (data: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    image_url?: string;
    health_score?: number;
  }) => {
    await handleAddMeal({
      name: data.name,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      meal_type: data.mealType,
      source: 'ai_vision',
      image_url: data.image_url,
      health_score: data.health_score,
    });

    // Reset vision state
    setShowReviewModal(false);
    setVisionImageUri(null);
    setAnalysisResult(null);
  };

  // Handle retry analysis
  const handleRetryAnalysis = () => {
    setShowReviewModal(false);
    if (visionImageUri) {
      handleAnalyzeImage(visionImageUri);
    }
  };

  // Open edit target modal
  const handleOpenEditTarget = (type: TargetType) => {
    setEditTargetType(type);
    setShowEditTargetModal(true);
  };

  // Save updated target value
  const handleSaveTarget = async (type: TargetType, value: number) => {
    if (!user || !nutritionPlan) return;

    try {
      // Create updated daily targets
      const updatedTargets = {
        ...nutritionPlan.dailyTargets,
        ...(type === 'calories' && { calories: value }),
        ...(type === 'protein' && { protein_g: value }),
        ...(type === 'carbs' && { carbs_g: value }),
        ...(type === 'fat' && { fat_g: value }),
      };

      // Update the nutrition plan with new targets
      const updatedPlan = {
        ...nutritionPlan,
        dailyTargets: updatedTargets,
      };

      // Save to database
      const { error } = await supabase
        .from('profiles')
        .update({ nutrition_plan: updatedPlan })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setNutritionPlan(updatedPlan);
    } catch (error) {
      console.error('Error saving target:', error);
      Alert.alert('Error', 'Failed to save target. Please try again.');
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
            <ActivityIndicator size="large" color={colors.accent.primary} />
          </View>
        ) : (
          <>
            {/* Calories Widget */}
            <View style={styles.section}>
              <CaloriesWidget
                target={targets.calories}
                consumed={consumed.calories}
                onPress={() => handleOpenEditTarget('calories')}
              />
            </View>

            {/* Macro Cards */}
            <View style={styles.macroRow}>
              <MacroCard
                label={texts.nutrition.protein}
                consumed={consumed.protein}
                target={targets.protein}
                color={colors.accent.pink}
                icon={<Beef size={28} color={colors.accent.pink} />}
                onPress={() => handleOpenEditTarget('protein')}
              />
              <MacroCard
                label={texts.nutrition.carbs}
                consumed={consumed.carbs}
                target={targets.carbs}
                color={colors.accent.orange}
                icon={<Wheat size={28} color={colors.accent.orange} />}
                onPress={() => handleOpenEditTarget('carbs')}
              />
              <MacroCard
                label={texts.nutrition.fat}
                consumed={consumed.fat}
                target={targets.fat}
                color={colors.accent.blue}
                icon={<Droplet size={28} color={colors.accent.blue} />}
                onPress={() => handleOpenEditTarget('fat')}
              />
            </View>

            {/* Meals Section - Grouped by meal type with plan meals */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{texts.nutrition.meals}</Text>

              <MealTypeSection
                mealType="breakfast"
                meals={mealsByType.breakfast}
                planMeal={planMealsByType.breakfast?.meal}
                isPlanMealEaten={planMealsByType.breakfast ? eatenPlanMeals.has(`${currentDayIndex}_${planMealsByType.breakfast.index}`) : false}
                onTogglePlanMeal={planMealsByType.breakfast ? () => handleTogglePlanMeal(planMealsByType.breakfast!.index, planMealsByType.breakfast!.meal) : undefined}
                onAddMeal={handleOpenAddMeal}
                onDeleteMeal={handleDeleteMeal}
                onEditMeal={handleOpenEditMeal}
              />

              <MealTypeSection
                mealType="snack"
                meals={mealsByType.snack}
                planMeal={planMealsByType.snack?.meal}
                isPlanMealEaten={planMealsByType.snack ? eatenPlanMeals.has(`${currentDayIndex}_${planMealsByType.snack.index}`) : false}
                onTogglePlanMeal={planMealsByType.snack ? () => handleTogglePlanMeal(planMealsByType.snack!.index, planMealsByType.snack!.meal) : undefined}
                onAddMeal={handleOpenAddMeal}
                onDeleteMeal={handleDeleteMeal}
                onEditMeal={handleOpenEditMeal}
              />

              <MealTypeSection
                mealType="lunch"
                meals={mealsByType.lunch}
                planMeal={planMealsByType.lunch?.meal}
                isPlanMealEaten={planMealsByType.lunch ? eatenPlanMeals.has(`${currentDayIndex}_${planMealsByType.lunch.index}`) : false}
                onTogglePlanMeal={planMealsByType.lunch ? () => handleTogglePlanMeal(planMealsByType.lunch!.index, planMealsByType.lunch!.meal) : undefined}
                onAddMeal={handleOpenAddMeal}
                onDeleteMeal={handleDeleteMeal}
                onEditMeal={handleOpenEditMeal}
              />

              <MealTypeSection
                mealType="dinner"
                meals={mealsByType.dinner}
                planMeal={planMealsByType.dinner?.meal}
                isPlanMealEaten={planMealsByType.dinner ? eatenPlanMeals.has(`${currentDayIndex}_${planMealsByType.dinner.index}`) : false}
                onTogglePlanMeal={planMealsByType.dinner ? () => handleTogglePlanMeal(planMealsByType.dinner!.index, planMealsByType.dinner!.meal) : undefined}
                onAddMeal={handleOpenAddMeal}
                onDeleteMeal={handleDeleteMeal}
                onEditMeal={handleOpenEditMeal}
              />
            </View>
          </>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Add Meal Options Modal */}
      <AddMealOptionsModal
        visible={showAddOptionsModal}
        onClose={() => setShowAddOptionsModal(false)}
        mealType={addMealType}
        onSelectOption={handleSelectAddOption}
      />

      {/* Add Meal Modal (Manual entry) */}
      <AddMealModal
        visible={showAddMealModal}
        onClose={() => setShowAddMealModal(false)}
        onSave={handleAddMeal}
        initialMealType={addMealType}
      />

      {/* Edit Target Modal */}
      <EditTargetModal
        visible={showEditTargetModal}
        onClose={() => {
          setShowEditTargetModal(false);
          setEditTargetType(null);
        }}
        onSave={handleSaveTarget}
        targetType={editTargetType}
        currentValue={
          editTargetType === 'calories' ? targets.calories :
          editTargetType === 'protein' ? targets.protein :
          editTargetType === 'carbs' ? targets.carbs :
          editTargetType === 'fat' ? targets.fat : 0
        }
      />

      {/* Analyzing Modal - Shows while AI is processing */}
      <AnalyzingModal
        visible={isAnalyzing}
        imageUri={visionImageUri}
        onClose={() => {
          setIsAnalyzing(false);
          setVisionImageUri(null);
        }}
      />

      {/* Meal Review Modal - Shows analysis results for editing */}
      <MealReviewModal
        visible={showReviewModal}
        imageUri={visionImageUri}
        result={analysisResult}
        mealType={addMealType}
        onClose={() => {
          setShowReviewModal(false);
          setVisionImageUri(null);
          setAnalysisResult(null);
        }}
        onSave={handleSaveAnalyzedMeal}
        onRetry={handleRetryAnalysis}
      />

      {/* Edit Meal Modal */}
      <MealEditModal
        visible={showEditMealModal}
        meal={editingMeal}
        onClose={() => {
          setShowEditMealModal(false);
          setEditingMeal(null);
        }}
        onSave={handleUpdateMeal}
        onDelete={handleDeleteMealFromEdit}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => {
          setShowBarcodeScanner(false);
          setBarcodeLoading(false);
        }}
        onBarcodeScanned={handleBarcodeScanned}
        isLoading={barcodeLoading}
      />

      {/* Barcode Review Modal */}
      <BarcodeReviewModal
        visible={showBarcodeReview}
        product={scannedProduct}
        mealType={addMealType}
        onClose={() => {
          setShowBarcodeReview(false);
          setScannedProduct(null);
        }}
        onSave={handleSaveScannedProduct}
        onRetry={() => {
          setShowBarcodeReview(false);
          setScannedProduct(null);
          setShowBarcodeScanner(true);
        }}
      />
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
    textAlign: 'left',
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
    textAlign: 'left',
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
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
  },
  dayButtonContainer: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelectedBg: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent.primary,
  },
  dayText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  dayTextSelected: {
    color: colors.background.primary,
  },
  dayNumber: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.tertiary,
  },
  dayNumberSelected: {
    color: colors.accent.primary,
  },

  // Calories Widget
  caloriesWidget: {
    backgroundColor: colors.background.card,
    borderColor: colors.border.primary,
    borderWidth: 1,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
  },
  caloriesContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xl,
  },
  caloriesInfo: {
    flex: 1,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
    textAlign: 'left',
    marginBottom: spacing.xs,
  },
  caloriesValueOver: {
    color: colors.semantic.error,
  },
  caloriesLabel: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    textAlign: 'left',
  },
  caloriesRing: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caloriesIconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Macro Cards
  macroRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderColor: colors.border.primary,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  macroValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  macroUnit: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.normal,
    color: colors.text.tertiary,
  },
  macroLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium,
  },
  macroCircle: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroIconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Plan Meal Card
  planMealCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  planMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  planMealInfo: {
    flex: 1,
  },
  planMealName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'left',
  },
  planMealNameEaten: {
    textDecorationLine: 'line-through',
    color: colors.text.secondary,
  },
  planMealMacros: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'left',
  },
  expandButton: {
    padding: spacing.xs,
  },
  planMealItems: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 0,
  },
  planMealItem: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: 2,
    textAlign: 'left',
  },
  planMealPrep: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    textAlign: 'left',
  },

  // User Meal Card
  userMealCard: {
    backgroundColor: colors.background.input,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  userMealInfo: {
    flex: 1,
  },
  userMealInfoWithImage: {
    marginLeft: spacing.sm,
  },
  userMealImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  userMealHealthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  userMealHealthText: {
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  userMealName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'left',
    flex: 1,
  },
  userMealMacros: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: 'left',
  },
  userMealPortion: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    textAlign: 'left',
  },
  userMealDeleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },

  // Edit Meal Modal Delete Button
  editMealDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: colors.semantic.error,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  editMealDeleteText: {
    color: colors.semantic.error,
    fontSize: 16,
    fontWeight: '600',
  },

  // Meal Type Section
  mealTypeSection: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  mealTypeSectionTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'left',
  },
  mealTypeSectionTotals: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  mealTypeSectionMeals: {
    marginBottom: spacing.sm,
  },
  mealTypeSectionAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.input,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderStyle: 'dashed',
  },
  mealTypeSectionAddText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.accent.primary,
  },

  // Plan meal in section
  planMealInSection: {
    backgroundColor: colors.background.input,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  planMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  planMealCheckbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  planMealCheckboxChecked: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  planMealExpandButton: {
    padding: spacing.xs,
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
    bottom: 100,
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

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  modalSaveText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.accent.primary,
  },
  modalSaveTextDisabled: {
    color: colors.text.tertiary,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },

  // Inputs
  inputLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  input: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'left',
  },

  // Premium Meal Type Selector - 2x2 Grid
  mealTypeSelectorPremium: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
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

  // Premium Input Card
  inputCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputCardLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  inputCardField: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    textAlign: 'left',
    writingDirection: 'ltr',
  },

  // Macro Section
  macroSectionTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  // Calories Hero Card
  caloriesInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  caloriesInputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  caloriesInputLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  caloriesInputField: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
    textAlign: 'right',
    minWidth: 80,
  },
  caloriesInputUnit: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  },

  // Macro Grid
  macroGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  macroInputCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.md,
    alignItems: 'center',
  },
  macroInputIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.input,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  macroInputLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  macroInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroInputField: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    minWidth: 40,
  },
  macroInputUnit: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginLeft: 2,
  },

  bottomSpacing: {
    height: 160,
  },

  // Edit Target Modal
  editTargetOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editTargetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  editTargetContainer: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  editTargetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  editTargetTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  editTargetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.input,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  editTargetInput: {
    flex: 1,
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  editTargetUnit: {
    fontSize: typography.size.lg,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },
  quickAdjustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickAdjustButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.input,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  quickAdjustText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  editTargetSaveButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  editTargetSaveButtonDisabled: {
    opacity: 0.5,
  },
  editTargetSaveText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.background.primary,
  },

  // Add Meal Options Modal - Floating boxes
  addOptionsOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  addOptionsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  addOptionsList: {
    width: '100%',
    gap: spacing.md,
  },
  // Row for 2 square items
  addOptionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  // Square items - floating dark boxes matching app theme
  addOptionItemSquare: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  // Full width item
  addOptionItemFull: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addOptionTitleSquare: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  // Floating close button
  addOptionsCloseButton: {
    position: 'absolute',
    bottom: 50,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Analyzing Modal Styles
  analyzingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  analyzingContainer: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  analyzingImageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.background.card,
    marginBottom: spacing.xl,
    position: 'relative',
  },
  analyzingImage: {
    width: '100%',
    height: '100%',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  scanGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: borderRadius.xl,
  },
  scanCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.accent.primary,
    borderTopLeftRadius: borderRadius.xl,
  },
  scanCornerTopRight: {
    left: undefined,
    right: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderTopLeftRadius: 0,
    borderTopRightRadius: borderRadius.xl,
  },
  scanCornerBottomLeft: {
    top: undefined,
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: borderRadius.xl,
  },
  scanCornerBottomRight: {
    top: undefined,
    left: undefined,
    right: 0,
    bottom: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopLeftRadius: 0,
    borderBottomRightRadius: borderRadius.xl,
  },
  analyzingInfo: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  analyzingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  analyzingTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  analyzingSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  analyzingSpinner: {
    marginTop: spacing.md,
  },

  // Review Modal Styles
  reviewImageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.background.card,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  reviewImage: {
    width: '100%',
    height: '100%',
  },
  reviewBadgesRow: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  healthScoreBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  healthScoreGood: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  healthScoreMedium: {
    backgroundColor: 'rgba(234, 179, 8, 0.9)',
  },
  healthScoreLow: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  healthScoreText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  retryButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientsCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  ingredientsTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  ingredientChip: {
    backgroundColor: colors.background.input,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  ingredientText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
});
