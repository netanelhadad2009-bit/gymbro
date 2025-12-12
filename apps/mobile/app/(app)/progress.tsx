/**
 * Progress Screen - Premium Analytics Dashboard
 * Inspired by Strava, Nike Training Club, and Apple Fitness
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Path, Line, Rect, G, Text as SvgText } from 'react-native-svg';
import {
  AlertCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Minus,
  Flame,
  Scale,
  Target,
  Zap,
  Award,
  Calendar,
  ChevronRight,
  Pizza,
  Coffee,
  Dumbbell,
  Bike,
  Footprints,
  Settings,
  Cookie,
  Beef,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';
import { fetchProgress } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { ProgressRange, ProgressKPIs, WeightPoint, DailyNutrition } from '../../types/progress';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 4;
const CHART_HEIGHT = 140;
const EQUIVALENCES_STORAGE_KEY = '@gymbro/equivalences';

const RANGES: { value: ProgressRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '14d', label: '14D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

// Icon mapping
const ICON_MAP: { [key: string]: React.ComponentType<any> } = {
  Pizza,
  Cookie,
  Coffee,
  Beef,
  Footprints,
  Bike,
  Dumbbell,
};

// Types for equivalences
type FoodEquivalence = {
  id: string;
  name: string;
  calories: number;
  iconName: string;
  color: string;
  enabled: boolean;
};

type ExerciseEquivalence = {
  id: string;
  name: string;
  caloriesPerMin: number;
  iconName: string;
  color: string;
  enabled: boolean;
};

// Default equivalences
const DEFAULT_FOOD_EQUIVALENCES: FoodEquivalence[] = [
  { id: '1', name: 'Pizza slices', calories: 285, iconName: 'Pizza', color: colors.accent.orange, enabled: true },
  { id: '2', name: 'Cookies', calories: 150, iconName: 'Cookie', color: colors.accent.pink, enabled: true },
];

const DEFAULT_EXERCISE_EQUIVALENCES: ExerciseEquivalence[] = [
  { id: '1', name: 'Walking', caloriesPerMin: 5, iconName: 'Footprints', color: colors.accent.primary, enabled: true },
  { id: '2', name: 'Cycling', caloriesPerMin: 10, iconName: 'Bike', color: colors.accent.blue, enabled: true },
];

// Premium Progress Ring Component
function ProgressRing({
  progress,
  size = 140,
  strokeWidth = 12,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors.accent.primary} />
          <Stop offset="100%" stopColor={colors.accent.lime} />
        </SvgGradient>
      </Defs>
      {/* Background circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {/* Progress circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#ringGradient)"
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

// Line Chart Component for trends
function LineChart({
  data,
  labels,
  color = colors.accent.primary,
  height = CHART_HEIGHT,
  showArea = true,
  unit = '',
}: {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
  showArea?: boolean;
  unit?: string;
}) {
  if (!data.length || data.length < 2) return null;

  const width = CHART_WIDTH;
  const padding = { top: 20, right: 10, bottom: 30, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const max = Math.max(...data) * 1.1;
  const min = Math.min(...data) * 0.9;
  const range = max - min || 1;

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - ((val - min) / range) * chartHeight;

  // Create path
  const pathPoints = data.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`).join(' ');

  // Create area path
  const areaPath = `${pathPoints} L ${getX(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // Y-axis labels
  const yLabels = [min, (min + max) / 2, max].map(v => Math.round(v));

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id={`areaGradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </SvgGradient>
      </Defs>

      {/* Grid lines */}
      {yLabels.map((label, i) => (
        <G key={i}>
          <Line
            x1={padding.left}
            y1={getY(label)}
            x2={width - padding.right}
            y2={getY(label)}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={1}
          />
          <SvgText
            x={padding.left - 8}
            y={getY(label) + 4}
            fontSize={10}
            fill={colors.text.muted}
            textAnchor="end"
          >
            {label}{unit}
          </SvgText>
        </G>
      ))}

      {/* Area fill */}
      {showArea && (
        <Path
          d={areaPath}
          fill={`url(#areaGradient-${color})`}
        />
      )}

      {/* Line */}
      <Path
        d={pathPoints}
        stroke={color}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {data.map((val, i) => (
        <Circle
          key={i}
          cx={getX(i)}
          cy={getY(val)}
          r={i === data.length - 1 ? 6 : 4}
          fill={i === data.length - 1 ? color : colors.background.secondary}
          stroke={color}
          strokeWidth={2}
        />
      ))}

      {/* X-axis labels */}
      {labels && labels.map((label, i) => (
        <SvgText
          key={i}
          x={getX(i)}
          y={height - 8}
          fontSize={10}
          fill={colors.text.muted}
          textAnchor="middle"
        >
          {label}
        </SvgText>
      ))}
    </Svg>
  );
}

