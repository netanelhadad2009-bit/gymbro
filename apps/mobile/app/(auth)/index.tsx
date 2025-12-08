import { View, Text, StyleSheet, Image, TouchableOpacity, I18nManager, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, borderRadius, spacing } from '../../lib/theme';

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Header with Title */}
        <View style={styles.header}>
          <Text style={styles.title}>FitJourney</Text>
          <View style={styles.titleUnderline} />
          <Text style={styles.subtitle}>
            המאמן הדיגיטלי שלך — מותאם אישית אליך.
          </Text>
        </View>

        {/* Logo Image - Centered */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.webp')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/onboarding/gender')}
          >
            <Text style={styles.ctaButtonText}>התחל את השאלון</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginLinkText}>
              כבר יש לך משתמש? <Text style={styles.loginLinkBold}>התחבר עכשיו</Text>
            </Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.termsText}>
            בלחיצה על התחל את השאלון, אתה מסכים ל-{'\n'}
            <Text style={styles.termsLink}>תנאי השימוש</Text> ו-
            <Text style={styles.termsLink}>מדיניות הפרטיות</Text> שלנו.
          </Text>
        </View>
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
    paddingHorizontal: spacing.xl,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 42,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: -1,
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: colors.accent.primary,
    borderRadius: 2,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: typography.size.lg,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Logo Container - Centered
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_WIDTH * 0.95,
  },

  // Bottom Section
  bottomSection: {
    paddingBottom: spacing.lg,
  },
  ctaButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ctaButtonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.background.primary,
  },
  loginLink: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  loginLinkText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  loginLinkBold: {
    color: colors.accent.primary,
    fontWeight: typography.weight.bold,
  },
  termsText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
});
