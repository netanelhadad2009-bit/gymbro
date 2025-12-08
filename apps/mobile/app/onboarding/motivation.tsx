import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const motivationOptions = [
  { value: 'health', label: 'בריאות טובה יותר' },
  { value: 'appearance', label: 'מראה חיצוני' },
  { value: 'energy', label: 'יותר אנרגיה ביום יום' },
  { value: 'confidence', label: 'ביטחון עצמי' },
  { value: 'performance', label: 'שיפור ביצועים ספורטיביים' },
];

export default function MotivationPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selected) return;

    await saveOnboardingData({ motivation: selected });
    router.push('/onboarding/longterm');
  };

  return (
    <OnboardingShell
      title={
        <Text style={styles.titleText}>
          מה הדבר הכי חשוב{'\n'}שתרצה להשיג?
        </Text>
      }
      subtitle="בחר את המוטיבציה העיקרית שלך"
      progress={getStepProgress('motivation')}
      footer={
        <PrimaryButton onPress={handleContinue} disabled={!selected}>
          הבא
        </PrimaryButton>
      }
    >
      <View style={styles.optionsContainer}>
        {motivationOptions.map((option) => {
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
    textAlign: 'right',
    lineHeight: 36,
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
    textAlign: 'right',
  },
  optionLabelSelected: {
    color: colors.background.primary,
  },
});
