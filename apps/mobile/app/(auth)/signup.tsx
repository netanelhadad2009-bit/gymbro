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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, typography, borderRadius, spacing } from '../../lib/theme';
import {
  signInWithGoogle,
  signInWithApple,
  signUpWithEmail,
  isAppleSignInAvailable,
} from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { getOnboardingData, clearOnboardingData } from '../../lib/onboarding-storage';

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

// Checkbox Component
const Checkbox = ({ checked, onPress }: { checked: boolean; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.checkbox}>
    {checked ? (
      <View style={styles.checkboxChecked}>
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#000" />
        </Svg>
      </View>
    ) : (
      <View style={styles.checkboxUnchecked} />
    )}
  </TouchableOpacity>
);

// Helper function to check if onboarding data exists after signup
async function checkOnboardingDataAfterSignup(userId: string): Promise<boolean> {
  try {
    console.log('[Signup] Checking for onboarding data...');
    const onboardingData = await getOnboardingData();

    // Check if there's any onboarding data
    const hasOnboardingData = Object.keys(onboardingData).filter(key => key !== 'updatedAt').length > 0;

    if (hasOnboardingData) {
      console.log('[Signup] Found onboarding data:', Object.keys(onboardingData));

      // Mark onboarding as complete in profiles table (upsert to create if missing)
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          has_completed_onboarding: true,
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('[Signup] Error marking onboarding complete:', error);
        // Continue anyway - onboarding data is still in local storage
      } else {
        console.log('[Signup] ✅ Marked onboarding as complete');
      }

      // Keep onboarding data in local storage - it will be used by the app
      // Don't clear it, as the journey/avatar creation needs this data
      return true;
    } else {
      console.log('[Signup] No onboarding data found');
      return false;
    }
  } catch (error) {
    console.error('[Signup] Error checking onboarding data:', error);
    return false;
  }
}

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConsent, setEmailConsent] = useState(true);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Check Apple Sign In availability on mount
  useEffect(() => {
    console.log('[Signup] Component mounted');
    console.log('[Signup] Initial loading states - loading:', loading, 'googleLoading:', googleLoading, 'appleLoading:', appleLoading);
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const handleSignup = async () => {
    console.log('[Signup] handleSignup called');

    // Validation
    if (!email || !password || !confirmPassword) {
      console.log('[Signup] Validation failed: missing fields');
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      console.log('[Signup] Validation failed: passwords do not match');
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      console.log('[Signup] Validation failed: password too short');
      setError('Password must be at least 6 characters');
      return;
    }

    console.log('[Signup] Validation passed, starting signup...');
    setError(null);
    setLoading(true);

    try {
      const result = await signUpWithEmail(email, password, {
        emailConsent,
      });

      console.log('[Signup] signUpWithEmail returned:', {
        success: result.success,
        needsVerification: result.needsVerification,
        hasUser: !!result.user,
        hasError: !!result.error,
      });

      if (!result.success) {
        console.log('[Signup] Signup failed:', result.error);
        setError(result.error || 'Error signing up');
      } else if (result.needsVerification) {
        console.log('[Signup] Email verification required');
        Alert.alert(
          'Email Verification',
          'A verification email has been sent. Please check your inbox.',
          [{ text: 'OK', onPress: () => router.push('/(auth)/login') }]
        );
      } else if (result.user) {
        console.log('[Signup] User created successfully, checking onboarding data...');
        // Check if onboarding data exists
        const hadOnboardingData = await checkOnboardingDataAfterSignup(result.user.id);

        console.log('[Signup] Check complete, hadOnboardingData:', hadOnboardingData);
        // Navigate based on onboarding status
        if (hadOnboardingData) {
          console.log('[Signup] Has onboarding data - redirecting to generating page to create avatar...');
          // User completed onboarding before signup - go to generating page to create avatar and save program
          router.replace('/onboarding/generating');
        } else {
          console.log('[Signup] No onboarding data - starting fresh onboarding...');
          // New user - start onboarding from scratch
          router.replace('/onboarding/gender');
        }
      } else {
        console.log('[Signup] ⚠️ Unexpected state: success=true but no user or needsVerification');
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
        // Get current user and check onboarding data
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const hadOnboardingData = await checkOnboardingDataAfterSignup(user.id);

          // Navigate based on onboarding status
          if (hadOnboardingData) {
            // User completed onboarding before signup - go to generating page to create avatar
            router.replace('/onboarding/generating');
          } else {
            // New user - start onboarding
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
        // Get current user and check onboarding data
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const hadOnboardingData = await checkOnboardingDataAfterSignup(user.id);

          // Navigate based on onboarding status
          if (hadOnboardingData) {
            // User completed onboarding before signup - go to generating page to create avatar
            router.replace('/onboarding/generating');
          } else {
            // New user - start onboarding
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Title */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>Save Your Progress</Text>
            </View>

            {/* Social Auth Buttons */}
            <View style={styles.socialButtons}>
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
                    <Text style={styles.socialButtonGoogleText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {(appleAvailable || Platform.OS === 'ios') && (
                <TouchableOpacity
                  style={[styles.socialButtonApple, isAnyLoading && styles.buttonDisabled]}
                  onPress={handleAppleSignIn}
                  activeOpacity={0.8}
                  disabled={isAnyLoading}
                >
                  {appleLoading ? (
                    <ActivityIndicator color={colors.background.primary} />
                  ) : (
                    <>
                      <AppleIcon />
                      <Text style={styles.socialButtonAppleText}>Continue with Apple</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email/Password Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
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
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder=""
                  placeholderTextColor={colors.text.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  textAlign="left"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder=""
                  placeholderTextColor={colors.text.placeholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  textAlign="left"
                />
              </View>

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              {/* Email Consent */}
              <View style={styles.consentRow}>
                <Checkbox checked={emailConsent} onPress={() => setEmailConsent(!emailConsent)} />
                <Text style={styles.consentText}>
                  I agree to receive helpful fitness and nutrition tips via email.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.signupButton, isAnyLoading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={isAnyLoading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background.primary} />
                ) : (
                  <Text style={styles.signupButtonText}>Sign Up</Text>
                )}
              </TouchableOpacity>
            </View>
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
    paddingTop: spacing.xl,
  },
  content: {
    paddingHorizontal: spacing.xl,
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
  socialButtonApple: {
    height: 56,
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  socialButtonAppleText: {
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
    marginVertical: spacing.xl,
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
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    textAlign: 'left',
  },
  input: {
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  errorText: {
    color: '#ef4444',
    fontSize: typography.size.sm,
    textAlign: 'left',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  consentText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    textAlign: 'left',
    lineHeight: 20,
  },
  checkbox: {
    marginTop: 2,
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupButton: {
    height: 56,
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  signupButtonDisabled: {
    opacity: 0.5,
  },
  signupButtonText: {
    color: colors.background.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
});
