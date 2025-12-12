/**
 * Macros Stacked Bar Chart component
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { StackedBarChart } from 'react-native-chart-kit';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';
import type { DailyNutrition } from '../../types/progress';
import { chartColors } from '../../types/progress';

const screenWidth = Dimensions.get('window').width;

interface MacrosChartProps {
  data: DailyNutrition[];
  height?: number;
}

export function MacrosChart({ data, height = 220 }: MacrosChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Macros Breakdown</Text>
        <View style={[styles.emptyContainer, { height }]}>
          <Text style={styles.emptyText}>No nutrition data yet</Text>
          <Text style={styles.emptySubtext}>Log meals to track your macros</Text>
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

  // Calculate averages for display
  const avgProtein = Math.round(data.reduce((a, b) => a + b.protein, 0) / data.length);
  const avgCarbs = Math.round(data.reduce((a, b) => a + b.carbs, 0) / data.length);
  const avgFat = Math.round(data.reduce((a, b) => a + b.fat, 0) / data.length);

  // Prepare stacked data
  const chartData = {
    labels,
    legend: ['Protein', 'Carbs', 'Fat'],
    data: data.map(day => [day.protein, day.carbs, day.fat]),
    barColors: [chartColors.protein, chartColors.carbs, chartColors.fat],
  };

  const chartConfig = {
    backgroundColor: colors.background.secondary,
    backgroundGradientFrom: colors.background.secondary,
    backgroundGradientTo: colors.background.secondary,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(165, 167, 170, ${opacity})`,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'rgba(255, 255, 255, 0.1)',
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Macros Breakdown</Text>
        <Text style={styles.subtitle}>Daily average (g)</Text>
      </View>

      {/* Macro averages */}
      <View style={styles.macroAverages}>
        <View style={styles.macroItem}>
          <View style={[styles.macroDot, { backgroundColor: chartColors.protein }]} />
          <Text style={styles.macroLabel}>Protein</Text>
          <Text style={[styles.macroValue, { color: chartColors.protein }]}>{avgProtein}g</Text>
        </View>
        <View style={styles.macroItem}>
          <View style={[styles.macroDot, { backgroundColor: chartColors.carbs }]} />
          <Text style={styles.macroLabel}>Carbs</Text>
          <Text style={[styles.macroValue, { color: chartColors.carbs }]}>{avgCarbs}g</Text>
        </View>
        <View style={styles.macroItem}>
          <View style={[styles.macroDot, { backgroundColor: chartColors.fat }]} />
          <Text style={styles.macroLabel}>Fat</Text>
          <Text style={[styles.macroValue, { color: chartColors.fat }]}>{avgFat}g</Text>
        </View>
      </View>

      <StackedBarChart
        data={chartData}
        width={screenWidth - spacing.lg * 2}
        height={height}
        chartConfig={chartConfig}
        style={styles.chart}
        withHorizontalLabels={true}
        withVerticalLabels={true}
        hideLegend={true}
      />
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
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },
  macroAverages: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.lg,
  },
  macroItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  macroLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  macroValue: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
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
});
