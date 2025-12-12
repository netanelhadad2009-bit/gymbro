import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

type ActivityLevel = 'sedentary' | 'light' | 'high';

const activityOptions: { value: ActivityLevel; title: string; subtitle: string; bars: number }[] = [
  {
    value: 'sedentary',
    title: 'Sedentary',
    subtitle: 'Sitting most of the day',
    bars: 1,
  },
  {
    value: 'light',
    title: 'Light activity',
    subtitle: 'Moving around during the day',
    bars: 2,
  },
  {
    value: 'high',
    title: 'High activity',
    subtitle: 'Physical work or on feet all day',
    bars: 3,
  },
];

function ActivityBars({ count, selected }: { count: number; selected: boolean }) {
  const activeColor = selected ? colors.background.primary : colors.text.secondary;
  const inactiveColor = selected ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';

  return (
    <View style={styles.barsContainer}>
      {[1, 2, 3].map((bar) => (
        <View
          key={bar}
          style={[
            styles.bar,
            {
              backgroundColor: bar <= count ? activeColor : inactiveColor,
              height: 8 + bar * 6,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function ActivityPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<ActivityLevel | null>(null);
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
    await saveOnboardingData({ activity: selected });
    router.push('/onboarding/diet');
  };

  return (
    <OnboardingShell
      title={
        <Text style={styles.titleText}>
          What's your{'\n'}daily activity level?
        </Text>
      }
      subtitle={
        <Text style={styles.subtitleText}>
          This helps us personalize{'\n'}your nutrition plan perfectly.
        </Text>
      }
      progress={getStepProgress('activity')}
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
        {activityOptions.map((option) => {
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
                <ActivityBars count={option.bars} selected={isSelected} />
              </View>
              <View style={styles.textContainer}>
                <Text
                  style={[
                    styles.optionTitle,
                    isSelected && styles.optionTitleSelected,
                  ]}
                >
                  {option.title}
                </Text>
                <Text
                  style={[
                    styles.optionSubtitle,
                    isSelected && styles.optionSubtitleSelected,
                  ]}
                >
                  {option.subtitle}
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
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'left',
  },
  optionTitleSelected: {
    color: colors.background.primary,
  },
  optionSubtitle: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'left',
    marginTop: spacing.xs,
  },
  optionSubtitleSelected: {
    color: 'rgba(0,0,0,0.7)',
  },
  barsContainer: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-end',
  },
  bar: {
    width: 6,
    borderRadius: 2,
  },
});
