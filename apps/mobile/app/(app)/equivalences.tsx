/**
 * Equivalences Management Screen
 * Allows users to add/edit/delete custom food and exercise equivalences
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Pizza,
  Coffee,
  Cookie,
  Beef,
  Footprints,
  Bike,
  Dumbbell,
  Apple,
  Croissant,
  IceCream,
  Salad,
  Sandwich,
  Wine,
  Flame,
  Heart,
  Waves,
  Mountain,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const STORAGE_KEY = '@gymbro/equivalences';

// Available icons for selection
const FOOD_ICONS = [
  { name: 'Pizza', icon: Pizza },
  { name: 'Coffee', icon: Coffee },
  { name: 'Cookie', icon: Cookie },
  { name: 'Beef', icon: Beef },
  { name: 'Apple', icon: Apple },
  { name: 'Croissant', icon: Croissant },
  { name: 'IceCream', icon: IceCream },
  { name: 'Salad', icon: Salad },
  { name: 'Sandwich', icon: Sandwich },
  { name: 'Wine', icon: Wine },
];

const EXERCISE_ICONS = [
  { name: 'Footprints', icon: Footprints },
  { name: 'Bike', icon: Bike },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Flame', icon: Flame },
  { name: 'Heart', icon: Heart },
  { name: 'Waves', icon: Waves },
  { name: 'Mountain', icon: Mountain },
];

export type FoodEquivalence = {
  id: string;
  name: string;
  calories: number;
  iconName: string;
  color: string;
  enabled: boolean;
};

export type ExerciseEquivalence = {
  id: string;
  name: string;
  caloriesPerMin: number;
  iconName: string;
  color: string;
  enabled: boolean;
};

// Default equivalences
const DEFAULT_FOOD_EQUIVALENCES: FoodEquivalence[] = [
  { id: '1', name: 'Pizza slices', calories: 285, iconName: 'Pizza', color: colors.accent.orange, enabled: true },
  { id: '2', name: 'Cookies', calories: 150, iconName: 'Cookie', color: colors.accent.pink, enabled: true },
  { id: '3', name: 'Lattes', calories: 190, iconName: 'Coffee', color: '#8B4513', enabled: false },
  { id: '4', name: 'Burgers', calories: 540, iconName: 'Beef', color: colors.accent.orange, enabled: false },
];

const DEFAULT_EXERCISE_EQUIVALENCES: ExerciseEquivalence[] = [
  { id: '1', name: 'Walking', caloriesPerMin: 5, iconName: 'Footprints', color: colors.accent.primary, enabled: true },
  { id: '2', name: 'Cycling', caloriesPerMin: 10, iconName: 'Bike', color: colors.accent.blue, enabled: true },
  { id: '3', name: 'Weights', caloriesPerMin: 8, iconName: 'Dumbbell', color: colors.accent.pink, enabled: false },
  { id: '4', name: 'Running', caloriesPerMin: 12, iconName: 'Flame', color: colors.accent.orange, enabled: false },
];

const ACCENT_COLORS = [
  colors.accent.primary,
  colors.accent.orange,
  colors.accent.pink,
  colors.accent.blue,
  '#8B4513',
  '#9333EA',
  '#059669',
  '#DC2626',
];

function getIconComponent(iconName: string, type: 'food' | 'exercise') {
  const icons = type === 'food' ? FOOD_ICONS : EXERCISE_ICONS;
  const found = icons.find(i => i.name === iconName);
  return found?.icon || (type === 'food' ? Pizza : Footprints);
}

export default function EquivalencesScreen() {
  const router = useRouter();
  const [foodEquivalences, setFoodEquivalences] = useState<FoodEquivalence[]>(DEFAULT_FOOD_EQUIVALENCES);
  const [exerciseEquivalences, setExerciseEquivalences] = useState<ExerciseEquivalence[]>(DEFAULT_EXERCISE_EQUIVALENCES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<(FoodEquivalence | ExerciseEquivalence) | null>(null);
  const [modalType, setModalType] = useState<'food' | 'exercise'>('food');

  // Form state
  const [formName, setFormName] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formIcon, setFormIcon] = useState('Pizza');
  const [formColor, setFormColor] = useState(colors.accent.primary);

  // Load saved equivalences
  useEffect(() => {
    loadEquivalences();
  }, []);

  const loadEquivalences = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { food, exercise } = JSON.parse(saved);
        if (food) setFoodEquivalences(food);
        if (exercise) setExerciseEquivalences(exercise);
      }
    } catch (error) {
      console.error('Failed to load equivalences:', error);
    }
  };

  const saveEquivalences = async (food: FoodEquivalence[], exercise: ExerciseEquivalence[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ food, exercise }));
    } catch (error) {
      console.error('Failed to save equivalences:', error);
    }
  };

  const handleToggleEnabled = (id: string, type: 'food' | 'exercise') => {
    if (type === 'food') {
      const updated = foodEquivalences.map(item =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      );
      setFoodEquivalences(updated);
      saveEquivalences(updated, exerciseEquivalences);
    } else {
      const updated = exerciseEquivalences.map(item =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      );
      setExerciseEquivalences(updated);
      saveEquivalences(foodEquivalences, updated);
    }
  };

  const handleDelete = (id: string, type: 'food' | 'exercise') => {
    Alert.alert(
      'Delete Equivalence',
      'Are you sure you want to delete this equivalence?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (type === 'food') {
              const updated = foodEquivalences.filter(item => item.id !== id);
              setFoodEquivalences(updated);
              saveEquivalences(updated, exerciseEquivalences);
            } else {
              const updated = exerciseEquivalences.filter(item => item.id !== id);
              setExerciseEquivalences(updated);
              saveEquivalences(foodEquivalences, updated);
            }
          },
        },
      ]
    );
  };

  const openAddModal = (type: 'food' | 'exercise') => {
    setModalType(type);
    setEditingItem(null);
    setFormName('');
    setFormCalories('');
    setFormIcon(type === 'food' ? 'Pizza' : 'Footprints');
    setFormColor(colors.accent.primary);
    setShowAddModal(true);
  };

  const openEditModal = (item: FoodEquivalence | ExerciseEquivalence, type: 'food' | 'exercise') => {
    setModalType(type);
    setEditingItem(item);
    setFormName(item.name);
    setFormCalories(type === 'food' ? (item as FoodEquivalence).calories.toString() : (item as ExerciseEquivalence).caloriesPerMin.toString());
    setFormIcon(item.iconName);
    setFormColor(item.color);
    setShowAddModal(true);
  };

  const handleSave = () => {
    if (!formName.trim() || !formCalories) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const caloriesNum = parseFloat(formCalories);
    if (isNaN(caloriesNum) || caloriesNum <= 0) {
      Alert.alert('Error', 'Please enter a valid calorie value');
      return;
    }

    if (modalType === 'food') {
      const newItem: FoodEquivalence = {
        id: editingItem?.id || Date.now().toString(),
        name: formName.trim(),
        calories: caloriesNum,
        iconName: formIcon,
        color: formColor,
        enabled: editingItem ? (editingItem as FoodEquivalence).enabled : true,
      };

      let updated: FoodEquivalence[];
      if (editingItem) {
        updated = foodEquivalences.map(item => item.id === editingItem.id ? newItem : item);
      } else {
        updated = [...foodEquivalences, newItem];
      }
      setFoodEquivalences(updated);
      saveEquivalences(updated, exerciseEquivalences);
    } else {
      const newItem: ExerciseEquivalence = {
        id: editingItem?.id || Date.now().toString(),
        name: formName.trim(),
        caloriesPerMin: caloriesNum,
        iconName: formIcon,
        color: formColor,
        enabled: editingItem ? (editingItem as ExerciseEquivalence).enabled : true,
      };

      let updated: ExerciseEquivalence[];
      if (editingItem) {
        updated = exerciseEquivalences.map(item => item.id === editingItem.id ? newItem : item);
      } else {
        updated = [...exerciseEquivalences, newItem];
      }
      setExerciseEquivalences(updated);
      saveEquivalences(foodEquivalences, updated);
    }

    setShowAddModal(false);
  };

  const renderEquivalenceItem = (
    item: FoodEquivalence | ExerciseEquivalence,
    type: 'food' | 'exercise'
  ) => {
    const IconComponent = getIconComponent(item.iconName, type);
    const calorieValue = type === 'food'
      ? `${(item as FoodEquivalence).calories} kcal`
      : `${(item as ExerciseEquivalence).caloriesPerMin} kcal/min`;

    return (
      <View key={item.id} style={[styles.itemCard, !item.enabled && styles.itemCardDisabled]}>
        <TouchableOpacity
          style={styles.itemToggle}
          onPress={() => handleToggleEnabled(item.id, type)}
        >
          <View style={[styles.itemIconBg, { backgroundColor: `${item.color}20` }]}>
            <IconComponent size={24} color={item.enabled ? item.color : colors.text.muted} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, !item.enabled && styles.itemNameDisabled]}>
              {item.name}
            </Text>
            <Text style={styles.itemCalories}>{calorieValue}</Text>
          </View>
          <View style={[styles.toggleSwitch, item.enabled && styles.toggleSwitchActive]}>
            <View style={[styles.toggleKnob, item.enabled && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openEditModal(item, type)}
          >
            <Edit3 size={18} color={colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item.id, type)}
          >
            <Trash2 size={18} color={colors.semantic.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(app)/progress')}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Equivalences</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text style={styles.description}>
          Customize how your calories are displayed. Enable the equivalences you want to see on your Progress page.
        </Text>

        {/* Food Equivalences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Food Equivalences</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openAddModal('food')}
            >
              <Plus size={18} color={colors.background.primary} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            Shows how many of each food item equals your calories
          </Text>

          {foodEquivalences.map(item => renderEquivalenceItem(item, 'food'))}
        </View>

        {/* Exercise Equivalences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercise Equivalences</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openAddModal('exercise')}
            >
              <Plus size={18} color={colors.background.primary} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            Shows how long to exercise to burn off your calories
          </Text>

          {exerciseEquivalences.map(item => renderEquivalenceItem(item, 'exercise'))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit' : 'Add'} {modalType === 'food' ? 'Food' : 'Exercise'} Equivalence
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                value={formName}
                onChangeText={setFormName}
                placeholder={modalType === 'food' ? 'e.g., Pizza slices' : 'e.g., Running'}
                placeholderTextColor={colors.text.muted}
              />
            </View>

            {/* Calories Input */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {modalType === 'food' ? 'Calories per item' : 'Calories burned per minute'}
              </Text>
              <TextInput
                style={styles.formInput}
                value={formCalories}
                onChangeText={setFormCalories}
                placeholder={modalType === 'food' ? 'e.g., 285' : 'e.g., 12'}
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
              />
            </View>

            {/* Icon Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Icon</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.iconScroll}
              >
                {(modalType === 'food' ? FOOD_ICONS : EXERCISE_ICONS).map(({ name, icon: Icon }) => (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.iconOption,
                      formIcon === name && styles.iconOptionSelected,
                    ]}
                    onPress={() => setFormIcon(name)}
                  >
                    <Icon size={24} color={formIcon === name ? formColor : colors.text.secondary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Color Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {ACCENT_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setFormColor(color)}
                  />
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={styles.previewCard}>
                <View style={[styles.previewIconBg, { backgroundColor: `${formColor}20` }]}>
                  {React.createElement(getIconComponent(formIcon, modalType), {
                    size: 28,
                    color: formColor,
                  })}
                </View>
                <Text style={styles.previewName}>{formName || 'Item name'}</Text>
                <Text style={styles.previewCalories}>
                  {formCalories || '0'} {modalType === 'food' ? 'kcal' : 'kcal/min'}
                </Text>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {editingItem ? 'Save Changes' : 'Add Equivalence'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  description: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing['3xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginBottom: spacing.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.background.primary,
  },
  itemCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCardDisabled: {
    opacity: 0.6,
  },
  itemToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  itemNameDisabled: {
    color: colors.text.muted,
  },
  itemCalories: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.card,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: colors.accent.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text.muted,
  },
  toggleKnobActive: {
    backgroundColor: colors.background.primary,
    alignSelf: 'flex-end',
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPadding: {
    height: 100,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  modalCancel: {
    fontSize: typography.size.base,
    color: colors.accent.primary,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  iconScroll: {
    marginTop: spacing.xs,
  },
  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: `${colors.accent.primary}20`,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.text.primary,
  },
  preview: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  previewLabel: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  previewCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  previewIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  previewName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  previewCalories: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },
});
