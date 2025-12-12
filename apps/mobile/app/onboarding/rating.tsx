import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Star } from 'lucide-react-native';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

// Use same avatars as testimonial users plus one more
const avatars = [
  'https://i.pravatar.cc/100?img=14', // יוסי כהן
  'https://i.pravatar.cc/100?img=15', // דני לוי
  'https://i.pravatar.cc/100?img=16', // Additional user
];

const testimonials = [
  {
    name: 'Josh Miller',
    avatar: 'https://i.pravatar.cc/100?img=14',
    rating: 5,
    text: '"This app helped me reach my goals in a precise and simple way. The plan is personalized and gives me exactly what I need."',
  },
  {
    name: 'Dan Smith',
    avatar: 'https://i.pravatar.cc/100?img=15',
    rating: 5,
    text: '"Amazing user experience! Everything is very intuitive and easy to use. I feel like the app really understands me and my needs."',
  },
];

export default function RatingPage() {
  const router = useRouter();
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsButtonEnabled(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    router.push('/onboarding/reminders');
  };

  return (
    <OnboardingShell
      title="Rate Us"
      subtitle=""
      progress={getStepProgress('rating')}
      footer={
        <PrimaryButton onPress={handleContinue} disabled={!isButtonEnabled}>
          Next
        </PrimaryButton>
      }
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stars Card */}
        <View style={styles.starsCard}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={40}
                color={colors.accent.primary}
                fill={colors.accent.primary}
              />
            ))}
          </View>
        </View>

        {/* Main Message */}
        <Text style={styles.mainMessage}>
          FitJourney is built{'\n'}for people like you
        </Text>

        {/* Avatars Row */}
        <View style={styles.avatarsContainer}>
          {avatars.map((uri, index) => (
            <View
              key={index}
              style={[
                styles.avatarWrapper,
                { marginLeft: index > 0 ? -15 : 0, zIndex: avatars.length - index }
              ]}
            >
              <Image source={{ uri }} style={styles.avatar} />
            </View>
          ))}
        </View>

        {/* Users Count Text */}
        <Text style={styles.usersText}>
          Thousands of users already on their journey with FitJourney
        </Text>

        {/* Testimonial Cards */}
        {testimonials.map((testimonial, index) => (
          <View key={index} style={styles.testimonialCard}>
            <View style={styles.testimonialHeader}>
              <View style={styles.testimonialUser}>
                <Image source={{ uri: testimonial.avatar }} style={styles.testimonialAvatar} />
                <Text style={styles.testimonialName}>{testimonial.name}</Text>
              </View>
              <View style={styles.testimonialStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    color={colors.accent.primary}
                    fill={star <= testimonial.rating ? colors.accent.primary : 'transparent'}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.testimonialText}>{testimonial.text}</Text>
          </View>
        ))}
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  starsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.xl,
    marginBottom: spacing.xl,
    width: '100%',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  mainMessage: {
    fontSize: 24,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 34,
  },
  avatarsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarWrapper: {
    borderWidth: 3,
    borderColor: colors.background.primary,
    borderRadius: 30,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  usersText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  testimonialCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.md,
  },
  testimonialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  testimonialUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  testimonialName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  testimonialStars: {
    flexDirection: 'row',
    gap: 2,
  },
  testimonialText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'left',
    lineHeight: 22,
  },
});
