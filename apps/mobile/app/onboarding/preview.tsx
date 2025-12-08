import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';
import { getProgramDraft } from '../../lib/program-draft';
import { getOnboardingData } from '../../lib/onboarding-storage';
import PrimaryButton from '../../components/PrimaryButton';

// Force RTL for the app
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const SOURCES = [
  {
    title: 'שיעור חילוף חומרים בסיסי',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
  },
  {
    title: 'ספירת קלוריות - הרווארד',
    url: 'https://pubmed.ncbi.nlm.nih.gov/6721853/',
  },
  {
    title: 'ערכי צריכה תזונתיים מומלצים',
    url: 'https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables.html',
  },
  {
    title: 'האגודה הבינלאומית לתזונת ספורט',
    url: 'https://journals.lww.com/acsm-msse/Fulltext/2011/07000/Quantity_and_Quality_of_Exercise_for_Developing.26.aspx',
  },
  {
    title: 'ארגון הבריאות העולמי',
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

export default function PreviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | undefined>(undefined);

  useEffect(() => {
    (async () => {
      // Get gender for text customization
      const onboardingData = await getOnboardingData();
      setGender(onboardingData.gender as Gender | undefined);

      const programDraft = await getProgramDraft();

      if (!programDraft) {
        console.warn('[Preview] No draft found - showing error');
        setDraftError('לא נמצאה טיוטת תוכנית להצגה');
        setLoading(false);
        return;
      }

      console.log('[Preview] draft loaded', {
        hasNutritionPlan: !!programDraft.nutritionPlan,
        calories: programDraft.calories,
        stagesCount: programDraft.stages?.length || 0,
        version: programDraft.version,
      });

      setLoading(false);
    })();
  }, []);

  const goToSignup = () => {
    router.push('/(auth)/signup');
  };

  const handleSourceClick = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('[Preview] Error opening URL:', error);
    }
  };

  const features = [
    {
      id: 'map',
      icon: '🗺️',
      title: 'מפת המסע המלאה',
      description: 'מפה אינטראקטיבית עם כל השלבים והמשימות במסך אחד.',
    },
    {
      id: 'food-scan',
      icon: '📸',
      title: 'צילום וסריקת מזון',
      description: getGenderedText(
        gender,
        'צלם את האוכל או סרוק ברקוד - קבל ניתוח תזונתי מיידי ומדויק.',
        'צלמי את האוכל או סרקי ברקוד - קבלי ניתוח תזונתי מיידי ומדויק.',
        'צלם/י את האוכל או סרוק/י ברקוד - קבל/י ניתוח תזונתי מיידי ומדויק.'
      ),
    },
    {
      id: 'nutrition',
      icon: '🥗',
      title: 'תזונה מותאמת אישית',
      description: 'תפריט תזונה מותאם אישית לפי הנתונים והיעדים שלך.',
    },
    {
      id: 'progress',
      icon: '🏆',
      title: 'מעקב והתקדמות',
      description: 'נקודות, מדדים ושמירה של כל התהליך שלך.',
    },
  ];

  const howItWorks = [
    {
      icon: '🗺️',
      text: getGenderedText(
        gender,
        'עקוב אחר המשימות במפת המסע',
        'עקבי אחר המשימות במפת המסע',
        'עקוב/י אחר המשימות במפת המסע'
      ),
    },
    {
      icon: '📸',
      text: getGenderedText(
        gender,
        'תעד ארוחות באמצעות צילום או סריקת ברקוד',
        'תעדי ארוחות באמצעות צילום או סריקת ברקוד',
        'תעד/י ארוחות באמצעות צילום או סריקת ברקוד'
      ),
    },
    {
      icon: '✓',
      text: getGenderedText(
        gender,
        'השלם משימות יומיות וצבור נקודות',
        'השלימי משימות יומיות וצברי נקודות',
        'השלם/י משימות יומיות וצבור/י נקודות'
      ),
    },
    {
      icon: '🏆',
      text: getGenderedText(
        gender,
        'עקוב אחר ההתקדמות עד הגעה ליעד',
        'עקבי אחר ההתקדמות עד הגעה ליעד',
        'עקוב/י אחר ההתקדמות עד הגעה ליעד'
      ),
    },
  ];

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={styles.loadingText}>טוען תוכנית...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (draftError) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['top', 'bottom']}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>לא נמצאה תוכנית</Text>
        <Text style={styles.errorDescription}>
          לא נמצאה טיוטת תוכנית להצגה. ייתכן שהתוכנית פגה תוקף (48 שעות) או נמחקה.
        </Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity
            style={styles.errorButtonPrimary}
            onPress={() => router.push('/onboarding/generating')}
          >
            <Text style={styles.errorButtonPrimaryText}>חזרה ליצירת תוכנית</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.errorButtonSecondary}
            onPress={() => router.push('/onboarding/summary')}
          >
            <Text style={styles.errorButtonSecondaryText}>חזרה לשאלון</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {getGenderedText(
              gender,
              'מסע הכושר שלך מוכן — בואו נתחיל!',
              'מסע הכושר שלך מוכן — בואי נתחיל!',
              'מסע הכושר שלך מוכן — בואו נתחיל!'
            )}
          </Text>
          <Text style={styles.subtitle}>
            יצרנו לך מסע אישי עם משימות מדויקות, תזונה מותאמת לפי היעדים שלך ומעקב התקדמות.
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>✓</Text>
            <Text style={styles.badgeText}>המסע האישי שלך נוצר ומחכה לך!</Text>
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.section}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={styles.featureCard}
              onPress={goToSignup}
              activeOpacity={0.8}
            >
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* How It Works Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {getGenderedText(
              gender,
              'איך תגיע ליעד שלך?',
              'איך תגיעי ליעד שלך?',
              'איך תגיע/י ליעד שלך?'
            )}
          </Text>
          <View style={styles.howItWorksContainer}>
            {howItWorks.map((step, index) => (
              <View key={index} style={styles.howItWorksItem}>
                <View style={styles.howItWorksIconContainer}>
                  <Text style={styles.howItWorksIcon}>{step.icon}</Text>
                </View>
                <Text style={styles.howItWorksText}>{step.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sources Section */}
        <View style={styles.section}>
          <Text style={styles.sourcesTitle}>התוכנית מבוססת על המקורות הבאים:</Text>
          <View style={styles.sourcesContainer}>
            {SOURCES.map((source, index) => (
              <TouchableOpacity
                key={index}
                style={styles.sourceItem}
                onPress={() => handleSourceClick(source.url)}
                activeOpacity={0.7}
              >
                <Text style={styles.sourceText}>{source.title}</Text>
                <Text style={styles.sourceIcon}>↗</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom Spacer for sticky button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={styles.stickyBottom}>
        <PrimaryButton onPress={goToSignup}>בואו נתחיל</PrimaryButton>
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
    paddingTop: spacing.lg,
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
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
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
  errorButtonSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  errorButtonSecondaryText: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },

  // Header
  header: {
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.text.primary,
    textAlign: 'right',
    lineHeight: 38,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'right',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 241, 99, 0.12)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-end',
    gap: spacing.sm,
  },
  badgeIcon: {
    fontSize: typography.size.base,
    color: colors.accent.primary,
  },
  badgeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.accent.primary,
  },

  // Sections
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Feature Cards
  featureCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'right',
    lineHeight: 20,
  },

  // How It Works
  howItWorksContainer: {
    gap: spacing.md,
  },
  howItWorksItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  howItWorksIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  howItWorksIcon: {
    fontSize: 20,
  },
  howItWorksText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.primary,
    textAlign: 'right',
  },

  // Sources
  sourcesTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  sourcesContainer: {
    gap: spacing.sm,
  },
  sourceItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sourceText: {
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
    textAlign: 'right',
  },
  sourceIcon: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.4)',
    marginRight: spacing.sm,
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
