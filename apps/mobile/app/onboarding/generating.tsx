import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../lib/theme';
import { getOnboardingData } from '../../lib/onboarding-storage';
import { generateNutritionPlan, generateJourneyStages } from '../../lib/api';
import { saveProgramDraft } from '../../lib/program-draft';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MESSAGES = [
  'מתחיל...',
  'מכין תוכנית תזונה...',
  'מחשב קלוריות יומיות...',
  'בונה תפריט מותאם אישית...',
  'מייצר שלבי מסע...',
  'התוכניות מוכנות!',
];

type GenerationStatus = 'idle' | 'generating' | 'success';

export default function GeneratingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const generationStarted = useRef(false);

  // Run the generation process
  useEffect(() => {
    if (generationStarted.current) return;
    generationStarted.current = true;

    runGeneration();
  }, []);

  const runGeneration = async () => {
    setStatus('generating');
    setMessageIndex(0);
    setProgress(0);
    animatedProgress.setValue(0);

    // Start progress animation (visual feedback while generating)
    const progressAnimation = Animated.timing(animatedProgress, {
      toValue: 85, // Stop at 85% during generation
      duration: 30000, // 30 seconds max
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    progressAnimation.start();

    try {
      // Get onboarding data
      const onboardingData = await getOnboardingData();

      // Log all collected data for debugging
      console.log('=== ONBOARDING DATA ===');
      console.log('Gender:', onboardingData.gender);
      console.log('Goals:', onboardingData.goals);
      console.log('Training Frequency:', onboardingData.training_frequency_actual);
      console.log('Experience:', onboardingData.experience);
      console.log('Height (cm):', onboardingData.height_cm);
      console.log('Weight (kg):', onboardingData.weight_kg);
      console.log('Birthdate:', onboardingData.birthdate);
      console.log('Target Weight (kg):', onboardingData.target_weight_kg);
      console.log('Weekly Pace (kg):', onboardingData.weekly_pace_kg);
      console.log('Activity:', onboardingData.activity);
      console.log('Diet:', onboardingData.diet);
      console.log('Readiness:', onboardingData.readiness);
      console.log('Notifications:', onboardingData.notifications_opt_in);
      console.log('=======================');

      // Generate nutrition plan
      setMessageIndex(1); // "מכין תוכנית תזונה..."
      const nutritionResult = await generateNutritionPlan(onboardingData, { timeout: 90000 });

      if (!nutritionResult.ok) {
        console.warn('[Generating] Nutrition generation failed:', nutritionResult.error);
        // Continue even if nutrition fails - we can retry later
      } else {
        console.log('[Generating] Nutrition plan generated:', nutritionResult.calories);
        setMessageIndex(3); // "בונה תפריט מותאם אישית..."
      }

      // Generate journey stages
      setMessageIndex(4); // "מייצר שלבי מסע..."
      const stagesResult = await generateJourneyStages(onboardingData, { timeout: 30000 });

      if (!stagesResult.ok) {
        console.warn('[Generating] Stages generation failed:', stagesResult.error);
        // Continue even if stages fail
      } else {
        console.log('[Generating] Stages generated:', stagesResult.count);
      }

      // Save program draft
      await saveProgramDraft({
        days: 1,
        nutritionPlan: nutritionResult.plan,
        calories: nutritionResult.calories,
        stages: stagesResult.stages,
      });

      // Stop progress animation and complete
      progressAnimation.stop();

      // Animate to 100%
      Animated.timing(animatedProgress, {
        toValue: 100,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();

      setProgress(100);
      setMessageIndex(MESSAGES.length - 1); // "התוכניות מוכנות!"
      setStatus('success');

      // Navigate to preview after a short delay
      setTimeout(() => {
        router.replace('/onboarding/preview');
      }, 1500);
    } catch (error: any) {
      console.warn('[Generating] Generation skipped due to network:', error?.message);
      progressAnimation.stop();

      // Don't show error to user - just complete and continue
      // Plans can be regenerated after signup
      Animated.timing(animatedProgress, {
        toValue: 100,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();

      setProgress(100);
      setMessageIndex(MESSAGES.length - 1);
      setStatus('success');

      setTimeout(() => {
        router.replace('/onboarding/preview');
      }, 1500);
    }
  };

  // Sync animated value to progress state
  useEffect(() => {
    const listener = animatedProgress.addListener(({ value }) => {
      setProgress(value);
    });
    return () => animatedProgress.removeListener(listener);
  }, []);

  const size = 200;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Progress Ring */}
        <View style={[styles.progressContainer, { width: size, height: size }]}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={colors.accent.primary} />
                <Stop offset="100%" stopColor="#d4e350" />
              </LinearGradient>
            </Defs>
            {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress Circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#gradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>

          {/* Percentage Text */}
          <View style={styles.percentageContainer}>
            <Text style={styles.percentageText}>{Math.round(progress)}%</Text>
          </View>
        </View>

        {/* Message */}
        <Text style={styles.message}>{MESSAGES[messageIndex]}</Text>

        {/* Complete State */}
        {status === 'success' && (
          <View style={styles.completeContainer}>
            <Text style={styles.completeText}>התוכנית שלך מוכנה!</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  progressContainer: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  percentageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 32,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  message: {
    fontSize: typography.size.base,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  completeContainer: {
    marginTop: spacing.xl,
  },
  completeText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
    textAlign: 'center',
  },
});
