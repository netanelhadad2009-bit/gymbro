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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, texts, typography, borderRadius, spacing } from '../../lib/theme';

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('נא למלא את כל השדות');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        // Translate common error messages
        if (authError.message.includes('Invalid login credentials')) {
          setError('אימייל או סיסמה שגויים');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('האימייל לא אומת. בדוק את תיבת הדואר שלך');
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

        <View style={styles.content}>
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
                placeholder=""
                placeholderTextColor={colors.text.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                textAlign="right"
              />
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background.primary} />
              ) : (
                <Text style={styles.loginButtonText}>{texts.auth.loginButton}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign up link */}
          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.signupLinkText}>
              {texts.auth.dontHaveAccount}{' '}
              <Text style={styles.signupLinkBold}>{texts.auth.signup}</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
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
  loginButton: {
    height: 56,
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: colors.background.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  signupLink: {
    marginTop: spacing['2xl'],
    alignItems: 'center',
  },
  signupLinkText: {
    color: colors.text.tertiary,
    fontSize: typography.size.sm,
  },
  signupLinkBold: {
    color: colors.accent.primary,
    fontWeight: typography.weight.bold,
  },
});
