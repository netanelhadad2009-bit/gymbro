import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const experienceOptions = [
  { value: 'never', label: 'Struggled to stay consistent' },
  { value: 'results', label: 'Didn\'t see results' },
  { value: 'knowledge', label: 'Lack nutrition knowledge' },
  { value: 'time', label: 'Couldn\'t find enough time' },
  { value: 'sure', label: 'I\'m not sure' },
];

export default function ExperiencePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selected) return;

    await saveOnboardingData({ experience: selected });
    router.push('/onboarding/motivation');
  };

  return (
    <OnboardingShell
      title={
        <Text style={styles.titleText}>
          What's stopped you{'\n'}from reaching your goal?
        </Text>
      }
      subtitle={
        <Text style={styles.subtitleText}>
          Your answer helps us tailor{'\n'}the perfect solution for you.
        </Text>
      }
      progress={getStepProgress('experience')}
      footer={
        <PrimaryButton onPress={handleContinue} disabled={!selected}>
          Next
        </PrimaryButton>
      }
    >
      <View style={styles.optionsContainer}>
        {experienceOptions.map((option) => {
          const isSelected = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => setSelected(option.value)}
              activeOpacity={0.7}
            >
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
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  titleText: {
    fontSize: 28,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'left',
    lineHeight: 36,
  },
  subtitleText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'left',
    lineHeight: 24,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionButton: {
    minHeight: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  optionButtonSelected: {
    backgroundColor: colors.accent.primary,
  },
  optionLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    textAlign: 'left',
  },
  optionLabelSelected: {
    color: colors.background.primary,
  },
});
