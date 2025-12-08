import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const experienceOptions = [
  { value: 'never', label: 'לא הצלחתי להתמיד לאורך זמן' },
  { value: 'results', label: 'לא הצלחתי לראות תוצאות' },
  { value: 'knowledge', label: 'אין לי מספיק ידע תזונתי' },
  { value: 'time', label: 'לא מצאתי מספיק זמן' },
  { value: 'sure', label: 'אני לא בטוח/ה' },
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
          מה עצר אותך עד עכשיו{'\n'}מלהגיע למטרה שלך?
        </Text>
      }
      subtitle={
        <Text style={styles.subtitleText}>
          התשובה שלך תעזור לנו להציע פתרון{'\n'}שיהיה מדוייק בשבילך.
        </Text>
      }
      progress={getStepProgress('experience')}
      footer={
        <PrimaryButton onPress={handleContinue} disabled={!selected}>
          הבא
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
    textAlign: 'right',
    lineHeight: 36,
  },
  subtitleText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'right',
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
    textAlign: 'right',
  },
  optionLabelSelected: {
    color: colors.background.primary,
  },
});
