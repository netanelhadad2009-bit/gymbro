import { Stack } from 'expo-router';
import { colors } from '../../lib/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'slide_from_left', // RTL-friendly animation
      }}
    />
  );
}
