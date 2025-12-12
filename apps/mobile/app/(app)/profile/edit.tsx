import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, borderRadius } from '@/lib/theme';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ProfileData {
  gender?: string;
  date_of_birth?: string;
  weight?: number;
  target_weight?: number;
  height_cm?: number;
  goal?: string | null;
  diet_type?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

// ============================================================================
// OPTIONS
// ============================================================================

const GENDER_OPTIONS: SelectOption[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const GOAL_OPTIONS: SelectOption[] = [
  { value: 'gain', label: 'Build Muscle' },
  { value: 'loss', label: 'Lose Weight' },
  { value: 'recomp', label: 'Body Recomposition' },
];

const DIET_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'No specific diet' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
];

// Generate year options
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS: SelectOption[] = Array.from({ length: 87 }, (_, i) => {
  const year = currentYear - i - 13;
  return { value: String(year), label: String(year) };
});

const MONTH_OPTIONS: SelectOption[] = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const DAY_OPTIONS: SelectOption[] = Array.from({ length: 31 }, (_, i) => {
  const day = String(i + 1).padStart(2, '0');
  return { value: day, label: String(i + 1) };
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateAge(birthDate: string | null): string {
  if (!birthDate) return '';
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return String(age);
  } catch {
    return '';
  }
}

function getOptionLabel(options: SelectOption[], value: string): string {
  return options.find(opt => opt.value === value)?.label || value || 'Select';
}

// ============================================================================
// PICKER MODAL COMPONENT
// ============================================================================

function PickerModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = item.value === selectedValue;
              return (
                <TouchableOpacity
                  style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                    {item.label}
                  </Text>
                  {isSelected && <Check size={20} color={colors.accent.primary} />}
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    gender: 'male',
    date_of_birth: '',
    weight: 0,
    target_weight: 0,
    height_cm: 0,
    goal: 'loss',
    diet_type: 'none',
  });

  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      const dateStr = `${birthYear}-${birthMonth}-${birthDay}`;
      setProfile(prev => ({ ...prev, date_of_birth: dateStr }));
    }
  }, [birthYear, birthMonth, birthDay]);

  async function loadProfile() {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace('/(auth)/');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: programData } = await supabase
        .from('programs')
        .select('goal, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const metadata = user.user_metadata || {};
      const resolvedGoal = programData?.goal ?? profileData?.goal ?? metadata?.goal ?? 'loss';
      const rawDateOfBirth = profileData?.date_of_birth || profileData?.birthdate || metadata.birthdate || metadata.date_of_birth;

      if (rawDateOfBirth) {
        const date = new Date(rawDateOfBirth);
        if (!isNaN(date.getTime())) {
          setBirthYear(String(date.getFullYear()));
          setBirthMonth(String(date.getMonth() + 1).padStart(2, '0'));
          setBirthDay(String(date.getDate()).padStart(2, '0'));
        }
      }

      setProfile({
        gender: profileData?.gender || metadata.gender || 'male',
        date_of_birth: rawDateOfBirth || '',
        weight: profileData?.weight || profileData?.weight_kg || metadata.weight_kg || metadata.weight || 0,
        target_weight: profileData?.target_weight || profileData?.target_weight_kg || metadata.target_weight_kg || metadata.target_weight || 0,
        height_cm: profileData?.height_cm || metadata.height_cm || metadata.height || 0,
        goal: resolvedGoal,
        diet_type: profileData?.diet_type || profileData?.diet || metadata.diet || metadata.diet_type || 'none',
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/(auth)/');
        return;
      }

      let calculatedAge: number | null = null;
      if (profile.date_of_birth) {
        const birthDateObj = new Date(profile.date_of_birth);
        const today = new Date();
        calculatedAge = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
          calculatedAge--;
        }
        if (calculatedAge < 13 || calculatedAge > 120) calculatedAge = null;
      }

      const normalizedGender = profile.gender;
      const normalizedGoal = profile.goal === 'recomp' ? 'maintain' : profile.goal;
      const normalizedDiet = profile.diet_type === 'none' ? 'regular' : profile.diet_type;

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          gender: normalizedGender,
          age: calculatedAge,
          birthdate: profile.date_of_birth,
          weight_kg: profile.weight,
          target_weight_kg: profile.target_weight,
          height_cm: profile.height_cm,
          goal: normalizedGoal,
          diet: normalizedDiet,
        },
      });

      if (metadataError) {
        Alert.alert('Error', `Failed to save profile: ${metadataError.message}`);
        setSaving(false);
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          age: calculatedAge,
          birthdate: profile.date_of_birth || null,
          gender: normalizedGender || null,
          height_cm: profile.height_cm || null,
          weight_kg: profile.weight || null,
          target_weight_kg: profile.target_weight || null,
          goal: normalizedGoal || null,
          diet: normalizedDiet || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (profileError) {
        Alert.alert('Error', `Failed to save profile: ${profileError.message}`);
        setSaving(false);
        return;
      }

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.replace('/(app)/profile') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', `Failed to save profile: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const age = calculateAge(profile.date_of_birth);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gender */}
        <Text style={styles.label}>Gender</Text>
        <TouchableOpacity style={styles.selectButton} onPress={() => setActiveModal('gender')}>
          <Text style={styles.selectButtonText}>{getOptionLabel(GENDER_OPTIONS, profile.gender || '')}</Text>
          <ChevronDown size={20} color={colors.text.muted} />
        </TouchableOpacity>

        {/* Age */}
        <Text style={styles.label}>Age{age ? ` (${age} years)` : ''}</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={[styles.selectButton, styles.dateButton]} onPress={() => setActiveModal('year')}>
            <Text style={styles.selectButtonText}>{birthYear || 'Year'}</Text>
            <ChevronDown size={16} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectButton, styles.dateButton]} onPress={() => setActiveModal('month')}>
            <Text style={styles.selectButtonText}>{birthMonth ? MONTH_OPTIONS.find(m => m.value === birthMonth)?.label?.slice(0, 3) : 'Month'}</Text>
            <ChevronDown size={16} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectButton, styles.dateButton]} onPress={() => setActiveModal('day')}>
            <Text style={styles.selectButtonText}>{birthDay ? parseInt(birthDay) : 'Day'}</Text>
            <ChevronDown size={16} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Weight */}
        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          style={styles.input}
          value={profile.weight ? String(profile.weight) : ''}
          onChangeText={(value) => setProfile({ ...profile, weight: Number(value) || 0 })}
          keyboardType="numeric"
          placeholder="Enter weight"
          placeholderTextColor={colors.text.muted}
        />

        {/* Target Weight */}
        <Text style={styles.label}>Target Weight (kg)</Text>
        <TextInput
          style={styles.input}
          value={profile.target_weight ? String(profile.target_weight) : ''}
          onChangeText={(value) => setProfile({ ...profile, target_weight: Number(value) || 0 })}
          keyboardType="numeric"
          placeholder="Enter target weight"
          placeholderTextColor={colors.text.muted}
        />

        {/* Height */}
        <Text style={styles.label}>Height (cm)</Text>
        <TextInput
          style={styles.input}
          value={profile.height_cm ? String(profile.height_cm) : ''}
          onChangeText={(value) => setProfile({ ...profile, height_cm: Number(value) || 0 })}
          keyboardType="numeric"
          placeholder="Enter height"
          placeholderTextColor={colors.text.muted}
        />

        {/* Goal */}
        <Text style={styles.label}>Goal</Text>
        <TouchableOpacity style={styles.selectButton} onPress={() => setActiveModal('goal')}>
          <Text style={styles.selectButtonText}>{getOptionLabel(GOAL_OPTIONS, profile.goal || '')}</Text>
          <ChevronDown size={20} color={colors.text.muted} />
        </TouchableOpacity>

        {/* Diet Type */}
        <Text style={styles.label}>Diet Type</Text>
        <TouchableOpacity style={styles.selectButton} onPress={() => setActiveModal('diet')}>
          <Text style={styles.selectButtonText}>{getOptionLabel(DIET_OPTIONS, profile.diet_type || '')}</Text>
          <ChevronDown size={20} color={colors.text.muted} />
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.background.primary} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.push('/(app)/profile')}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <PickerModal
        visible={activeModal === 'gender'}
        title="Select Gender"
        options={GENDER_OPTIONS}
        selectedValue={profile.gender || ''}
        onSelect={(value) => setProfile({ ...profile, gender: value })}
        onClose={() => setActiveModal(null)}
      />
      <PickerModal
        visible={activeModal === 'goal'}
        title="Select Goal"
        options={GOAL_OPTIONS}
        selectedValue={profile.goal || ''}
        onSelect={(value) => setProfile({ ...profile, goal: value })}
        onClose={() => setActiveModal(null)}
      />
      <PickerModal
        visible={activeModal === 'diet'}
        title="Select Diet Type"
        options={DIET_OPTIONS}
        selectedValue={profile.diet_type || ''}
        onSelect={(value) => setProfile({ ...profile, diet_type: value })}
        onClose={() => setActiveModal(null)}
      />
      <PickerModal
        visible={activeModal === 'year'}
        title="Select Year"
        options={YEAR_OPTIONS}
        selectedValue={birthYear}
        onSelect={setBirthYear}
        onClose={() => setActiveModal(null)}
      />
      <PickerModal
        visible={activeModal === 'month'}
        title="Select Month"
        options={MONTH_OPTIONS}
        selectedValue={birthMonth}
        onSelect={setBirthMonth}
        onClose={() => setActiveModal(null)}
      />
      <PickerModal
        visible={activeModal === 'day'}
        title="Select Day"
        options={DAY_OPTIONS}
        selectedValue={birthDay}
        onSelect={setBirthDay}
        onClose={() => setActiveModal(null)}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: typography.size.base,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 140, // Extra space to prevent tab bar from hiding content
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
    height: 50,
    textAlign: 'left',
  },
  selectButton: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateButton: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing['2xl'],
    height: 52,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  modalOptionSelected: {
    backgroundColor: `${colors.accent.primary}15`,
  },
  modalOptionText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  modalOptionTextSelected: {
    color: colors.accent.primary,
    fontWeight: typography.weight.semibold,
  },
  modalCancelButton: {
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  modalCancelText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.semantic.error,
    textAlign: 'center',
  },
});
