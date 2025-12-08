import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Flag, Footprints, Target } from 'lucide-react-native';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { getOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const { width: screenWidth } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Motivational messages based on goal
const motivationalContent: Record<string, { title: string; message: string; stat: string }> = {
  gain: {
    title: 'המסע שלך לחיזוק הגוף מתחיל',
    message: 'כל קילו שתוסיף הוא צעד קדימה לעבר הגרסה החזקה שלך.',
    stat: '89% מהמשתמשים שלנו רואים שיפור תוך 30 יום',
  },
  loss: {
    title: 'המסע שלך לגוף בריא יותר מתחיל',
    message: 'כל יום הוא הזדמנות חדשה להתקרב ליעד שלך.',
    stat: '82% מהמשתמשים שלנו משיגים את היעד שלהם',
  },
  recomp: {
    title: 'המסע שלך לאיזון מושלם מתחיל',
    message: 'שמירה על הגוף דורשת עקביות - ואנחנו כאן לעזור.',
    stat: '91% מהמשתמשים שלנו שומרים על ההרגלים',
  },
};

export default function GoalSummaryPage() {
  const router = useRouter();
  const [currentWeight, setCurrentWeight] = useState(0);
  const [targetWeight, setTargetWeight] = useState(0);
  const [goal, setGoal] = useState<string | null>(null);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Animations
  const pathProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const data = await getOnboardingData();
      setCurrentWeight(data.weight_kg || 0);
      setTargetWeight(data.target_weight_kg || 0);
      setGoal(data.goals?.[0] || null);
    })();

    // Reset animation state
    setIsAnimationComplete(false);

    // Start animations
    Animated.sequence([
      // Fade in content
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideUp, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Draw the path
      Animated.timing(pathProgress, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      // Sparkle effect
      Animated.timing(sparkleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => setIsAnimationComplete(true));

    // Continuous pulse animation for the target
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const weightDiff = targetWeight - currentWeight;
  const isGain = weightDiff > 0;
  const isLoss = weightDiff < 0;

  const content = goal ? motivationalContent[goal] : motivationalContent.loss;

  const handleContinue = () => {
    router.push('/onboarding/pace');
  };

  // Journey path dimensions
  const pathWidth = screenWidth - 80;
  const pathHeight = 120;

  return (
    <OnboardingShell
      title=""
      subtitle=""
      progress={getStepProgress('goal-summary')}
      footer={
        <PrimaryButton onPress={handleContinue} disabled={!isAnimationComplete}>
          בואו נתחיל את המסע
        </PrimaryButton>
      }
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
          }
        ]}
      >
        {/* Hero Title */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{content.title}</Text>
          <Text style={styles.heroSubtitle}>{content.message}</Text>
        </View>

        {/* Journey Visualization */}
        <View style={styles.journeyCard}>
          <View style={styles.journeyHeader}>
            <Text style={styles.journeyTitle}>המסע שלך</Text>
          </View>

          {/* Visual Path */}
          <View style={styles.pathContainer}>
            <Svg width={pathWidth} height={pathHeight}>
              <Defs>
                <LinearGradient id="pathGradient" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="rgba(255,255,255,0.2)" />
                  <Stop offset="1" stopColor={colors.accent.primary} />
                </LinearGradient>
              </Defs>

              {/* Background path (dotted) */}
              <Path
                d={`M 40 ${pathHeight / 2} Q ${pathWidth / 2} ${pathHeight / 2 - 30} ${pathWidth - 40} ${pathHeight / 2}`}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={3}
                fill="none"
                strokeDasharray="8,8"
              />

              {/* Animated progress path */}
              <Path
                d={`M 40 ${pathHeight / 2} Q ${pathWidth / 2} ${pathHeight / 2 - 30} ${pathWidth - 40} ${pathHeight / 2}`}
                stroke="url(#pathGradient)"
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={pathWidth}
                strokeDashoffset={pathProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [pathWidth, 0],
                })}
              />

              {/* Start point */}
              <Circle
                cx={40}
                cy={pathHeight / 2}
                r={12}
                fill={colors.background.primary}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={3}
              />

              {/* End point (target) */}
              <AnimatedCircle
                cx={pathWidth - 40}
                cy={pathHeight / 2}
                r={16}
                fill={colors.accent.primary}
                opacity={pathProgress}
              />
            </Svg>

            {/* Start label */}
            <View style={[styles.pointLabel, { left: 15, top: pathHeight / 2 + 20 }]}>
              <Footprints size={16} color={colors.text.tertiary} />
              <Text style={styles.pointLabelText}>היום</Text>
              <Text style={styles.pointWeight}>{currentWeight} ק״ג</Text>
            </View>

            {/* End label */}
            <Animated.View
              style={[
                styles.pointLabel,
                styles.targetLabel,
                { right: 5, top: pathHeight / 2 + 20 },
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Flag size={16} color={colors.accent.primary} />
              <Text style={[styles.pointLabelText, { color: colors.accent.primary }]}>היעד</Text>
              <Text style={[styles.pointWeight, { color: colors.accent.primary }]}>{targetWeight} ק״ג</Text>
            </Animated.View>
          </View>

          {/* Weight difference badge */}
          {weightDiff !== 0 && (
            <View style={styles.diffBadge}>
              <Text style={styles.diffBadgeText}>
                {isGain ? '+' : ''}{weightDiff} ק״ג
              </Text>
              <Text style={styles.diffBadgeLabel}>
                {isGain ? 'לעלות' : 'לרדת'}
              </Text>
            </View>
          )}
        </View>

        {/* Social Proof */}
        <Animated.View style={[styles.proofCard, { opacity: sparkleOpacity }]}>
          <View style={styles.proofIcon}>
            <Target size={20} color={colors.accent.primary} />
          </View>
          <Text style={styles.proofText}>{content.stat}</Text>
        </Animated.View>

        {/* Commitment message */}
        <Animated.View style={[styles.commitmentSection, { opacity: sparkleOpacity }]}>
          <Text style={styles.commitmentText}>
            הצעד הראשון הוא תמיד הקשה ביותר.{'\n'}
            <Text style={styles.commitmentHighlight}>ואתה כבר עשית אותו.</Text>
          </Text>
        </Animated.View>
      </Animated.View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  journeyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  journeyHeader: {
    marginBottom: spacing.md,
  },
  journeyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  pathContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: spacing.md,
  },
  pointLabel: {
    position: 'absolute',
    alignItems: 'center',
    gap: 2,
  },
  targetLabel: {
    alignItems: 'center',
  },
  pointLabelText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  pointWeight: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  diffBadge: {
    alignSelf: 'center',
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  diffBadgeText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },
  diffBadgeLabel: {
    fontSize: typography.size.sm,
    color: colors.background.primary,
    opacity: 0.8,
  },
  proofCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 241, 99, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  proofIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(226, 241, 99, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proofText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  commitmentSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  commitmentText: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 26,
  },
  commitmentHighlight: {
    color: colors.accent.primary,
    fontWeight: typography.weight.semibold,
  },
});
