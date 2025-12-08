import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const MIN_PACE = 0.1;
const MAX_PACE = 1.5;
const RECOMMENDED_PACE = 0.8;
const STEP = 0.1;

// Get recommendation based on pace value
const getRecommendation = (pace: number): { message: string; type: 'slow' | 'recommended' | 'fast' | 'danger' } => {
  if (pace < 0.4) {
    return { message: 'איטי מאוד – אפשר להגביר', type: 'slow' };
  } else if (pace < 0.7) {
    return { message: 'איטי אבל בטוח', type: 'slow' };
  } else if (pace <= 0.9) {
    return { message: `מומלץ: ${pace.toFixed(1)} ק״ג לשבוע`, type: 'recommended' };
  } else if (pace <= 1.2) {
    return { message: 'מהיר – ודא התאוששות טובה', type: 'fast' };
  } else {
    return { message: 'מהיר מדי – שקול להאט', type: 'danger' };
  }
};

export default function PacePage() {
  const router = useRouter();
  const [pace, setPace] = useState(RECOMMENDED_PACE);

  const recommendation = getRecommendation(pace);

  // Get slider track color based on recommendation type
  const getSliderColor = () => {
    switch (recommendation.type) {
      case 'recommended':
        return colors.accent.primary;
      case 'fast':
        return '#f6c453';
      case 'danger':
        return '#f87171';
      default:
        return 'rgba(255,255,255,0.5)';
    }
  };

  const handleContinue = async () => {
    await saveOnboardingData({ weekly_pace_kg: pace });
    router.push('/onboarding/activity');
  };

  return (
    <OnboardingShell
      title={
        <Text style={styles.titleText}>
          באיזה קצב תרצה{'\n'}להגיע למטרה?
        </Text>
      }
      subtitle="קצב ירידה במשקל לשבוע"
      progress={getStepProgress('pace')}
      footer={
        <PrimaryButton onPress={handleContinue}>
          הבא
        </PrimaryButton>
      }
    >
      <View style={styles.content}>
        {/* Large Value Display */}
        <View style={styles.valueDisplay}>
          <Text style={styles.valueUnit}>ק״ג</Text>
          <Text style={styles.valueNumber}>{pace.toFixed(1)}</Text>
        </View>

        {/* Slider */}
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={MIN_PACE}
            maximumValue={MAX_PACE}
            step={STEP}
            value={pace}
            onValueChange={setPace}
            minimumTrackTintColor={getSliderColor()}
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#FFFFFF"
          />

          {/* Min/Max Labels */}
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>{MIN_PACE} ק״ג</Text>
            <Text style={styles.sliderLabel}>{MAX_PACE} ק״ג</Text>
          </View>
        </View>

        {/* Dynamic Recommendation Badge */}
        <View style={[
          styles.recommendedBadge,
          recommendation.type === 'recommended' && styles.badgeRecommended,
          recommendation.type === 'fast' && styles.badgeFast,
          recommendation.type === 'danger' && styles.badgeDanger,
          recommendation.type === 'slow' && styles.badgeSlow,
        ]}>
          <Text style={[
            styles.recommendedText,
            recommendation.type === 'recommended' && styles.textRecommended,
            recommendation.type === 'fast' && styles.textFast,
            recommendation.type === 'danger' && styles.textDanger,
            recommendation.type === 'slow' && styles.textSlow,
          ]}>
            {recommendation.message}
          </Text>
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
    textAlign: 'right',
    lineHeight: 36,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 80,
  },
  valueNumber: {
    fontSize: 72,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  valueUnit: {
    fontSize: typography.size.xl,
    color: colors.text.tertiary,
    marginRight: spacing.sm,
  },
  sliderContainer: {
    width: '100%',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
  sliderLabel: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: 50,
  },
  recommendedText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  // Recommended (green) - 0.7-0.9 kg
  badgeRecommended: {
    backgroundColor: 'rgba(226, 241, 99, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(226, 241, 99, 0.3)',
  },
  textRecommended: {
    color: colors.accent.primary,
  },
  // Fast (amber) - 0.9-1.2 kg
  badgeFast: {
    backgroundColor: 'rgba(246, 196, 83, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(246, 196, 83, 0.3)',
  },
  textFast: {
    color: '#f6c453',
  },
  // Danger (red) - > 1.2 kg
  badgeDanger: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  textDanger: {
    color: '#f87171',
  },
  // Slow (white/neutral) - < 0.7 kg
  badgeSlow: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textSlow: {
    color: colors.text.secondary,
  },
});
