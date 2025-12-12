import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const genderOptions = [
  { value: 'male', label: 'Male', symbol: '♂' },
  { value: 'female', label: 'Female', symbol: '♀' },
  { value: 'other', label: 'Other', symbol: '⚥' },
] as const;

type GenderValue = typeof genderOptions[number]['value'];

export default function GenderPage() {
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState<GenderValue>('female');

  const handleContinue = async () => {
    await saveOnboardingData({ gender: selectedGender });
    router.push('/onboarding/goals');
  };

  const titleText = selectedGender === 'male'
    ? 'Select your gender'
    : selectedGender === 'female'
    ? 'Select your gender'
    : 'Select your gender';

  const subtitleText = 'We\'ll use this to personalize your plan.';

  return (
    <OnboardingShell
      title={titleText}
      subtitle={subtitleText}
      progress={getStepProgress('gender')}
      disableScroll
      footer={
        <PrimaryButton onPress={handleContinue}>
          Next
        </PrimaryButton>
      }
    >
      <View style={styles.container}>
        <View style={styles.optionsContainer}>
          {genderOptions.map((option) => {
            const isSelected = selectedGender === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedGender(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <Text style={[
                    styles.symbolText,
                    isSelected && styles.symbolTextSelected,
                  ]}>
                    {option.symbol}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    width: '100%',
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.md,
  },
  optionCardSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolText: {
    fontSize: 28,
    color: colors.text.secondary,
  },
  symbolTextSelected: {
    color: colors.background.primary,
  },
  optionLabel: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'left',
  },
  optionLabelSelected: {
    color: colors.background.primary,
  },
});
