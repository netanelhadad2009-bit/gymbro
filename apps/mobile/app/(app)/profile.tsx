import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  I18nManager,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  colors,
  texts,
  typography,
  borderRadius,
  spacing,
  genderToHe,
  goalToHe,
  dietToHe,
} from '../../lib/theme';
import {
  LogOut,
  Shield,
  FileText,
  Trash2,
  ChevronLeft,
} from 'lucide-react-native';

// Force RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

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
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

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
        .single();

      // Get goal from latest program
      const { data: programData } = await supabase
        .from('programs')
        .select('goal')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const metadata = user.user_metadata || {};

      // Build profile with data from database and fallbacks
      const profileResult: ProfileData = {
        email: user.email,
        gender: profileData?.gender || metadata.gender,
        age: profileData?.age || metadata.age,
        weight: profileData?.weight || profileData?.weight_kg || metadata.weight_kg,
        target_weight: profileData?.target_weight || metadata.target_weight_kg,
        height_cm: profileData?.height_cm || metadata.height_cm,
        goal: programData?.goal || profileData?.goal || metadata.goal,
        diet_type: profileData?.diet_type || profileData?.diet || metadata.diet,
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
          onPress: signOut,
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'מחיקת חשבון',
      'פעולה זו תמחק את כל הנתונים שלך לצמיתות. האם אתה בטוח?',
      [
        { text: texts.profile.cancel, style: 'cancel' },
        {
          text: 'מחק חשבון',
          style: 'destructive',
          onPress: async () => {
            Alert.alert('שגיאה', 'מחיקת חשבון עדיין לא זמינה');
          },
        },
      ]
    );
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את הקישור');
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
              <ReadonlyField label={texts.profile.gender} value={genderToHe(profile?.gender)} />
              <ReadonlyField label={texts.profile.age} value={profile?.age} />
              <ReadonlyField label={texts.profile.weight} value={profile?.weight} />
              <ReadonlyField label={texts.profile.targetWeight} value={profile?.target_weight} />
              <ReadonlyField label={texts.profile.height} value={profile?.height_cm} />
              <ReadonlyField label={texts.profile.goal} value={goalToHe(profile?.goal)} />
              <ReadonlyField label={texts.profile.dietType} value={dietToHe(profile?.diet_type)} />

              {/* Edit Profile Link */}
              <TouchableOpacity style={styles.editLink}>
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
              onPress={() => openUrl('https://fitjourney.app/privacy')}
            >
              <View style={styles.settingsRowContent}>
                <Shield size={18} color={colors.text.secondary} />
                <Text style={styles.settingsRowText}>{texts.profile.privacyPolicy}</Text>
              </View>
            </TouchableOpacity>

            {/* Terms of Use */}
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => openUrl('https://fitjourney.app/terms')}
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

        {/* Support Card */}
        {!loading && (
          <View style={styles.supportCard}>
            <Text style={styles.supportTitle}>צריך עזרה?</Text>
            <Text style={styles.supportText}>
              אנחנו כאן בשבילך! שלח לנו הודעה ב-WhatsApp
            </Text>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => openUrl('https://wa.me/972500000000')}
            >
              <Text style={styles.supportButtonText}>שלח הודעה</Text>
            </TouchableOpacity>
          </View>
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
    textAlign: 'right',
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
    textAlign: 'right',
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
    textAlign: 'right',
  },
  skeletonLabel: {
    width: 80,
    height: 16,
    backgroundColor: colors.background.cardAlt,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    alignSelf: 'flex-end',
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
    justifyContent: 'flex-end',
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
  supportCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  supportText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  supportButton: {
    backgroundColor: '#25D366',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.lg,
  },
  supportButtonText: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  bottomSpacing: {
    height: spacing['4xl'],
  },
});
