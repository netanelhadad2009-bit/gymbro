import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop, Path, G } from 'react-native-svg';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';
import { getProgramDraft, ProgramDraft } from '../../lib/program-draft';
import { getOnboardingData, OnboardingData } from '../../lib/onboarding-storage';
import PrimaryButton from '../../components/PrimaryButton';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SOURCES = [
  {
    title: 'Basal Metabolic Rate',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
  },
  {
    title: 'Calorie Counting - Harvard',
    url: 'https://pubmed.ncbi.nlm.nih.gov/6721853/',
  },
  {
    title: 'Dietary Reference Intakes',
    url: 'https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables.html',
  },
  {
    title: 'International Society of Sports Nutrition',
    url: 'https://journals.lww.com/acsm-msse/Fulltext/2011/07000/Quantity_and_Quality_of_Exercise_for_Developing.26.aspx',
  },
  {
    title: 'World Health Organization',
    url: 'https://www.who.int/publications/i/item/9789240015128',
  },
];

type Gender = 'male' | 'female' | 'other';

const getGenderedText = (
  gender: Gender | undefined,
  male: string,
  female: string,
  other: string
): string => {
  if (gender === 'male') return male;
  if (gender === 'female') return female;
  return other;
};

const GOAL_LABELS: Record<string, string> = {
  loss: 'Weight loss',
  gain: 'Muscle gain',
  recomp: 'Body recomposition',
  maintain: 'Maintain weight',
};

// Translation for Hebrew stage titles
const STAGE_TITLE_TRANSLATIONS: Record<string, string> = {
  'יסודות מתקדמים': 'Advanced Foundations',
  'יסודות': 'Foundations',
  'מומנטום': 'Momentum',
  'עקביות': 'Consistency',
  'אופטימיזציה': 'Optimization',
  'שליטה': 'Mastery',
  'תחזוקה יומית': 'Daily Maintenance',
  'התקדמות': 'Progress',
  'דיאט': 'Diet',
  'דייאט': 'Diet',
};

const STAGE_SUBTITLE_TRANSLATIONS: Record<string, string> = {
  'עיבוד התזונה': 'Nutrition processing',
  'שיפור ביצועים': 'Performance improvement',
  'אכול לפי יעד הקלוריות היומי שלך': 'Eat according to your daily calorie target',
  'שמור על התוצאות': 'Maintain results',
  'שליטה במאזן': 'Control the balance',
  'אכלו לפי יעד הקלוריות היומי שלכם': 'Eat according to your daily calorie target',
  'שמירה על תוצאות': 'Maintain results',
  'התחלה נכונה': 'Getting started right',
  'בניית הרגלים': 'Building habits',
  'הפיכה להרגל': 'Making it a habit',
  'שיפור מתמיד': 'Continuous improvement',
};

const translateStage = (titleHe: string, subtitleHe?: string) => {
  const trimmedTitle = titleHe?.trim() || '';
  const trimmedSubtitle = subtitleHe?.trim() || '';

  // Translate title
  const translatedTitle = STAGE_TITLE_TRANSLATIONS[trimmedTitle] || trimmedTitle;

  // Translate subtitle
  const translatedSubtitle = STAGE_SUBTITLE_TRANSLATIONS[trimmedSubtitle] || trimmedSubtitle;

  // Log any untranslated Hebrew text
  const hasHebrewTitle = /[\u0590-\u05FF]/.test(translatedTitle);
  const hasHebrewSubtitle = /[\u0590-\u05FF]/.test(translatedSubtitle);

  if (hasHebrewTitle) {
    console.log('[Preview] Untranslated Hebrew title:', JSON.stringify(trimmedTitle));
  }
  if (hasHebrewSubtitle && trimmedSubtitle) {
    console.log('[Preview] Untranslated Hebrew subtitle:', JSON.stringify(trimmedSubtitle));
  }

  return { title: translatedTitle, subtitle: translatedSubtitle };
};

// Stage colors - vibrant gradients
const STAGE_COLORS = [
  { primary: '#E2F163', secondary: '#a3e635' }, // Lime
  { primary: '#5B9BFF', secondary: '#3b82f6' }, // Blue
  { primary: '#FFA856', secondary: '#f97316' }, // Orange
  { primary: '#C9456C', secondary: '#ec4899' }, // Pink
  { primary: '#22c55e', secondary: '#16a34a' }, // Green
];

