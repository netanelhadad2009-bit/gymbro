import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, CheckCircle2, Loader2 } from 'lucide-react-native';
import { colors, typography, spacing } from '../../lib/theme';
import { getOnboardingData } from '../../lib/onboarding-storage';
import { generateNutritionPlan, generateJourneyStages } from '../../lib/api';
import { saveProgramDraft, getProgramDraft, ProgramDraft } from '../../lib/program-draft';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MESSAGES = [
  'Getting started...',
  'Creating nutrition plan...',
  'Calculating daily calories...',
  'Building personalized menu...',
  'Generating journey stages...',
  'Your plan is ready!',
];

const POST_AUTH_STEPS = [
  { id: 'profile', label: 'Saving your profile' },
  { id: 'avatar', label: 'Setting up your personal trainer' },
  { id: 'journey', label: 'Building your fitness journey' },
  { id: 'finish', label: 'Finishing preparations' },
];

type GenerationStatus = 'idle' | 'generating' | 'success';
type StepStatus = 'pending' | 'active' | 'done' | 'error';

interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

/**
 * Attaches existing program draft to authenticated user
 * This runs on the second visit to generating page (after signup)
 * Matches web app's runPostAuthFlow() which reads from localStorage and saves to database
 */
async function attachExistingProgramToUser(
  userId: string,
  onboardingData: any,
  programDraft: ProgramDraft,
  progressAnimation: Animated.CompositeAnimation
): Promise<void> {
  console.log('[Generating] Attaching existing program to user:', userId);

  // Create avatar with onboarding data (matching web app structure)
  const { data: avatar, error: avatarError } = await supabase
    .from('avatars')
    .insert({
      user_id: userId,
      gender: onboardingData.gender || 'male',
      goal: onboardingData.goals?.[0] || 'loss',
      diet: onboardingData.diet || 'regular',
      frequency: onboardingData.training_frequency_actual || 'medium',
      experience: onboardingData.experience || 'beginner',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (avatarError) {
    console.error('[Generating] Error creating avatar:', avatarError);
    throw avatarError;
  }

  console.log('[Generating] ✅ Avatar created:', avatar?.id);

  // Calculate age from birthdate
  const calculateAge = (birthdate: string | undefined): number | undefined => {
    if (!birthdate) return undefined;
    try {
      const birthDate = new Date(birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age > 0 ? age : undefined;
    } catch {
      return undefined;
    }
  };

  // Populate profiles table with user's onboarding data
  const age = calculateAge(onboardingData.birthdate);
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      gender: onboardingData.gender,
      age: age,
      weight_kg: onboardingData.weight_kg,
      target_weight_kg: onboardingData.target_weight_kg,
      height_cm: onboardingData.height_cm,
      goal: onboardingData.goals?.[0],
      diet: onboardingData.diet,
      birthdate: onboardingData.birthdate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id'
    });

  if (profileError) {
    console.warn('[Generating] Warning: Could not save profile data:', profileError);
    // Don't throw - this is not critical
  } else {
    console.log('[Generating] ✅ Profile data saved');
  }

  // Save user stages to database if they exist in draft
  if (programDraft.stages && programDraft.stages.length > 0 && avatar) {
    console.log('[Generating] Saving', programDraft.stages.length, 'stages to database...');

    for (let i = 0; i < programDraft.stages.length; i++) {
      const stage = programDraft.stages[i];
      const stageIndex = i + 1; // Stage index starts from 1 (matching web app)
      const isFirstStage = (i === 0);

      // Insert user stage
      const { data: userStage, error: stageError } = await supabase
        .from('user_stages')
        .insert({
          user_id: userId,
          stage_index: stageIndex,
          code: stage.code,
          title_he: stage.title_he,
          subtitle_he: stage.subtitle_he,
          color_hex: stage.color_hex,
          is_unlocked: isFirstStage, // Only first stage is unlocked
          is_completed: false,
          unlocked_at: isFirstStage ? new Date().toISOString() : null, // Set timestamp for first stage
        })
        .select()
        .single();

      if (stageError) {
        console.error('[Generating] Error saving stage:', stageError);
        continue;
      }

      // Insert tasks for this stage
      if (stage.tasks && stage.tasks.length > 0 && userStage) {
        const tasksToInsert = stage.tasks.map((task: any, taskIndex: number) => ({
          user_stage_id: userStage.id,
          order_index: taskIndex,
          key_code: task.key_code || `TASK_${taskIndex}`,
          title_he: task.title_he,
          desc_he: task.desc_he,
          points: task.points || 10,
          condition_json: task.condition_json || task.condition || {},
          is_completed: false,
        }));

        const { error: tasksError } = await supabase
          .from('user_stage_tasks')
          .insert(tasksToInsert);

        if (tasksError) {
          console.error('[Generating] Error saving tasks for stage:', stage.code, tasksError);
        }
      }
    }

    console.log('[Generating] ✅ All stages and tasks saved to database');
  }

  // Save nutrition plan to profile (using nutrition_* columns)
  if (programDraft.nutritionPlan && programDraft.calories && userId) {
    console.log('[Generating] Saving nutrition plan to profile...');

    const { error: nutritionError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        nutrition_plan: programDraft.nutritionPlan,
        nutrition_calories: programDraft.calories,
        nutrition_status: 'ready',
        nutrition_updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (nutritionError) {
      console.error('[Generating] Error saving nutrition plan:', nutritionError);
    } else {
      console.log('[Generating] ✅ Nutrition plan saved to profile');
    }
  }

  console.log('[Generating] ✅ Program successfully attached to user');
}

export default function GeneratingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [isPostAuth, setIsPostAuth] = useState(false);
  const [steps, setSteps] = useState<Step[]>(
    POST_AUTH_STEPS.map(step => ({ ...step, status: 'pending' as StepStatus }))
  );
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const generationStarted = useRef(false);

  const updateStep = (index: number, newStatus: StepStatus) => {
    setSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, status: newStatus } : step
    ));
  };

  // Spin animation for loader
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  const spinInterpolate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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

      // Check if user is authenticated and program draft already exists
      // This handles the second visit after signup (matching web app's post-auth flow)
      if (user) {
        const existingDraft = await getProgramDraft();
        if (existingDraft && (existingDraft.stages || existingDraft.nutritionPlan)) {
          console.log('[Generating] User authenticated with existing draft - attaching to database...');
          setIsPostAuth(true);
          progressAnimation.stop();

          // Step 1: Profile
          updateStep(0, 'active');
          await new Promise(r => setTimeout(r, 300));
          updateStep(0, 'done');

          // Step 2: Avatar & Journey (combined during attach)
          updateStep(1, 'active');

          // Skip generation, use existing draft data to create database records
          // This matches web app's runPostAuthFlow() which reads from localStorage
          await attachExistingProgramToUser(user.id, onboardingData, existingDraft, progressAnimation);

          updateStep(1, 'done');
          updateStep(2, 'active');
          await new Promise(r => setTimeout(r, 800));
          updateStep(2, 'done');

          // Step 3: Finish
          updateStep(3, 'active');

          // Ensure has_completed_onboarding is set before navigation
          console.log('[Generating] Setting has_completed_onboarding to true...');
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              has_completed_onboarding: true,
            }, {
              onConflict: 'id'
            });
          console.log('[Generating] ✅ Onboarding marked as complete');

          updateStep(3, 'done');
          setStatus('success');

          // Navigate to journey
          setTimeout(() => {
            console.log('[Generating] Navigating to journey...');
            router.replace('/(app)/journey');
          }, 500);

          return;
        }
      }

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

      // Save program draft to AsyncStorage
      // This will be read on the second visit (after signup) to attach to user
      await saveProgramDraft({
        days: 1,
        nutritionPlan: nutritionResult.plan,
        calories: nutritionResult.calories,
        stages: stagesResult.stages,
      });

      console.log('[Generating] Program draft saved to AsyncStorage');

      // NOTE: We DON'T save to database here even if user is authenticated
      // because this path is only for the FIRST visit (before signup).
      // The second visit (after signup) is handled at the top of this function.

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
      setMessageIndex(MESSAGES.length - 1); // "Your plan is ready!"
      setStatus('success');

      // Navigate to preview page (this is the FIRST visit, before signup)
      // After signup, user will come back to this page and hit the early return above
      setTimeout(() => {
        console.log('[Generating] Generation complete - navigating to preview...');
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
        console.log('[Generating] Error occurred - navigating to preview...');
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
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  // Render step-based UI for post-auth
  if (isPostAuth) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Logo/Brand */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Sparkles size={40} color={colors.accent.primary} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.postAuthTitle}>Setting everything up for you</Text>
          <Text style={styles.postAuthSubtitle}>Just a few more seconds...</Text>

          {/* Steps */}
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View
                key={step.id}
                style={[
                  styles.stepCard,
                  step.status === 'active' && styles.stepCardActive,
                  step.status === 'done' && styles.stepCardDone,
                  step.status === 'pending' && styles.stepCardPending,
                ]}
              >
                {/* Icon */}
                <View style={styles.stepIconContainer}>
                  {step.status === 'active' ? (
                    <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                      <Loader2 size={24} color={colors.accent.primary} />
                    </Animated.View>
                  ) : step.status === 'done' ? (
                    <CheckCircle2 size={24} color={colors.accent.primary} />
                  ) : (
                    <View style={styles.stepIconPending} />
                  )}
                </View>

                {/* Label */}
                <Text
                  style={[
                    styles.stepLabel,
                    step.status === 'active' && styles.stepLabelActive,
                    step.status === 'done' && styles.stepLabelDone,
                    step.status === 'pending' && styles.stepLabelPending,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render circular progress UI for pre-auth
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
            <Text style={styles.completeText}>Your plan is ready!</Text>
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
  // Post-auth step-based UI styles
  logoContainer: {
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.accent.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAuthTitle: {
    fontSize: 24,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  postAuthSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  stepsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  stepCardPending: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    opacity: 0.5,
  },
  stepCardActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ scale: 1.02 }],
  },
  stepCardDone: {
    backgroundColor: `${colors.accent.primary}15`,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepIconPending: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  stepLabelPending: {
    color: colors.text.tertiary,
  },
  stepLabelActive: {
    color: colors.text.primary,
  },
  stepLabelDone: {
    color: colors.accent.primary,
  },
  // Pre-auth circular progress styles
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
