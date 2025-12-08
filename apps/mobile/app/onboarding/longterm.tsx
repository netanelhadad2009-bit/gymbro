import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 80;
const chartHeight = 180;

// Approximate path lengths for strokeDasharray animation
const FIT_PATH_LENGTH = 350;
const TRADITIONAL_PATH_LENGTH = 380;

export default function LongtermPage() {
  const router = useRouter();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Animation values
  const fitLineAnim = useRef(new Animated.Value(0)).current;
  const traditionalLineAnim = useRef(new Animated.Value(0)).current;
  const fillOpacity = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset animations and button state
    setIsAnimationComplete(false);
    fitLineAnim.setValue(0);
    traditionalLineAnim.setValue(0);
    fillOpacity.setValue(0);
    circleOpacity.setValue(0);

    // Start the animation sequence
    Animated.sequence([
      // First, draw both lines simultaneously
      Animated.parallel([
        Animated.timing(fitLineAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(traditionalLineAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]),
      // Then fade in the fill and circles
      Animated.parallel([
        Animated.timing(fillOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(circleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => setIsAnimationComplete(true));
  }, []);

  const handleContinue = () => {
    router.push('/onboarding/metrics');
  };

  // Animated stroke dash offset (line drawing effect)
  const fitStrokeDashoffset = fitLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [FIT_PATH_LENGTH, 0],
  });

  const traditionalStrokeDashoffset = traditionalLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [TRADITIONAL_PATH_LENGTH, 0],
  });

  // FitJourney line - goes down and stays down (weight loss maintained)
  const fitJourneyPath = `
    M 30 50
    C 60 50, 80 90, 120 110
    C 160 130, 200 140, 240 140
    C 260 140, 280 140, ${chartWidth - 30} 140
  `;

  // FitJourney filled area
  const fitJourneyFill = `
    M 30 50
    C 60 50, 80 90, 120 110
    C 160 130, 200 140, 240 140
    C 260 140, 280 140, ${chartWidth - 30} 140
    L ${chartWidth - 30} 160
    L 30 160
    Z
  `;

  // Traditional/Without FitJourney - goes down but bounces back up (yo-yo)
  const traditionalPath = `
    M 30 50
    C 60 60, 100 100, 140 110
    C 180 120, 200 100, 220 80
    C 240 60, 270 40, ${chartWidth - 30} 30
  `;

  // Traditional filled area
  const traditionalFill = `
    M 30 50
    C 60 60, 100 100, 140 110
    C 180 120, 200 100, 220 80
    C 240 60, 270 40, ${chartWidth - 30} 30
    L ${chartWidth - 30} 160
    L 30 160
    Z
  `;

  return (
    <OnboardingShell
      title="FitJourney יוצר תוצאות לאורך זמן"
      subtitle="רוב המשתמשים שלנו שומרים על ההתקדמות שלהם גם אחרי חודשים ארוכים."
      progress={getStepProgress('longterm')}
      footer={
        <PrimaryButton onPress={handleContinue} disabled={!isAnimationComplete}>
          המשך
        </PrimaryButton>
      }
    >
      <View style={styles.content}>
        {/* Graph Card */}
        <View style={styles.card}>
          <Text style={styles.chartTitle}>המשקל שלך</Text>

          {/* Chart */}
          <View style={styles.chartContainer}>
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <LinearGradient id="fitGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.accent.primary} stopOpacity="0.3" />
                  <Stop offset="1" stopColor={colors.accent.primary} stopOpacity="0.05" />
                </LinearGradient>
                <LinearGradient id="traditionalGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#ff6b6b" stopOpacity="0.2" />
                  <Stop offset="1" stopColor="#ff6b6b" stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {/* Horizontal guide lines */}
              <Line x1="30" y1="50" x2={chartWidth - 30} y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4" />
              <Line x1="30" y1="110" x2={chartWidth - 30} y2="110" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4" />

              {/* Traditional diet filled area (red/pink) - animated opacity */}
              <AnimatedPath
                d={traditionalFill}
                fill="url(#traditionalGradient)"
                fillOpacity={fillOpacity}
              />

              {/* FitJourney filled area (lime) - animated opacity */}
              <AnimatedPath
                d={fitJourneyFill}
                fill="url(#fitGradient)"
                fillOpacity={fillOpacity}
              />

              {/* Traditional diet line - animated drawing */}
              <AnimatedPath
                d={traditionalPath}
                stroke="#ff6b6b"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={TRADITIONAL_PATH_LENGTH}
                strokeDashoffset={traditionalStrokeDashoffset}
              />

              {/* FitJourney line - animated drawing */}
              <AnimatedPath
                d={fitJourneyPath}
                stroke={colors.accent.primary}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={FIT_PATH_LENGTH}
                strokeDashoffset={fitStrokeDashoffset}
              />

              {/* Start point circle (hollow) - animated opacity */}
              <AnimatedCircle
                cx="30"
                cy="50"
                r="8"
                fill={colors.background.primary}
                stroke={colors.accent.primary}
                strokeWidth="2"
                opacity={circleOpacity}
              />

              {/* End point circle for FitJourney (hollow) - animated opacity */}
              <AnimatedCircle
                cx={chartWidth - 30}
                cy="140"
                r="8"
                fill={colors.background.primary}
                stroke={colors.accent.primary}
                strokeWidth="2"
                opacity={circleOpacity}
              />
            </Svg>

            {/* Traditional diet label - animated */}
            <Animated.View style={[styles.traditionalLabel, { opacity: circleOpacity }]}>
              <Text style={styles.traditionalLabelText}>ללא FitJourney</Text>
            </Animated.View>

            {/* FitJourney label - animated */}
            <Animated.View style={[styles.fitLabel, { opacity: circleOpacity }]}>
              <Text style={styles.fitLabelText}>FitJourney</Text>
            </Animated.View>

            {/* X-axis labels */}
            <View style={styles.xAxisLabels}>
              <Text style={styles.xAxisLabel}>חודש 6</Text>
              <Text style={styles.xAxisLabel}>חודש 1</Text>
            </View>
          </View>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statText}>
            <Text style={styles.statHighlight}>82%</Text>
            {' ממשתמשי FitJourney שומרים על ההישגים שלהם גם אחרי 6 חודשים.'}
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
  },
  chartTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  traditionalLabel: {
    position: 'absolute',
    top: 15,
    right: 40,
  },
  traditionalLabelText: {
    fontSize: typography.size.sm,
    color: '#ff6b6b',
  },
  fitLabel: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  fitLabelText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  xAxisLabel: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.xl,
  },
  statText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  statHighlight: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
  },
});