// Calculate estimated weeks to reach goal
const calculateWeeksToGoal = (
  currentWeight: number | undefined,
  targetWeight: number | undefined,
  weeklyPace: number | undefined
): number | null => {
  if (!currentWeight || !targetWeight || !weeklyPace || weeklyPace === 0) return null;
  const diff = Math.abs(currentWeight - targetWeight);
  return Math.ceil(diff / weeklyPace);
};


// Metric Card Component
const MetricCard = ({
  value,
  label,
  color,
  icon,
}: {
  value: string | number;
  label: string;
  color: string;
  icon: 'fire' | 'protein' | 'target' | 'calendar';
}) => {
  const iconPaths: Record<string, React.ReactNode> = {
    fire: (
      <Path
        d="M12 2C8.5 6 6 9 6 12.5C6 16.09 8.91 19 12.5 19C16.09 19 19 16.09 19 12.5C19 9.5 17 7 15 5C14 7 13 8 12 8C11 8 9.5 6 12 2Z"
        fill={color}
        scale={0.8}
        translateX={2}
        translateY={2}
      />
    ),
    protein: (
      <G scale={0.8} translateX={2} translateY={2}>
        <Circle cx="12" cy="8" r="4" fill={color} />
        <Path d="M12 14C8 14 4 16 4 19V20H20V19C20 16 16 14 12 14Z" fill={color} />
      </G>
    ),
    target: (
      <G scale={0.8} translateX={2} translateY={2}>
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
        <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" fill="none" />
        <Circle cx="12" cy="12" r="2" fill={color} />
      </G>
    ),
    calendar: (
      <G scale={0.8} translateX={2} translateY={2}>
        <Path d="M19 4H5C4 4 3 5 3 6V20C3 21 4 22 5 22H19C20 22 21 21 21 20V6C21 5 20 4 19 4ZM19 20H5V10H19V20Z" fill={color} />
        <Path d="M7 2V6M17 2V6" stroke={color} strokeWidth="2" />
      </G>
    ),
  };

  return (
    <View style={[styles.metricCard, { borderColor: `${color}30` }]}>
      <View style={[styles.metricIconContainer, { backgroundColor: `${color}20` }]}>
        <Svg width={24} height={24}>
          {iconPaths[icon]}
        </Svg>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
};

export default function PreviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [programDraft, setProgramDraft] = useState<ProgramDraft | null>(null);
  const [completing, setCompleting] = useState(false);

  const gender = onboardingData?.gender as Gender | undefined;

  useEffect(() => {
    (async () => {
      const data = await getOnboardingData();
      setOnboardingData(data);

      const draft = await getProgramDraft();

      if (!draft) {
        console.warn('[Preview] No draft found - showing error');
        setDraftError('לא נמצאה טיוטת תוכנית להצגה');
        setLoading(false);
        return;
      }

      setProgramDraft(draft);
      console.log('[Preview] draft loaded', {
        hasNutritionPlan: !!draft.nutritionPlan,
        calories: draft.calories,
        stagesCount: draft.stages?.length || 0,
        stages: draft.stages,
      });

      setLoading(false);
    })();
  }, []);

  const goToSignup = async () => {
    console.log('[Preview] goToSignup called');
    console.log('[Preview] User authenticated:', !!user);

    // If user is already authenticated, mark onboarding as complete and go to journey
    if (user) {
      console.log('[Preview] User is authenticated, completing onboarding...');
      setCompleting(true);
      try {
        // Update profile to mark onboarding as complete (upsert to create if missing)
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            has_completed_onboarding: true,
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error('[Preview] Error updating profile:', error);
        }

        console.log('[Preview] Navigating to journey...');
        // Navigate to journey
        router.replace('/(app)/journey');
      } catch (error) {
        console.error('[Preview] Error completing onboarding:', error);
        // Navigate anyway
        router.replace('/(app)/journey');
      } finally {
        setCompleting(false);
      }
    } else {
      console.log('[Preview] User not authenticated, navigating to signup...');
      // Not authenticated - go to signup
      router.push('/(auth)/signup');
      console.log('[Preview] Navigation to signup initiated');
    }
  };

  const handleSourceClick = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('[Preview] Error opening URL:', error);
    }
  };

  // Calculate personalized data
  const calories = programDraft?.calories || programDraft?.nutritionPlan?.dailyTargets?.calories_target;
  const protein = programDraft?.nutritionPlan?.dailyTargets?.protein_target_g;
  const weeksToGoal = calculateWeeksToGoal(
    onboardingData?.weight_kg,
    onboardingData?.target_weight_kg,
    onboardingData?.weekly_pace_kg
  );
  const goalLabel = GOAL_LABELS[onboardingData?.goals?.[0] || 'loss'] || 'Weight loss';
  const weightDiff = onboardingData?.weight_kg && onboardingData?.target_weight_kg
    ? Math.abs(onboardingData.weight_kg - onboardingData.target_weight_kg)
    : null;
  const isLosing = (onboardingData?.weight_kg || 0) > (onboardingData?.target_weight_kg || 0);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={styles.loadingText}>Loading plan...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (draftError) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['top', 'bottom']}>
        <View style={styles.errorIconCircle}>
          <Text style={styles.errorIconText}>!</Text>
        </View>
        <Text style={styles.errorTitle}>Plan Not Found</Text>
        <Text style={styles.errorDescription}>
          No plan draft found. The plan may have expired (48 hours) or been deleted.
        </Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity
            style={styles.errorButtonPrimary}
            onPress={() => router.push('/onboarding/generating')}
          >
            <Text style={styles.errorButtonPrimaryText}>Create New Plan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main content
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            {getGenderedText(
              gender,
              'Your plan is ready!',
              'Your plan is ready!',
              'Your plan is ready!'
            )}
          </Text>

          {/* Goal Badge */}
          <View style={styles.goalBadge}>
            <Text style={styles.goalBadgeText}>{goalLabel}</Text>
          </View>

          {/* Weight Journey Card */}
          {onboardingData?.weight_kg && onboardingData?.target_weight_kg && (
            <View style={styles.weightCard}>
              <View style={styles.weightRow}>
                <View style={styles.weightItem}>
                  <Text style={styles.weightLabel}>Now</Text>
                  <Text style={styles.weightValue}>{onboardingData.weight_kg}</Text>
                  <Text style={styles.weightUnit}>kg</Text>
                </View>

                <View style={styles.arrowContainer}>
                  <Svg width={40} height={24}>
                    <Defs>
                      <LinearGradient id="arrowGradient" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor={colors.accent.primary} />
                        <Stop offset="100%" stopColor="#22c55e" />
                      </LinearGradient>
                    </Defs>
                    <Path
                      d="M4 12H32M32 12L24 6M32 12L24 18"
                      stroke="url(#arrowGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                  {weightDiff !== null && weightDiff > 0 ? (
                    <Text style={styles.weightDiff}>
                      {isLosing ? '-' : '+'}{weightDiff.toFixed(1)}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.weightItem}>
                  <Text style={styles.weightLabel}>Goal</Text>
                  <Text style={[styles.weightValue, styles.targetValue]}>{onboardingData.target_weight_kg}</Text>
                  <Text style={styles.weightUnit}>kg</Text>
                </View>
              </View>

              {weeksToGoal !== null && weeksToGoal > 0 ? (
                <View style={styles.timelineBar}>
                  <View style={styles.timelineFill} />
                  <Text style={styles.timelineText}>{weeksToGoal} weeks to reach goal</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsContainer}>
          {calories ? (
            <MetricCard
              value={Math.round(calories)}
              label="Daily Calories"
              color={colors.accent.primary}
              icon="fire"
            />
          ) : null}
          {protein ? (
            <MetricCard
              value={`${Math.round(protein)}g`}
              label="Protein"
              color={colors.accent.blue}
              icon="protein"
            />
          ) : null}
          {programDraft?.stages ? (
            <MetricCard
              value={programDraft.stages.length}
              label="Stages"
              color={colors.accent.orange}
              icon="target"
            />
          ) : null}
        </View>

        {/* Journey Timeline */}
        {programDraft?.stages && programDraft.stages.length > 0 && (
          <View style={styles.journeySection}>
            <Text style={styles.sectionTitle}>Your Journey</Text>
            <View style={styles.timeline}>
              {programDraft.stages.slice(0, 4).map((stage, index) => {
                const stageColor = STAGE_COLORS[index % STAGE_COLORS.length];
                const isLast = index === Math.min(programDraft.stages!.length - 1, 3);

                return (
                  <View key={stage.code || `stage-${index}`} style={styles.timelineItem}>
                    {/* Timeline Line */}
                    {!isLast && (
                      <View style={styles.timelineLine}>
                        <View style={[styles.timelineLineFill, { backgroundColor: stageColor.primary }]} />
                      </View>
                    )}

                    {/* Stage Node */}
                    <View style={styles.timelineNodeContainer}>
                      <View style={[styles.timelineNode, { backgroundColor: stageColor.primary }]}>
                        <View style={[styles.timelineNodeInner, { backgroundColor: stageColor.secondary }]}>
                          <Text style={styles.timelineNodeText}>{index + 1}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Stage Content */}
                    <View style={styles.timelineContent}>
                      <View style={[styles.stageCard, { borderColor: `${stageColor.primary}40` }]}>
                        <View style={[styles.stageColorBar, { backgroundColor: stageColor.primary }]} />
                        <View style={styles.stageTextContent}>
                          <Text style={[styles.stageTitle, { color: stageColor.primary }]}>
                            {translateStage(stage.title_he, stage.subtitle_he).title}
                          </Text>
                          {stage.subtitle_he && (
                            <Text style={styles.stageSubtitle} numberOfLines={2}>
                              {translateStage(stage.title_he, stage.subtitle_he).subtitle}
                            </Text>
                          )}
                          {stage.tasks && stage.tasks.length > 0 && (
                            <Text style={styles.stageTaskCount}>
                              {stage.tasks.length} tasks
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What You'll Get</Text>
          <View style={styles.featuresRow}>
            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(226, 241, 99, 0.15)' }]}>
                <Svg width={28} height={28}>
                  <G scale={1.1} translateX={1} translateY={1}>
                    <Path d="M3 9L12 2L21 9V20C21 21 20 22 19 22H5C4 22 3 21 3 20V9Z" stroke={colors.accent.primary} strokeWidth="2" fill="none" />
                    <Path d="M9 22V12H15V22" stroke={colors.accent.primary} strokeWidth="2" />
                  </G>
                </Svg>
              </View>
              <Text style={styles.featureTitle}>Nutrition Plan</Text>
              <Text style={styles.featureDesc}>Personalized</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(91, 155, 255, 0.15)' }]}>
                <Svg width={28} height={28}>
                  <G scale={1.1} translateX={1} translateY={1}>
                    <Path d="M23 6L13.5 15.5L8.5 10.5L1 18" stroke={colors.accent.blue} strokeWidth="2" fill="none" strokeLinecap="round" />
                    <Path d="M17 6H23V12" stroke={colors.accent.blue} strokeWidth="2" fill="none" strokeLinecap="round" />
                  </G>
                </Svg>
              </View>
              <Text style={styles.featureTitle}>Progress Tracking</Text>
              <Text style={styles.featureDesc}>Visual & simple</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: 'rgba(255, 168, 86, 0.15)' }]}>
                <Svg width={28} height={28}>
                  <G scale={1.1} translateX={1} translateY={1}>
                    <Circle cx="12" cy="12" r="10" stroke={colors.accent.orange} strokeWidth="2" fill="none" />
                    <Path d="M12 6V12L16 14" stroke={colors.accent.orange} strokeWidth="2" strokeLinecap="round" />
                  </G>
                </Svg>
              </View>
              <Text style={styles.featureTitle}>Daily Tasks</Text>
              <Text style={styles.featureDesc}>Easy to achieve</Text>
            </View>
          </View>
        </View>

        {/* Motivation Card */}
        <View style={styles.motivationCard}>
          <View style={styles.motivationGlow} />
          <Text style={styles.motivationQuote}>
            {getGenderedText(
              gender,
              '"A journey of a thousand miles begins with a single step.\nYou\'ve already taken the first step."',
              '"A journey of a thousand miles begins with a single step.\nYou\'ve already taken the first step."',
              '"A journey of a thousand miles begins with a single step.\nYou\'ve already taken the first step."'
            )}
          </Text>
        </View>

        {/* Sources */}
        <View style={styles.sourcesSection}>
          <Text style={styles.sourcesTitle}>Scientific Sources</Text>
          <View style={styles.sourcesContainer}>
            {SOURCES.map((source, index) => (
              <TouchableOpacity
                key={index}
                style={styles.sourceItem}
                onPress={() => handleSourceClick(source.url)}
                activeOpacity={0.7}
              >
                <Text style={styles.sourceText}>{source.title}</Text>
                <Text style={styles.sourceArrow}>↗</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={styles.stickyBottom}>
        <PrimaryButton onPress={goToSignup} disabled={completing || loading}>
          {completing
            ? 'Completing...'
            : getGenderedText(gender, 'Let\'s Get Started!', 'Let\'s Get Started!', 'Let\'s Get Started!')}
        </PrimaryButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.6)',
  },

  // Error state
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorIconText: {
    fontSize: 40,
    fontWeight: typography.weight.bold,
    color: '#f87171',
  },
  errorTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  errorDescription: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing['2xl'],
  },
  errorButtons: {
    gap: spacing.md,
    width: '100%',
    alignItems: 'stretch',
  },
  errorButtonPrimary: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  errorButtonPrimaryText: {
    color: colors.background.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  goalBadge: {
    backgroundColor: 'rgba(226, 241, 99, 0.15)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(226, 241, 99, 0.3)',
    marginBottom: spacing.lg,
  },
  goalBadgeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
  },
  weightCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightItem: {
    alignItems: 'center',
    flex: 1,
  },
  weightLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  weightValue: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.text.primary,
  },
  targetValue: {
    color: colors.accent.primary,
  },
  weightUnit: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  weightDiff: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
    marginTop: spacing.xs,
  },
  timelineBar: {
    marginTop: spacing.lg,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '5%',
    backgroundColor: 'rgba(226, 241, 99, 0.3)',
    borderRadius: borderRadius.full,
  },
  timelineText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },

  // Metrics
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metricValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  metricLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Section Title
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Journey Timeline
  journeySection: {
    marginBottom: spacing.xl,
  },
  timeline: {
    paddingLeft: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 100,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 23,
    top: 48,
    bottom: -10,
    width: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  timelineLineFill: {
    width: '100%',
    height: '50%',
    borderRadius: 2,
  },
  timelineNodeContainer: {
    width: 48,
    alignItems: 'center',
    zIndex: 1,
  },
  timelineNode: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  timelineNodeInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineNodeText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: '#fff',
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  stageCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    flexDirection: 'row',
  },
  stageColorBar: {
    width: 4,
  },
  stageTextContent: {
    flex: 1,
    padding: spacing.md,
  },
  stageTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    textAlign: 'left',
    marginBottom: spacing.xs,
  },
  stageSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'left',
    lineHeight: 20,
  },
  stageTaskCount: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    textAlign: 'left',
    marginTop: spacing.sm,
  },

  // Features Section
  featuresSection: {
    marginBottom: spacing.xl,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  featureCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  featureDesc: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Motivation Card
  motivationCard: {
    backgroundColor: 'rgba(226, 241, 99, 0.05)',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(226, 241, 99, 0.15)',
  },
  motivationGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.accent.primary,
    opacity: 0.08,
  },
  motivationQuote: {
    fontSize: typography.size.base,
    fontStyle: 'italic',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
  },

  // Sources
  sourcesSection: {
    marginBottom: spacing.md,
  },
  sourcesTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  sourcesContainer: {
    gap: spacing.sm,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.md,
  },
  sourceText: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    flex: 1,
    textAlign: 'left',
  },
  sourceArrow: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },

  // Sticky Bottom
  bottomSpacer: {
    height: 100,
  },
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
    backgroundColor: colors.background.primary,
  },
});
