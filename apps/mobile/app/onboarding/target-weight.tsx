import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Slider from '@react-native-community/slider';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing } from '../../lib/theme';

const MIN_WEIGHT = 40;
const MAX_WEIGHT = 120;

export default function TargetWeightPage() {
  const router = useRouter();
  const [targetWeight, setTargetWeight] = useState(70);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getOnboardingData();
      if (data.target_weight_kg) {
        setTargetWeight(data.target_weight_kg);
      } else if (data.weight_kg) {
        setTargetWeight(data.weight_kg);
      }
    })();
  }, []);

  // Reset loading state when screen comes into focus (e.g., when navigating back)
  useFocusEffect(
    useCallback(() => {
      setIsLoading(false);
    }, [])
  );

  const handleContinue = async () => {
    setIsLoading(true);
    await saveOnboardingData({ target_weight_kg: targetWeight });
    router.push('/onboarding/goal-summary');
  };

  return (
    <OnboardingShell
      title="What's your target weight?"
      subtitle={
        <Text style={styles.subtitleText}>
          To know where you're headed,{'\n'}we need to know your goal.
        </Text>
      }
      progress={getStepProgress('target-weight')}
      footer={
        <PrimaryButton onPress={handleContinue} loading={isLoading}>
          Next
        </PrimaryButton>
      }
    >
      <View style={styles.content}>
        {/* Weight Display */}
        <View style={styles.weightDisplay}>
          <Text style={styles.weightValue}>{targetWeight}</Text>
          <Text style={styles.weightUnit}>kg</Text>
        </View>

        {/* Slider */}
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={MIN_WEIGHT}
            maximumValue={MAX_WEIGHT}
            step={1}
            value={targetWeight}
            onValueChange={setTargetWeight}
            minimumTrackTintColor={colors.text.primary}
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor={colors.text.primary}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>120 kg</Text>
            <Text style={styles.sliderLabel}>40 kg</Text>
          </View>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  subtitleText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'left',
    lineHeight: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 80,
  },
  weightValue: {
    fontSize: 72,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  weightUnit: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.6)',
    marginRight: spacing.sm,
  },
  sliderContainer: {
    width: '100%',
    paddingHorizontal: spacing.xl,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sliderLabel: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: typography.weight.medium,
  },
});
