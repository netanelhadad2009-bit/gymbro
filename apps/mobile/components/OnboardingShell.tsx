import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors, typography, spacing } from '../lib/theme';

interface OnboardingShellProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  progress: number; // 0-100
  onBack?: () => void;
  hideNavigation?: boolean;
  disableScroll?: boolean;
}

export default function OnboardingShell({
  title,
  subtitle,
  children,
  footer,
  progress,
  onBack,
  hideNavigation = false,
  disableScroll = false,
}: OnboardingShellProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const Content = disableScroll ? View : ScrollView;
  const contentProps = disableScroll
    ? { style: styles.contentContainer }
    : {
        style: styles.contentContainer,
        contentContainerStyle: styles.scrollContent,
        showsVerticalScrollIndicator: false,
        keyboardShouldPersistTaps: 'handled' as const,
      };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Navigation Bar */}
        {!hideNavigation && (
          <View style={styles.navBar}>
            {/* Back Button - Absolute positioned to left */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Header */}
        {(title || subtitle) && (
          <View style={styles.header}>
            {typeof title === 'string' ? (
              <Text style={styles.title}>{title}</Text>
            ) : (
              title
            )}
            {subtitle && (
              typeof subtitle === 'string' ? (
                <Text style={styles.subtitle}>{subtitle}</Text>
              ) : (
                subtitle
              )
            )}
          </View>
        )}

        {/* Content */}
        <Content {...contentProps}>
          <View style={styles.content}>{children}</View>
        </Content>

        {/* Footer */}
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 40,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  progressContainer: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 28,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'left',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'left',
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
});