// Hero Summary Card
function HeroCard({
  kpis,
  targetCalories,
}: {
  kpis: ProgressKPIs;
  targetCalories: number;
}) {
  const todayCalories = kpis.today.calories || 0;
  const progress = Math.min((todayCalories / targetCalories) * 100, 100);
  const remaining = Math.max(targetCalories - todayCalories, 0);

  return (
    <LinearGradient
      colors={['rgba(226, 241, 99, 0.15)', 'rgba(163, 230, 53, 0.05)', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroContent}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroGreeting}>Today's Progress</Text>
          <Text style={styles.heroCalories}>{todayCalories.toLocaleString()}</Text>
          <Text style={styles.heroUnit}>calories consumed</Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{remaining.toLocaleString()}</Text>
              <Text style={styles.heroStatLabel}>remaining</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{targetCalories.toLocaleString()}</Text>
              <Text style={styles.heroStatLabel}>target</Text>
            </View>
          </View>
        </View>

        <View style={styles.heroRight}>
          <ProgressRing progress={progress} size={120} strokeWidth={10} />
          <View style={styles.heroRingCenter}>
            <Text style={styles.heroPercent}>{Math.round(progress)}%</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

// Calorie Equivalences Card
function CalorieEquivalencesCard({
  calories,
  onManage,
  foodEquivalences,
  exerciseEquivalences,
}: {
  calories: number;
  onManage: () => void;
  foodEquivalences: FoodEquivalence[];
  exerciseEquivalences: ExerciseEquivalence[];
}) {
  if (calories <= 0) return null;

  // Filter to enabled equivalences only and calculate
  const enabledFood = foodEquivalences.filter(f => f.enabled).slice(0, 2);
  const enabledExercise = exerciseEquivalences.filter(e => e.enabled).slice(0, 2);

  // Calculate equivalences
  const foodEquivs = enabledFood.map(food => ({
    ...food,
    count: (calories / food.calories).toFixed(1),
    icon: ICON_MAP[food.iconName] || Pizza,
  }));

  const exerciseEquivs = enabledExercise.map(ex => ({
    ...ex,
    duration: Math.round(calories / ex.caloriesPerMin),
    icon: ICON_MAP[ex.iconName] || Footprints,
  }));

  // If no equivalences are enabled, show a prompt to set them up
  if (foodEquivs.length === 0 && exerciseEquivs.length === 0) {
    return (
      <TouchableOpacity style={styles.equivalenceCard} onPress={onManage}>
        <View style={styles.equivalenceEmptyState}>
          <Settings size={32} color={colors.text.muted} />
          <Text style={styles.equivalenceEmptyTitle}>Set Up Equivalences</Text>
          <Text style={styles.equivalenceEmptyText}>
            Tap to customize how your calories are displayed
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.equivalenceCard}>
      <View style={styles.equivalenceHeader}>
        <View>
          <Text style={styles.equivalenceTitle}>What Your Calories Equal</Text>
          <Text style={styles.equivalenceSubtitle}>{calories.toLocaleString()} kcal today</Text>
        </View>
        <TouchableOpacity style={styles.equivalenceManageBtn} onPress={onManage}>
          <Settings size={18} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      {/* Food Equivalences */}
      {foodEquivs.length > 0 && (
        <View style={styles.equivalenceSection}>
          <Text style={styles.equivalenceSectionTitle}>In food terms...</Text>
          <View style={styles.equivalenceGrid}>
            {foodEquivs.map((food) => {
              const IconComponent = food.icon;
              return (
                <View key={food.id} style={styles.equivalenceItem}>
                  <View style={[styles.equivalenceIconBg, { backgroundColor: `${food.color}20` }]}>
                    <IconComponent size={24} color={food.color} />
                  </View>
                  <Text style={styles.equivalenceCount}>{food.count}</Text>
                  <Text style={styles.equivalenceLabel}>{food.name}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Divider - only show if both sections have items */}
      {foodEquivs.length > 0 && exerciseEquivs.length > 0 && (
        <View style={styles.equivalenceDivider}>
          <View style={styles.equivalenceDividerLine} />
          <Text style={styles.equivalenceDividerText}>OR</Text>
          <View style={styles.equivalenceDividerLine} />
        </View>
      )}

      {/* Exercise Equivalences */}
      {exerciseEquivs.length > 0 && (
        <View style={styles.equivalenceSection}>
          <Text style={styles.equivalenceSectionTitle}>To burn it off...</Text>
          <View style={styles.equivalenceGrid}>
            {exerciseEquivs.map((ex) => {
              const IconComponent = ex.icon;
              return (
                <View key={ex.id} style={styles.equivalenceItem}>
                  <View style={[styles.equivalenceIconBg, { backgroundColor: `${ex.color}20` }]}>
                    <IconComponent size={24} color={ex.color} />
                  </View>
                  <Text style={styles.equivalenceCount}>{ex.duration}</Text>
                  <Text style={styles.equivalenceLabel}>min {ex.name.toLowerCase()}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// Calorie Trend Chart Card
function CalorieTrendCard({ data, range }: { data: DailyNutrition[]; range: string }) {
  if (!data.length || data.length < 2) return null;

  const calories = data.map(d => d.calories);
  const labels = data.map((d, i) => {
    if (data.length <= 7) return new Date(d.d).toLocaleDateString('en', { weekday: 'short' }).charAt(0);
    if (i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) {
      return new Date(d.d).toLocaleDateString('en', { day: 'numeric' });
    }
    return '';
  });

  const avgCalories = Math.round(calories.reduce((a, b) => a + b, 0) / calories.length);
  const trend = calories.length >= 2 ?
    (calories[calories.length - 1] > calories[0] ? 'up' : calories[calories.length - 1] < calories[0] ? 'down' : 'stable') :
    'stable';

  return (
    <View style={styles.trendCard}>
      <View style={styles.trendHeader}>
        <View>
          <Text style={styles.trendTitle}>Calorie Trend</Text>
          <View style={styles.trendSubtitleRow}>
            <Text style={styles.trendAvg}>{avgCalories.toLocaleString()}</Text>
            <Text style={styles.trendAvgLabel}>avg/day</Text>
            {trend !== 'stable' && (
              <>
                {trend === 'up' ? (
                  <TrendingUp size={14} color={colors.semantic.warning} />
                ) : (
                  <TrendingDown size={14} color={colors.semantic.success} />
                )}
              </>
            )}
          </View>
        </View>
        <View style={styles.trendBadge}>
          <Flame size={14} color={colors.accent.orange} />
          <Text style={styles.trendBadgeText}>{range}</Text>
        </View>
      </View>
      <LineChart
        data={calories}
        labels={labels}
        color={colors.accent.orange}
        showArea={true}
      />
    </View>
  );
}

// Protein Trend Card
function ProteinTrendCard({ data }: { data: DailyNutrition[] }) {
  if (!data.length || data.length < 2) return null;

  const proteins = data.map(d => d.protein);
  const labels = data.map((d, i) => {
    if (data.length <= 7) return new Date(d.d).toLocaleDateString('en', { weekday: 'short' }).charAt(0);
    if (i === 0 || i === data.length - 1) {
      return new Date(d.d).toLocaleDateString('en', { day: 'numeric' });
    }
    return '';
  });

  const avgProtein = Math.round(proteins.reduce((a, b) => a + b, 0) / proteins.length);

  return (
    <View style={styles.trendCard}>
      <View style={styles.trendHeader}>
        <View>
          <Text style={styles.trendTitle}>Protein Intake</Text>
          <View style={styles.trendSubtitleRow}>
            <Text style={[styles.trendAvg, { color: colors.accent.pink }]}>{avgProtein}g</Text>
            <Text style={styles.trendAvgLabel}>avg/day</Text>
          </View>
        </View>
        <View style={[styles.trendBadge, { backgroundColor: `${colors.accent.pink}20` }]}>
          <Target size={14} color={colors.accent.pink} />
          <Text style={[styles.trendBadgeText, { color: colors.accent.pink }]}>Protein</Text>
        </View>
      </View>
      <LineChart
        data={proteins}
        labels={labels}
        color={colors.accent.pink}
        showArea={true}
        unit="g"
      />
    </View>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  subtitle,
  trend,
  delta,
  accentColor = colors.accent.primary,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable' | null;
  delta?: number | null;
  accentColor?: string;
}) {
  const getTrendIcon = () => {
    if (!trend) return null;
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'down' ? colors.semantic.success :
                       trend === 'up' ? colors.semantic.warning : colors.text.muted;
    return <TrendIcon size={14} color={trendColor} />;
  };

  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: `${accentColor}20` }]}>
        <Icon size={20} color={accentColor} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: accentColor }]}>{value}</Text>
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </View>
      {(subtitle || (delta !== null && delta !== undefined)) && (
        <View style={styles.statSubtitleRow}>
          {getTrendIcon()}
          <Text style={styles.statSubtitle}>
            {delta !== null && delta !== undefined
              ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`
              : subtitle}
          </Text>
        </View>
      )}
    </View>
  );
}

// Macros Overview Card
function MacrosCard({ data }: { data: DailyNutrition[] }) {
  if (!data.length) return null;

  const avgProtein = Math.round(data.reduce((a, b) => a + b.protein, 0) / data.length);
  const avgCarbs = Math.round(data.reduce((a, b) => a + b.carbs, 0) / data.length);
  const avgFat = Math.round(data.reduce((a, b) => a + b.fat, 0) / data.length);
  const total = avgProtein + avgCarbs + avgFat;

  const macros = [
    { label: 'Protein', value: avgProtein, color: colors.accent.pink, percent: total ? (avgProtein / total) * 100 : 0 },
    { label: 'Carbs', value: avgCarbs, color: colors.accent.orange, percent: total ? (avgCarbs / total) * 100 : 0 },
    { label: 'Fat', value: avgFat, color: colors.accent.blue, percent: total ? (avgFat / total) * 100 : 0 },
  ];

  return (
    <View style={styles.macrosCard}>
      <View style={styles.macrosHeader}>
        <Text style={styles.macrosTitle}>Macros Balance</Text>
        <Text style={styles.macrosSubtitle}>Daily average</Text>
      </View>

      {/* Stacked Progress Bar */}
      <View style={styles.macrosBar}>
        {macros.map((macro, index) => (
          <View
            key={macro.label}
            style={[
              styles.macrosBarSegment,
              {
                width: `${macro.percent}%`,
                backgroundColor: macro.color,
                borderTopLeftRadius: index === 0 ? 8 : 0,
                borderBottomLeftRadius: index === 0 ? 8 : 0,
                borderTopRightRadius: index === macros.length - 1 ? 8 : 0,
                borderBottomRightRadius: index === macros.length - 1 ? 8 : 0,
              },
            ]}
          />
        ))}
      </View>

      {/* Macro Values */}
      <View style={styles.macrosValues}>
        {macros.map((macro) => (
          <View key={macro.label} style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: macro.color }]} />
            <Text style={styles.macroLabel}>{macro.label}</Text>
            <Text style={[styles.macroValue, { color: macro.color }]}>{macro.value}g</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Weight Summary Card - Compact card that navigates to dedicated weight page
function WeightSummaryCard({
  kpis,
  weightCount,
  onPress,
}: {
  kpis: ProgressKPIs;
  weightCount: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.weightCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.weightHeader}>
        <View style={styles.weightHeaderLeft}>
          <View style={styles.weightIconContainer}>
            <Scale size={20} color={colors.accent.primary} />
          </View>
          <View>
            <Text style={styles.weightTitle}>Weight Journey</Text>
            <Text style={styles.weightSubtitle}>
              {weightCount > 0 ? `${weightCount} weigh-ins` : 'Start tracking'}
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.text.muted} />
      </View>

      <View style={styles.weightSummaryContent}>
        <View style={styles.weightSummaryMain}>
          <Text style={styles.weightSummaryValue}>
            {kpis.weight.current?.toFixed(1) || '--'}
          </Text>
          <Text style={styles.weightSummaryUnit}>kg</Text>
        </View>

        {kpis.weight.delta7d !== null && (
          <View style={styles.weightSummaryDelta}>
            {kpis.weight.trend === 'down' ? (
              <TrendingDown size={14} color={colors.semantic.success} />
            ) : kpis.weight.trend === 'up' ? (
              <TrendingUp size={14} color={colors.semantic.warning} />
            ) : (
              <Minus size={14} color={colors.text.muted} />
            )}
            <Text style={[
              styles.weightSummaryDeltaText,
              { color: kpis.weight.trend === 'down' ? colors.semantic.success :
                       kpis.weight.trend === 'up' ? colors.semantic.warning : colors.text.muted }
            ]}>
              {kpis.weight.delta7d > 0 ? '+' : ''}{kpis.weight.delta7d.toFixed(1)} kg this week
            </Text>
          </View>
        )}

        {weightCount === 0 && (
          <View style={styles.weightSummaryEmpty}>
            <Text style={styles.weightSummaryEmptyText}>Tap to log your first weigh-in</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Insight Card
function InsightCard({
  icon: Icon,
  title,
  message,
  type = 'info',
}: {
  icon: React.ComponentType<any>;
  title: string;
  message: string;
  type?: 'success' | 'warning' | 'info';
}) {
  const bgColor = type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
                  type === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                  'rgba(226, 241, 99, 0.1)';
  const accentColor = type === 'success' ? colors.semantic.success :
                      type === 'warning' ? colors.semantic.warning :
                      colors.accent.primary;

  return (
    <View style={[styles.insightCard, { backgroundColor: bgColor }]}>
      <View style={[styles.insightIcon, { backgroundColor: `${accentColor}20` }]}>
        <Icon size={20} color={accentColor} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightMessage}>{message}</Text>
      </View>
    </View>
  );
}

// Generate insights from KPIs
function generateInsights(kpis: ProgressKPIs, targetCalories: number) {
  const insights: Array<{ icon: React.ComponentType<any>; title: string; message: string; type: 'success' | 'warning' | 'info' }> = [];

  // Weight insight
  if (kpis.weight.trend === 'down' && kpis.weight.delta7d !== null) {
    insights.push({
      icon: Award,
      title: 'Great Progress!',
      message: `You've lost ${Math.abs(kpis.weight.delta7d).toFixed(1)} kg this week. Keep it up!`,
      type: 'success',
    });
  } else if (kpis.weight.trend === 'stable') {
    insights.push({
      icon: Target,
      title: 'Staying Consistent',
      message: 'Your weight is stable. Perfect for maintenance!',
      type: 'info',
    });
  }

  // Calories insight
  if (kpis.avg7d.calories !== null) {
    const diff = kpis.avg7d.calories - targetCalories;
    if (Math.abs(diff) <= 100) {
      insights.push({
        icon: Flame,
        title: 'On Target!',
        message: 'Your calorie intake is perfectly aligned with your goals.',
        type: 'success',
      });
    } else if (diff < -200) {
      insights.push({
        icon: Zap,
        title: 'Calorie Deficit',
        message: `You're ${Math.abs(Math.round(diff))} calories under target. Make sure you're eating enough.`,
        type: 'warning',
      });
    }
  }

  return insights.slice(0, 2);
}

export default function ProgressScreen() {
  const router = useRouter();
  const [range, setRange] = useState<ProgressRange>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<ProgressKPIs | null>(null);
  const [weightData, setWeightData] = useState<WeightPoint[]>([]);
  const [nutritionData, setNutritionData] = useState<DailyNutrition[]>([]);
  const [foodEquivalences, setFoodEquivalences] = useState<FoodEquivalence[]>(DEFAULT_FOOD_EQUIVALENCES);
  const [exerciseEquivalences, setExerciseEquivalences] = useState<ExerciseEquivalence[]>(DEFAULT_EXERCISE_EQUIVALENCES);
  const [targetCalories, setTargetCalories] = useState(2000);

  // Load equivalences from storage
  const loadEquivalences = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(EQUIVALENCES_STORAGE_KEY);
      if (saved) {
        const { food, exercise } = JSON.parse(saved);
        if (food) setFoodEquivalences(food);
        if (exercise) setExerciseEquivalences(exercise);
      }
    } catch (error) {
      console.error('Failed to load equivalences:', error);
    }
  }, []);

  // Load user's calorie target from profile
  const loadCalorieTarget = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('nutrition_plan')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.nutrition_plan?.dailyTargets?.calories) {
        setTargetCalories(profile.nutrition_plan.dailyTargets.calories);
      }
    } catch (error) {
      console.error('Failed to load calorie target:', error);
    }
  }, []);

  // Reload equivalences and calorie target when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadEquivalences();
      loadCalorieTarget();
    }, [loadEquivalences, loadCalorieTarget])
  );

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const response = await fetchProgress(range);
      if (response.ok) {
        setKpis(response.kpis);
        setWeightData(response.weight);
        setNutritionData(response.nutrition);
      } else {
        setError(response.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load progress data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  const handleManageEquivalences = () => {
    router.push('/equivalences');
  };

  const handleOpenWeight = () => {
    router.push('/weight');
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.semantic.error} />
          <Text style={styles.errorTitle}>Unable to Load Data</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
            <RefreshCw size={20} color={colors.background.primary} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const insights = kpis ? generateInsights(kpis, targetCalories) : [];
  const todayCalories = kpis?.today.calories || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Range Selector */}
        <View style={styles.rangeSelector}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[
                styles.rangeButton,
                range === r.value && styles.rangeButtonActive,
              ]}
              onPress={() => setRange(r.value)}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  range === r.value && styles.rangeButtonTextActive,
                ]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero Card */}
        {kpis && <HeroCard kpis={kpis} targetCalories={targetCalories} />}

        {/* Calorie Equivalences */}
        <CalorieEquivalencesCard
          calories={todayCalories}
          onManage={handleManageEquivalences}
          foodEquivalences={foodEquivalences}
          exerciseEquivalences={exerciseEquivalences}
        />

        {/* Calorie Trend Chart */}
        <CalorieTrendCard data={nutritionData} range={range} />

        {/* Stats Grid */}
        {kpis && (
          <View style={styles.statsGrid}>
            <StatCard
              icon={Flame}
              label="7-Day Avg"
              value={kpis.avg7d.calories?.toLocaleString() || '--'}
              unit="kcal"
              subtitle="daily calories"
              accentColor={colors.accent.orange}
            />
            <StatCard
              icon={Scale}
              label="Current"
              value={kpis.weight.current?.toFixed(1) || '--'}
              unit="kg"
              trend={kpis.weight.trend}
              delta={kpis.weight.delta7d}
              accentColor={colors.accent.primary}
            />
          </View>
        )}

        {/* Protein Trend Chart */}
        <ProteinTrendCard data={nutritionData} />

        {/* Weight Card */}
        {kpis && <WeightSummaryCard kpis={kpis} weightCount={weightData.length} onPress={handleOpenWeight} />}

        {/* Macros Card */}
        <MacrosCard data={nutritionData} />

        {/* Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Insights</Text>
            {insights.map((insight, index) => (
              <InsightCard key={index} {...insight} />
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    marginTop: spacing.md,
  },
  retryButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.background.primary,
  },

  // Range Selector
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeButtonActive: {
    backgroundColor: colors.accent.primary,
  },
  rangeButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  rangeButtonTextActive: {
    color: colors.background.primary,
  },

  // Hero Card
  heroCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(226, 241, 99, 0.2)',
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  heroCalories: {
    fontSize: 48,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    lineHeight: 52,
  },
  heroUnit: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginBottom: spacing.lg,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: {},
  heroStatValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  heroStatLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.primary,
    marginHorizontal: spacing.lg,
  },
  heroRight: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPercent: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
  },

  // Equivalence Card
  equivalenceCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  equivalenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  equivalenceTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  equivalenceSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginTop: 2,
  },
  equivalenceManageBtn: {
    padding: spacing.sm,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
  },
  equivalenceSection: {
    marginBottom: spacing.md,
  },
  equivalenceSectionTitle: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  equivalenceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  equivalenceItem: {
    alignItems: 'center',
    flex: 1,
  },
  equivalenceIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  equivalenceCount: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  equivalenceLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  equivalenceDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  equivalenceDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.primary,
  },
  equivalenceDividerText: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginHorizontal: spacing.md,
  },
  equivalenceEmptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  equivalenceEmptyTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  equivalenceEmptyText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Trend Card
  trendCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  trendTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  trendSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  trendAvg: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.accent.orange,
  },
  trendAvgLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.accent.orange}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  trendBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.accent.orange,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
  },
  statUnit: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  statSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statSubtitle: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },

  // Macros Card
  macrosCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  macrosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  macrosTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  macrosSubtitle: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  macrosBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  macrosBarSegment: {
    height: '100%',
  },
  macrosValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  macroValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },

  // Weight Summary Card
  weightCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${colors.accent.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  weightSubtitle: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  weightSummaryContent: {
    alignItems: 'center',
  },
  weightSummaryMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  weightSummaryValue: {
    fontSize: 48,
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
  },
  weightSummaryUnit: {
    fontSize: typography.size.lg,
    color: colors.text.secondary,
  },
  weightSummaryDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  weightSummaryDeltaText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  weightSummaryEmpty: {
    marginTop: spacing.sm,
  },
  weightSummaryEmptyText: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },

  // Insights Section
  insightsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  insightCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  insightMessage: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  bottomPadding: {
    height: 140, // Extra space to prevent tab bar from hiding content
  },
});
