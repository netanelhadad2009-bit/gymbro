import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

type FrequencyValue = 'low' | 'medium' | 'high';

const options: { value: FrequencyValue; label: string; caption: string; dots: number }[] = [
  {
    value: 'low',
    label: '0–2 אימונים',
    caption: 'מתאמן לפעמים',
    dots: 1,
  },
  {
    value: 'medium',
    label: '3–5 אימונים',
    caption: 'מתאמן באופן קבוע',
    dots: 3,
  },
  {
    value: 'high',
    label: '6+ אימונים',
    caption: 'מתאמן מקצועי / ספורטאי ייעודי',
    dots: 6,
  },
];

function DotIcon({ count, selected }: { count: number; selected: boolean }) {
  const color = selected ? colors.background.primary : colors.text.secondary;
  // Show max 3 dots in a row
  const rows = count <= 3 ? 1 : 2;
  const dotsPerRow = count <= 3 ? count : 3;

  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: color }]}
        />
      ))}
    </View>
  );
}

export default function TrainingFrequencyPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<FrequencyValue | null>(null);

  const handleContinue = async () => {
    if (!selected) return;

    await saveOnboardingData({ training_frequency_actual: selected });
    router.push('/onboarding/experience');
  };

  return (
    <OnboardingShell
      title={
        <Text style={styles.titleText}>
          כמה אימונים אתה עושה{'\n'}בשבוע?
        </Text>
      }
      subtitle={
        <Text style={styles.subtitleText}>
          זה יעזור לנו להבין את רמת הפעילות שלך{'\n'}ולהתאים את התוכנית האישית.
        </Text>
      }
      progress={getStepProgress('training-frequency')}
      footer={
        <PrimaryButton onPress={handleContinue} disabled={!selected}>
          הבא
        </PrimaryButton>
      }
    >
      <View style={styles.optionsContainer}>
        {options.map((option) => {
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
              <View style={styles.iconContainer}>
                <DotIcon count={option.dots} selected={isSelected} />
              </View>
              <View style={styles.textContainer}>
                <Text
                  style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionCaption,
                    isSelected && styles.optionCaptionSelected,
                  ]}
                >
                  {option.caption}
                </Text>
              </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.md,
  },
  optionButtonSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  textContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'right',
  },
  optionLabelSelected: {
    color: colors.background.primary,
  },
  optionCaption: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  optionCaptionSelected: {
    color: 'rgba(0,0,0,0.7)',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    maxWidth: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
