import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const readinessLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function ReadinessPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);

  const handleContinue = async () => {
    if (!selected) return;

    await saveOnboardingData({ readiness: selected });
    router.push('/onboarding/rating');
  };

  const getReadinessLabel = (level: number | null) => {
    if (!level) return '';
    if (level <= 3) return 'Not quite ready';
    if (level <= 5) return 'Getting there';
    if (level <= 7) return 'Ready for change';
    if (level <= 9) return 'Very ready';
    return 'Absolutely ready!';
  };

  return (
    <OnboardingShell
      title={
        <Text style={styles.titleText}>
          How ready are you{'\n'}to start?
        </Text>
      }
      subtitle="Rate your readiness from 1 to 10"
      progress={getStepProgress('readiness')}
      footer={
        <PrimaryButton onPress={handleContinue} disabled={!selected}>
          Next
        </PrimaryButton>
      }
    >
      <View style={styles.content}>
        {/* Selected Level Display */}
        <View style={styles.displayContainer}>
          <Text style={styles.selectedLevel}>
            {selected || '?'}
          </Text>
          <Text style={styles.readinessLabel}>
            {getReadinessLabel(selected)}
          </Text>
        </View>

        {/* Level Buttons */}
        <View style={styles.levelsGrid}>
          {readinessLevels.map((level) => {
            const isSelected = selected === level;
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelButton,
                  isSelected && styles.levelButtonSelected,
                ]}
                onPress={() => setSelected(level)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.levelText,
                    isSelected && styles.levelTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Scale Labels */}
        <View style={styles.scaleLabels}>
          <Text style={styles.scaleLabel}>Not ready</Text>
          <Text style={styles.scaleLabel}>Fully ready</Text>
        </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  displayContainer: {
    alignItems: 'center',
    marginBottom: 56,
  },
  selectedLevel: {
    fontSize: 72,
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
  },
  readinessLabel: {
    fontSize: typography.size.lg,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  levelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    maxWidth: 320,
  },
  levelButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  levelButtonSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  levelText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  levelTextSelected: {
    color: colors.background.primary,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
    marginTop: spacing.lg,
  },
  scaleLabel: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
});
