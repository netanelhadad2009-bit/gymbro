import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, texts, typography, borderRadius, spacing } from '../../lib/theme';

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    // Validation
    if (!email || !password || !confirmPassword) {
      setError('נא למלא את כל השדות');
      return;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות לא תואמות');
      return;
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        // Translate common error messages
        if (authError.message.includes('already registered')) {
          setError('כתובת האימייל כבר רשומה');
        } else if (authError.message.includes('Invalid email')) {
          setError('כתובת אימייל לא תקינה');
        } else {
          setError(authError.message);
        }
      }
      // Auth state change will handle navigation
    } catch (err) {
      setError('שגיאה לא צפויה. נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="חזור"
          >
            <Text style={styles.backButtonText}>→</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Title */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>{texts.auth.createAccount}</Text>
            </View>

            {/* Social Auth Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton}>
                <Text style={styles.socialButtonText}>
                  {texts.auth.continueWithApple}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButtonGoogle}>
                <Text style={styles.socialButtonGoogleText}>
                  {texts.auth.continueWithGoogle}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{texts.auth.or}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email/Password Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{texts.auth.email}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={texts.auth.emailPlaceholder}
                  placeholderTextColor={colors.text.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{texts.auth.password}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="לפחות 6 תווים"
                  placeholderTextColor={colors.text.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>אימות סיסמה</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן סיסמה שוב"
                  placeholderTextColor={colors.text.placeholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  textAlign="right"
                />
              </View>

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              <TouchableOpacity
                style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background.primary} />
                ) : (
                  <Text style={styles.signupButtonText}>{texts.auth.signupButton}</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Login link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginLinkText}>
                {texts.auth.alreadyHaveAccount}{' '}
                <Text style={styles.loginLinkBold}>{texts.auth.login}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.text.primary,
    fontSize: typography.size.xl,
  },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  titleSection: {
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  socialButtons: {
    gap: spacing.md,
  },
  socialButton: {
    height: 56,
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonText: {
    color: colors.background.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  socialButtonGoogle: {
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonGoogleText: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing['2xl'],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: typography.size.sm,
  },
  form: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    color: '#d9dee3',
    fontSize: typography.size.sm,
    textAlign: 'right',
  },
  input: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: typography.size.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  errorText: {
    color: '#ef4444',
    fontSize: typography.size.sm,
    textAlign: 'right',
  },
  signupButton: {
    height: 56,
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  signupButtonDisabled: {
    opacity: 0.5,
  },
  signupButtonText: {
    color: colors.background.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  loginLink: {
    marginTop: spacing['2xl'],
    alignItems: 'center',
  },
  loginLinkText: {
    color: colors.text.tertiary,
    fontSize: typography.size.sm,
  },
  loginLinkBold: {
    color: colors.accent.primary,
    fontWeight: typography.weight.bold,
  },
});
