import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { UtensilsCrossed, Leaf, Sprout, Beef, Percent } from 'lucide-react-native';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const dietOptions = [
  { value: 'none', label: 'No specific diet', IconComponent: UtensilsCrossed },
  { value: 'vegan', label: 'Vegan', IconComponent: Leaf },
  { value: 'vegetarian', label: 'Vegetarian', IconComponent: Sprout },
  { value: 'keto', label: 'Keto', IconComponent: Beef },
  { value: 'paleo', label: 'Paleo', IconComponent: Percent },
];

export default function DietPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset loading state when screen comes into focus (e.g., when navigating back)
  useFocusEffect(
    useCallback(() => {
      setIsLoading(false);
    }, [])
  );

  const handleContinue = async () => {
    if (!selected) return;

    setIsLoading(true);
    await saveOnboardingData({ diet: selected });
    router.push('/onboarding/readiness');
  };

  return (
    <OnboardingShell
      title={
        <Text style={styles.titleText}>
          Do you follow{'\n'}a specific diet?
        </Text>
      }
      subtitle={
        <Text style={styles.subtitleText}>
          This helps us understand{'\n'}your nutrition preferences.
        </Text>
      }
      progress={getStepProgress('diet')}
      footer={
        <PrimaryButton
          onPress={handleContinue}
          disabled={!selected}
          loading={isLoading}
        >
          Next
        </PrimaryButton>
      }
    >
      <View style={styles.optionsContainer}>
        {dietOptions.map((option) => {
          const isSelected = selected === option.value;
          const IconComponent = option.IconComponent;
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
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'left',
    flex: 1,
  },
  optionLabelSelected: {
    color: colors.background.primary,
  },
});
