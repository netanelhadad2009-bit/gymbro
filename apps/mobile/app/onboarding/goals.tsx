import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronsUp, ArrowDown, Crosshair } from 'lucide-react-native';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

type GoalKey = 'gain' | 'loss' | 'recomp';

const goalOptions: { value: GoalKey; label: string; IconComponent: React.ComponentType<any> }[] = [
  {
    value: 'gain',
    label: 'לעלות במסת שריר',
    IconComponent: ChevronsUp,
  },
  {
    value: 'loss',
    label: 'לרדת באחוזי שומן ולהתחטב',
    IconComponent: ArrowDown,
  },
  {
    value: 'recomp',
    label: 'לשפר הרגלים ולשמור על הגוף',
    IconComponent: Crosshair,
  },
];

export default function GoalsPage() {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<GoalKey | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset loading state when screen comes into focus (e.g., when navigating back)
  useFocusEffect(
    useCallback(() => {
      setIsLoading(false);
    }, [])
  );

  const handleContinue = async () => {
    if (!selectedGoal) return;

    setIsLoading(true);
    await saveOnboardingData({ goals: [selectedGoal] });
    router.push('/onboarding/training-frequency');
  };

  return (
    <OnboardingShell
      title={
        <Text style={styles.titleText}>
          מה אתה רוצה להשיג{'\n'}עם FitJourney?
        </Text>
      }
      subtitle="כל תשובה כאן היא לגיטימית - ומאיתנו נבנה איתך תהליך שמתאים בדיוק לך."
      progress={getStepProgress('goals')}
      footer={
        <PrimaryButton
          onPress={handleContinue}
          disabled={!selectedGoal}
          loading={isLoading}
        >
          הבא
        </PrimaryButton>
      }
    >
      <View style={styles.optionsContainer}>
        {goalOptions.map((option) => {
          const isSelected = selectedGoal === option.value;
          const IconComponent = option.IconComponent;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => setSelectedGoal(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <IconComponent
                  size={24}
                  color={isSelected ? colors.background.primary : colors.text.secondary}
                />
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
  optionLabel: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  optionLabelSelected: {
    color: colors.background.primary,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
