import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import OnboardingShell from '../../components/OnboardingShell';
import { saveOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing } from '../../lib/theme';

export default function RemindersPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Reset loading state when screen comes into focus (e.g., when navigating back)
  useFocusEffect(
    useCallback(() => {
      setIsLoading(false);
    }, [])
  );

  const handleEnableNotifications = async () => {
    setIsLoading(true);

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        await saveOnboardingData({ notifications_opt_in: true });
        router.push('/onboarding/generating');
      } else {
        // Permission denied
        Alert.alert(
          'התראות נדחו',
          'תוכל להפעיל התראות מאוחר יותר בהגדרות',
          [{ text: 'המשך', onPress: () => handleSkip() }]
        );
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      handleSkip();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    await saveOnboardingData({ notifications_opt_in: false });
    router.push('/onboarding/generating');
  };

  return (
    <OnboardingShell
      progress={getStepProgress('reminders')}
      hideNavigation
    >
      <View style={styles.content}>
        {/* Title above card */}
        <Text style={styles.titleText}>
          הישאר במסלול{'\n'}עם התראות
        </Text>

        {/* Permission Card */}
        <View style={styles.permissionCard}>
          <Text style={styles.cardTitle}>
            {'\u200F'}"FitJourney" מבקש לשלוח לך התראות
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.allowButton}
              onPress={handleEnableNotifications}
              disabled={isLoading}
            >
              <Text style={styles.allowButtonText}>אישור</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.denyButton}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={styles.denyButtonText}>סירוב</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.pointerContainer}>
          <Text style={styles.pointerEmoji}>👆</Text>
          <View style={styles.pointerSpacer} />
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  titleText: {
    fontSize: 32,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingTop: 40,
    alignItems: 'center',
    width: '90%',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: typography.weight.semibold,
    color: '#000',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  allowButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(0,0,0,0.1)',
  },
  allowButtonText: {
    fontSize: 17,
    fontWeight: typography.weight.semibold,
    color: '#007AFF',
  },
  denyButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderLeftWidth: 0.5,
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },
  denyButtonText: {
    fontSize: 17,
    fontWeight: typography.weight.regular,
    color: '#007AFF',
  },
  pointerContainer: {
    flexDirection: 'row',
    width: '90%',
    marginTop: spacing.md,
  },
  pointerEmoji: {
    fontSize: 40,
    flex: 1,
    textAlign: 'center',
  },
  pointerSpacer: {
    flex: 1,
  },
});
