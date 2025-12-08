import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const ITEM_HEIGHT = 60;
const HEIGHT_MIN = 140;
const HEIGHT_MAX = 210;
const WEIGHT_MIN = 40;
const WEIGHT_MAX = 200;

const heightValues = Array.from({ length: HEIGHT_MAX - HEIGHT_MIN + 1 }, (_, i) => HEIGHT_MIN + i);
const weightValues = Array.from({ length: WEIGHT_MAX - WEIGHT_MIN + 1 }, (_, i) => WEIGHT_MIN + i);

function getBMICategory(bmi: number): { label: string; color: string; bg: string } {
  if (bmi < 18.5) return { label: 'תת משקל', color: '#5B6CFF', bg: '#b8c5ff' };
  if (bmi < 25) return { label: 'תקין', color: '#18C37D', bg: '#b0f4d7' };
  if (bmi < 30) return { label: 'עודף', color: '#FFA323', bg: '#ffd9a3' };
  return { label: 'השמנה', color: '#E5484D', bg: '#ffc2c2' };
}

export default function MetricsPage() {
  const router = useRouter();
  const [height, setHeight] = useState(160);
  const [weight, setWeight] = useState(55);

  const heightRef = useRef<ScrollView>(null);
  const weightRef = useRef<ScrollView>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Load saved data
    (async () => {
      const data = await getOnboardingData();
      if (data.height_cm) setHeight(data.height_cm);
      if (data.weight_kg) setWeight(data.weight_kg);

      // Initialize scroll positions after state updates
      setTimeout(() => {
        const heightIndex = (data.height_cm || height) - HEIGHT_MIN;
        const weightIndex = (data.weight_kg || weight) - WEIGHT_MIN;

        heightRef.current?.scrollTo({ y: heightIndex * ITEM_HEIGHT, animated: false });
        weightRef.current?.scrollTo({ y: weightIndex * ITEM_HEIGHT, animated: false });
        initializedRef.current = true;
      }, 100);
    })();
  }, []);

  const handleHeightScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!initializedRef.current) return;
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const newHeight = HEIGHT_MIN + index;
    if (newHeight >= HEIGHT_MIN && newHeight <= HEIGHT_MAX) {
      setHeight(newHeight);
    }
  };

  const handleWeightScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!initializedRef.current) return;
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const newWeight = WEIGHT_MIN + index;
    if (newWeight >= WEIGHT_MIN && newWeight <= WEIGHT_MAX) {
      setWeight(newWeight);
    }
  };

  const bmi = weight / Math.pow(height / 100, 2);
  const bmiInfo = getBMICategory(bmi);

  const handleContinue = async () => {
    await saveOnboardingData({
      height_cm: height,
      weight_kg: weight,
    });
    router.push('/onboarding/birthdate');
  };

  return (
    <OnboardingShell
      title={
        <Text style={styles.titleText}>
          מה הגובה והמשקל{'\n'}שלך?
        </Text>
      }
      subtitle={
        <Text style={styles.subtitleText}>
          נתחשב בזה כדי לחשב את{'\n'}נקודת הפתיחה המותאמת שלך.
        </Text>
      }
      progress={getStepProgress('metrics')}
      disableScroll
      footer={
        <PrimaryButton onPress={handleContinue}>
          הבא
        </PrimaryButton>
      }
    >
      {/* Pickers */}
      <View style={styles.pickersRow}>
        {/* Weight Picker */}
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerLabel}>משקל</Text>
          <View style={styles.pickerWrapper}>
            {/* Gradient overlays */}
            <LinearGradient
              colors={[colors.background.primary, 'transparent']}
              style={styles.gradientTop}
              pointerEvents="none"
            />
            <View style={styles.highlightBar} pointerEvents="none" />
            <LinearGradient
              colors={['transparent', colors.background.primary]}
              style={styles.gradientBottom}
              pointerEvents="none"
            />

            <ScrollView
              ref={weightRef}
              style={styles.scrollView}
              onScroll={handleWeightScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
            >
              <View style={{ height: ITEM_HEIGHT }} />
              {weightValues.map((w) => (
                <View key={w} style={[styles.pickerItem, { height: ITEM_HEIGHT }]}>
                  <Text style={[
                    styles.pickerItemText,
                    w === weight && styles.pickerItemTextSelected
                  ]}>
                    {w} ק״ג
                  </Text>
                </View>
              ))}
              <View style={{ height: ITEM_HEIGHT }} />
            </ScrollView>
          </View>
        </View>

        {/* Height Picker */}
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerLabel}>גובה</Text>
          <View style={styles.pickerWrapper}>
            <LinearGradient
              colors={[colors.background.primary, 'transparent']}
              style={styles.gradientTop}
              pointerEvents="none"
            />
            <View style={styles.highlightBar} pointerEvents="none" />
            <LinearGradient
              colors={['transparent', colors.background.primary]}
              style={styles.gradientBottom}
              pointerEvents="none"
            />

            <ScrollView
              ref={heightRef}
              style={styles.scrollView}
              onScroll={handleHeightScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
            >
              <View style={{ height: ITEM_HEIGHT }} />
              {heightValues.map((h) => (
                <View key={h} style={[styles.pickerItem, { height: ITEM_HEIGHT }]}>
                  <Text style={[
                    styles.pickerItemText,
                    h === height && styles.pickerItemTextSelected
                  ]}>
                    {h} ס״מ
                  </Text>
                </View>
              ))}
              <View style={{ height: ITEM_HEIGHT }} />
            </ScrollView>
          </View>
        </View>
      </View>

      {/* BMI Card */}
      <View style={styles.bmiContainer}>
        <View style={[styles.bmiCard, { backgroundColor: bmiInfo.bg }]}>
          <Text style={styles.bmiLabel}>BMI</Text>
          <Text style={[styles.bmiValue, { color: bmiInfo.color }]}>
            {bmi.toFixed(1)}
          </Text>
          <Text style={[styles.bmiCategory, { color: bmiInfo.color }]}>
            {bmiInfo.label}
          </Text>
        </View>

        {/* BMI Bar */}
        <View style={styles.bmiBar}>
          <View style={[styles.bmiBarSegment, { backgroundColor: '#5B6CFF' }]} />
          <View style={[styles.bmiBarSegment, { backgroundColor: '#18C37D' }]} />
          <View style={[styles.bmiBarSegment, { backgroundColor: '#FFA323' }]} />
          <View style={[styles.bmiBarSegment, { backgroundColor: '#E5484D' }]} />
        </View>
        <View style={styles.bmiLabels}>
          <Text style={styles.bmiBarLabel}>תת משקל</Text>
          <Text style={styles.bmiBarLabel}>תקין</Text>
          <Text style={styles.bmiBarLabel}>עודף</Text>
          <Text style={styles.bmiBarLabel}>השמנה</Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  titleText: {
    fontSize: 28,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'right',
    lineHeight: 36,
  },
  subtitleText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'right',
    lineHeight: 24,
  },
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  pickerColumn: {
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.sm,
  },
  pickerWrapper: {
    width: 112,
    height: ITEM_HEIGHT * 3,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  pickerItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.3)',
  },
  pickerItemTextSelected: {
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    transform: [{ scale: 1.1 }],
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    zIndex: 10,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    zIndex: 10,
  },
  highlightBar: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 5,
  },
  bmiContainer: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  bmiCard: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bmiLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  bmiValue: {
    fontSize: 32,
    fontWeight: typography.weight.bold,
  },
  bmiCategory: {
    fontSize: 12,
    fontWeight: typography.weight.semibold,
  },
  bmiBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 280,
  },
  bmiBarSegment: {
    flex: 1,
  },
  bmiLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 280,
    marginTop: spacing.sm,
  },
  bmiBarLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
});
