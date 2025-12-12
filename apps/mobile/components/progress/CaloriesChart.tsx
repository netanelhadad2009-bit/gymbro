/**
 * Calories Chart component using react-native-chart-kit
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';
import type { DailyNutrition } from '../../types/progress';

const screenWidth = Dimensions.get('window').width;

interface CaloriesChartProps {
  data: DailyNutrition[];
  targetCalories?: number;
  height?: number;
}

export function CaloriesChart({ data, targetCalories = 2000, height = 220 }: CaloriesChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Daily Calories</Text>
        <View style={[styles.emptyContainer, { height }]}>
          <Text style={styles.emptyText}>No nutrition data yet</Text>
          <Text style={styles.emptySubtext}>Log meals to track your calories</Text>
        </View>
      </View>
    );
  }

  // Format dates for labels
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Get labels - show fewer labels if many data points
  const labelInterval = Math.ceil(data.length / 6);
  const labels = data.map((day, index) =>
    index % labelInterval === 0 ? formatDate(day.d) : ''
  );

  const calories = data.map(day => day.calories);
  const avgCalories = Math.round(calories.reduce((a, b) => a + b, 0) / calories.length);

  const chartData = {
    labels,
    datasets: [
      {
        data: calories,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.background.secondary,
    backgroundGradientFrom: colors.background.secondary,
    backgroundGradientTo: colors.background.secondary,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(226, 241, 99, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(165, 167, 170, ${opacity})`,
    style: {
      borderRadius: borderRadius.lg,
    },
    barPercentage: 0.6,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'rgba(255, 255, 255, 0.1)',
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Calories</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Avg</Text>
            <Text style={styles.statValue}>{avgCalories}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Target</Text>
            <Text style={[styles.statValue, { color: colors.text.secondary }]}>{targetCalories}</Text>
          </View>
        </View>
      </View>

      <BarChart
        data={chartData}
        width={screenWidth - spacing.lg * 2}
        height={height}
        chartConfig={chartConfig}
        style={styles.chart}
        withInnerLines={true}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        showBarTops={false}
        flatColor={true}
        fromZero={true}
        yAxisSuffix=""
        yAxisLabel=""
      />

      {/* Target line indicator */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent.primary }]} />
          <Text style={styles.legendText}>Daily intake</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.text.muted }]} />
          <Text style={styles.legendText}>Target: {targetCalories} kcal</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
  },
  chart: {
    marginLeft: -spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
});
