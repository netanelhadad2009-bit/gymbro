import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingShell from '../../components/OnboardingShell';
import PrimaryButton from '../../components/PrimaryButton';
import { saveOnboardingData, getOnboardingData, getStepProgress } from '../../lib/onboarding-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

const ITEM_HEIGHT = 60;
const MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const currentYear = new Date().getFullYear();
const yearValues = Array.from({ length: 86 }, (_, i) => currentYear - i);
const dayValues = Array.from({ length: 31 }, (_, i) => i + 1);

export default function BirthdatePage() {
  const router = useRouter();
  const [year, setYear] = useState(currentYear - 18);
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(1);

  const yearRef = useRef<ScrollView>(null);
  const monthRef = useRef<ScrollView>(null);
  const dayRef = useRef<ScrollView>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const data = await getOnboardingData();
      if (data.birthdate) {
        const date = new Date(data.birthdate);
        setYear(date.getFullYear());
        setMonth(date.getMonth());
        setDay(date.getDate());
      }

      setTimeout(() => {
        const yearIndex = yearValues.indexOf(data.birthdate ? new Date(data.birthdate).getFullYear() : year);
        const monthIndex = data.birthdate ? new Date(data.birthdate).getMonth() : month;
        const dayIndex = (data.birthdate ? new Date(data.birthdate).getDate() : day) - 1;

        yearRef.current?.scrollTo({ y: yearIndex * ITEM_HEIGHT, animated: false });
        monthRef.current?.scrollTo({ y: monthIndex * ITEM_HEIGHT, animated: false });
        dayRef.current?.scrollTo({ y: dayIndex * ITEM_HEIGHT, animated: false });
        initializedRef.current = true;
      }, 100);
    })();
  }, []);

  const calculateAge = () => {
    const today = new Date();
    const birthDate = new Date(year, month, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge();
  const isUnder18 = age < 18;

  const handleYearScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!initializedRef.current) return;
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    if (yearValues[index]) setYear(yearValues[index]);
  };

  const handleMonthScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!initializedRef.current) return;
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    if (index >= 0 && index < 12) setMonth(index);
  };

  const handleDayScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!initializedRef.current) return;
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    if (dayValues[index]) setDay(dayValues[index]);
  };

  const handleContinue = async () => {
    if (isUnder18) return;

    const birthdate = new Date(year, month, day);
    await saveOnboardingData({ birthdate: birthdate.toISOString() });
    router.push('/onboarding/target-weight');
  };

  return (
    <OnboardingShell
      title="מתי נולדת?"
      subtitle={
        <Text style={styles.subtitleText}>
          הגיל שלך משפיע על ההמלצות{'\n'}שתקבל באופן שוטף.
        </Text>
      }
      progress={getStepProgress('birthdate')}
      disableScroll
      footer={
        <View>
          {isUnder18 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                השימוש באפליקציה מיועד לגילאי 18 ומעלה.{'\n'}
                הגיל שלך: {age} שנים
              </Text>
            </View>
          )}
          <PrimaryButton onPress={handleContinue} disabled={isUnder18}>
            הבא
          </PrimaryButton>
        </View>
      }
    >
      {/* Date Pickers */}
      <View style={styles.pickersRow}>
        {/* Day Picker */}
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerLabel}>יום</Text>
          <View style={styles.pickerWrapper}>
            <LinearGradient colors={[colors.background.primary, 'transparent']} style={styles.gradientTop} pointerEvents="none" />
            <View style={styles.highlightBar} pointerEvents="none" />
            <LinearGradient colors={['transparent', colors.background.primary]} style={styles.gradientBottom} pointerEvents="none" />
            <ScrollView
              ref={dayRef}
              style={styles.scrollView}
              onScroll={handleDayScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
            >
              <View style={{ height: ITEM_HEIGHT }} />
              {dayValues.map((d) => (
                <View key={d} style={[styles.pickerItem, { height: ITEM_HEIGHT }]}>
                  <Text style={[styles.pickerItemText, d === day && styles.pickerItemTextSelected]}>
                    {d.toString().padStart(2, '0')}
                  </Text>
                </View>
              ))}
              <View style={{ height: ITEM_HEIGHT }} />
            </ScrollView>
          </View>
        </View>

        {/* Month Picker */}
        <View style={[styles.pickerColumn, { flex: 1.3 }]}>
          <Text style={styles.pickerLabel}>חודש</Text>
          <View style={styles.pickerWrapper}>
            <LinearGradient colors={[colors.background.primary, 'transparent']} style={styles.gradientTop} pointerEvents="none" />
            <View style={styles.highlightBar} pointerEvents="none" />
            <LinearGradient colors={['transparent', colors.background.primary]} style={styles.gradientBottom} pointerEvents="none" />
            <ScrollView
              ref={monthRef}
              style={styles.scrollView}
              onScroll={handleMonthScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
            >
              <View style={{ height: ITEM_HEIGHT }} />
              {MONTHS.map((m, idx) => (
                <View key={idx} style={[styles.pickerItem, { height: ITEM_HEIGHT }]}>
                  <Text style={[styles.pickerItemText, idx === month && styles.pickerItemTextSelected]}>
                    {m}
                  </Text>
                </View>
              ))}
              <View style={{ height: ITEM_HEIGHT }} />
            </ScrollView>
          </View>
        </View>

        {/* Year Picker */}
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerLabel}>שנה</Text>
          <View style={styles.pickerWrapper}>
            <LinearGradient colors={[colors.background.primary, 'transparent']} style={styles.gradientTop} pointerEvents="none" />
            <View style={styles.highlightBar} pointerEvents="none" />
            <LinearGradient colors={['transparent', colors.background.primary]} style={styles.gradientBottom} pointerEvents="none" />
            <ScrollView
              ref={yearRef}
              style={styles.scrollView}
              onScroll={handleYearScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
            >
              <View style={{ height: ITEM_HEIGHT }} />
              {yearValues.map((y) => (
                <View key={y} style={[styles.pickerItem, { height: ITEM_HEIGHT }]}>
                  <Text style={[styles.pickerItemText, y === year && styles.pickerItemTextSelected]}>
                    {y}
                  </Text>
                </View>
              ))}
              <View style={{ height: ITEM_HEIGHT }} />
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Age Display */}
      <View style={styles.ageDisplay}>
        <Text style={styles.ageText}>הגיל שלך {age} שנים</Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  subtitleText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'right',
    lineHeight: 24,
  },
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  pickerColumn: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 100,
  },
  pickerLabel: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.sm,
  },
  pickerWrapper: {
    width: '100%',
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
    fontSize: 18,
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
  ageDisplay: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  ageText: {
    fontSize: 20,
    fontWeight: typography.weight.semibold,
    color: 'rgba(255,255,255,0.7)',
  },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  warningText: {
    color: '#f87171',
    fontWeight: typography.weight.semibold,
    fontSize: typography.size.base,
    textAlign: 'right',
    lineHeight: 24,
  },
});
