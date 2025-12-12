import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  colors,
  texts,
  typography,
  borderRadius,
  spacing,
  genderToEn,
  goalToEn,
  dietToEn,
} from '../../lib/theme';
import {
  LogOut,
  Shield,
  FileText,
  Trash2,
  ChevronLeft,
  MessageCircle,
} from 'lucide-react-native';

interface ProfileData {
  email?: string;
  gender?: string;
  age?: number;
  weight?: number;
  target_weight?: number;
  height_cm?: number;
  goal?: string | null;
  diet_type?: string;
}

// Helper to format values
function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

// Readonly field component
function ReadonlyField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValue}>
        <Text style={styles.fieldValueText}>{formatValue(value)}</Text>
      </View>
    </View>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <View style={styles.fieldContainer}>
      <View style={styles.skeletonLabel} />
      <View style={styles.skeletonValue} />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Reload profile data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [user])
  );

  const loadProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get profile data from database
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // Get avatar data as fallback
      const { data: avatarData } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get goal from latest program
      const { data: programData } = await supabase
        .from('programs')
        .select('goal')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const metadata = user.user_metadata || {};

      // If profile is empty, try to backfill from AsyncStorage onboarding data
      let onboardingData = null;
      if (!profileData || (!profileData.age && !profileData.weight_kg && !profileData.height_cm)) {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const stored = await AsyncStorage.getItem('onboarding-data');
          if (stored) {
            onboardingData = JSON.parse(stored);
            console.log('[Profile] Found onboarding data in AsyncStorage, backfilling profile...');

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

            const age = calculateAge(onboardingData.birthdate);

            // Backfill profile with onboarding data
            await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                gender: onboardingData.gender,
                age: age,
                weight_kg: onboardingData.weight_kg,
                target_weight_kg: onboardingData.target_weight_kg,
                height_cm: onboardingData.height_cm,
                goal: onboardingData.goals?.[0],
                diet: onboardingData.diet,
                birthdate: onboardingData.birthdate,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'id'
              });

            console.log('[Profile] ✅ Profile backfilled from AsyncStorage');

            // Reload profile data after backfill
            const { data: refreshedProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();

            if (refreshedProfile) {
              profileData = refreshedProfile as any;
            }
          }
        } catch (err) {
          console.warn('[Profile] Could not backfill from AsyncStorage:', err);
        }
      }

      // Build profile with data from database and fallbacks (profile → avatar → onboarding → metadata)
      const profileResult: ProfileData = {
        email: user.email,
        gender: profileData?.gender || avatarData?.gender || onboardingData?.gender || metadata.gender,
        age: profileData?.age || onboardingData?.age || metadata.age,
        weight: profileData?.weight || profileData?.weight_kg || onboardingData?.weight_kg || metadata.weight_kg,
        target_weight: profileData?.target_weight || profileData?.target_weight_kg || onboardingData?.target_weight_kg || metadata.target_weight_kg,
        height_cm: profileData?.height_cm || onboardingData?.height_cm || metadata.height_cm,
        goal: programData?.goal || avatarData?.goal || profileData?.goal || onboardingData?.goals?.[0] || metadata.goal,
        diet_type: profileData?.diet_type || profileData?.diet || avatarData?.diet || onboardingData?.diet || metadata.diet,
      };

      setProfile(profileResult);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      texts.profile.logoutTitle,
      texts.profile.logoutConfirm,
      [
        { text: texts.profile.cancel, style: 'cancel' },
        {
          text: texts.profile.logout,
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete all your data. Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get the API base URL from environment
              const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

              // Get current session token for authentication
              const { data: { session } } = await supabase.auth.getSession();

              if (!session) {
                Alert.alert('Error', 'You must be logged in to delete your account');
                return;
              }

              // Call the account deletion API endpoint
              const response = await fetch(`${API_BASE_URL}/api/account/delete`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
              });

              // Check if deletion was successful
              if (response.ok) {
                console.log('[Profile] Account deleted successfully');
                await signOut();
                router.replace('/(auth)/');
                return;
              }

              // Handle error response
              const errorText = await response.text();
              console.error('[Profile] Account deletion failed:', errorText);

              // If the error is "User not found", it might mean the account was already deleted
              // In this case, just sign out and continue
              if (errorText.includes('User not found') || errorText.includes('unauthorized')) {
                console.log('[Profile] User not found - account may already be deleted, signing out');
                await signOut();
                router.replace('/(auth)/');
                return;
              }

              // For other errors, show error message
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } catch (error) {
              console.error('[Profile] Error during account deletion:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open link');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{texts.profile.title}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Personal Info Card */}
        <View style={styles.card}>
          {loading ? (
            <>
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
            </>
          ) : (
            <>
              <ReadonlyField label={texts.profile.email} value={profile?.email} />
              <ReadonlyField label={texts.profile.gender} value={genderToEn(profile?.gender)} />
              <ReadonlyField label={texts.profile.age} value={profile?.age} />
              <ReadonlyField label={texts.profile.weight} value={profile?.weight} />
              <ReadonlyField label={texts.profile.targetWeight} value={profile?.target_weight} />
              <ReadonlyField label={texts.profile.height} value={profile?.height_cm} />
              <ReadonlyField label={texts.profile.goal} value={goalToEn(profile?.goal)} />
              <ReadonlyField label={texts.profile.dietType} value={dietToEn(profile?.diet_type)} />

              {/* Edit Profile Link */}
              <TouchableOpacity
                style={styles.editLink}
                onPress={() => router.push('/(app)/profile/edit')}
              >
                <Text style={styles.editLinkText}>{texts.profile.editProfile}</Text>
                <ChevronLeft size={16} color={colors.accent.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Settings Card */}
        {!loading && (
          <View style={styles.card}>
            {/* Privacy Policy */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => openUrl('https://fitjourney1.carrd.co/')}
            >
              <View style={styles.settingsRowContent}>
                <Shield size={18} color={colors.text.secondary} />
                <Text style={styles.settingsRowText}>{texts.profile.privacyPolicy}</Text>
              </View>
            </TouchableOpacity>

            {/* Terms of Use */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => openUrl('https://fitjourney2.carrd.co/')}
            >
              <View style={styles.settingsRowContent}>
                <FileText size={18} color={colors.text.secondary} />
                <Text style={styles.settingsRowText}>{texts.profile.termsOfUse}</Text>
              </View>
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={handleDeleteAccount}
            >
              <View style={styles.settingsRowContent}>
                <Trash2 size={18} color={colors.semantic.error} />
                <Text style={[styles.settingsRowText, styles.deleteText]}>
                  {texts.profile.deleteAccount}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity
              style={[styles.settingsRow, styles.settingsRowLast]}
              onPress={handleLogout}
            >
              <View style={styles.settingsRowContent}>
                <LogOut size={18} color={colors.semantic.error} />
                <Text style={[styles.settingsRowText, styles.deleteText]}>
                  {texts.profile.logout}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* WhatsApp Support */}
        {!loading && (
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={() => openUrl('https://wa.me/972505338240?text=%D7%94%D7%99%D7%99%20FitJourney%2C%20%D7%99%D7%A9%20%D7%9C%D7%99%20%D7%A9%D7%90%D7%9C%D7%94%3A')}
            activeOpacity={0.85}
          >
            <View style={styles.whatsappIconOuter}>
              <View style={styles.whatsappIconInner}>
                <MessageCircle size={22} color="#25D366" fill="#25D366" />
              </View>
            </View>
            <View style={styles.whatsappContent}>
              <Text style={styles.whatsappTitle}>Need Help?</Text>
              <Text style={styles.whatsappSubtitle}>Chat with us on WhatsApp</Text>
            </View>
            <View style={styles.whatsappArrow}>
              <ChevronLeft size={20} color="rgba(255,255,255,0.6)" style={{ transform: [{ rotate: '180deg' }] }} />
            </View>
          </TouchableOpacity>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'left',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textAlign: 'left',
  },
  fieldValue: {
    backgroundColor: colors.background.cardAlt,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  fieldValueText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    textAlign: 'left',
  },
  skeletonLabel: {
    width: 80,
    height: 16,
    backgroundColor: colors.background.cardAlt,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  skeletonValue: {
    height: 40,
    backgroundColor: colors.background.cardAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  editLinkText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.accent.primary,
  },
  settingsRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  settingsRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsRowText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  deleteText: {
    color: colors.semantic.error,
  },
  whatsappButton: {
    backgroundColor: '#128C7E',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#128C7E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  whatsappIconOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappIconInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappContent: {
    flex: 1,
  },
  whatsappTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: '#fff',
    textAlign: 'left',
  },
  whatsappSubtitle: {
    fontSize: typography.size.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'left',
  },
  whatsappArrow: {
    marginLeft: spacing.xs,
  },
  bottomSpacing: {
    height: 140, // Extra space to prevent tab bar from hiding content
  },
});
