import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { colors, texts, typography, borderRadius, spacing } from '../../lib/theme';
import {
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
} from '../../lib/auth';

// Google Icon Component
const GoogleIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

// Apple Icon Component
const AppleIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      fill="#000"
    />
  </Svg>
);

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Check Apple Sign In availability on mount
  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
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
          setError('Invalid email or password');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Email not verified. Check your inbox');
        } else {
          setError(authError.message);
        }
      } else {
        // Login successful - check onboarding status and navigate
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('has_completed_onboarding')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.has_completed_onboarding) {
            router.replace('/(app)/journey');
          } else {
            router.replace('/onboarding/gender');
          }
        }
      }
    } catch (err) {
      setError('Unexpected error. Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const result = await signInWithGoogle();

      if (!result.success) {
        setError(result.error || 'Error signing in with Google');
      } else {
        // Login successful - check onboarding status and navigate
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('has_completed_onboarding')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.has_completed_onboarding) {
            router.replace('/(app)/journey');
          } else {
            router.replace('/onboarding/gender');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error signing in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setAppleLoading(true);

    try {
      const result = await signInWithApple();

      if (!result.success) {
        setError(result.error || 'Error signing in with Apple');
      } else {
        // Login successful - check onboarding status and navigate
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('has_completed_onboarding')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.has_completed_onboarding) {
            router.replace('/(app)/journey');
          } else {
            router.replace('/onboarding/gender');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error signing in with Apple');
    } finally {
      setAppleLoading(false);
    }
  };

  const isAnyLoading = loading || googleLoading || appleLoading;

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
            onPress={() => router.push('/(auth)/')}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Social Auth Buttons */}
          <View style={styles.socialButtons}>
            {(appleAvailable || Platform.OS === 'ios') && (
              <TouchableOpacity
                style={[styles.socialButton, isAnyLoading && styles.buttonDisabled]}
                onPress={handleAppleSignIn}
                activeOpacity={0.8}
                disabled={isAnyLoading}
              >
                {appleLoading ? (
                  <ActivityIndicator color={colors.background.primary} />
                ) : (
                  <>
                    <AppleIcon />
                    <Text style={styles.socialButtonText}>
                      {texts.auth.continueWithApple}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.socialButtonGoogle, isAnyLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              activeOpacity={0.8}
              disabled={isAnyLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.background.primary} />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={styles.socialButtonGoogleText}>
                    {texts.auth.continueWithGoogle}
                  </Text>
                </>
              )}
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
                textAlign="left"
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
                textAlign="left"
              />
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <TouchableOpacity
              style={[styles.loginButton, isAnyLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isAnyLoading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.background.primary} />
              ) : (
                <Text style={styles.loginButtonText}>{texts.auth.loginButton}</Text>
              )}
            </TouchableOpacity>
          </View>
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
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  socialButtonText: {
    color: colors.background.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  socialButtonGoogle: {
    height: 56,
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  socialButtonGoogleText: {
    color: colors.background.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  buttonDisabled: {
    opacity: 0.6,
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
    textAlign: 'left',
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
    textAlign: 'left',
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
});
