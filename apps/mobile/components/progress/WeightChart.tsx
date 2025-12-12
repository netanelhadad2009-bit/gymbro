/**
 * Weight Chart component using react-native-chart-kit
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';
import type { WeightPoint } from '../../types/progress';

const screenWidth = Dimensions.get('window').width;

interface WeightChartProps {
  data: WeightPoint[];
  height?: number;
}

export function WeightChart({ data, height = 220 }: WeightChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Weight Progress</Text>
        <View style={[styles.emptyContainer, { height }]}>
          <Text style={styles.emptyText}>No weight data yet</Text>
          <Text style={styles.emptySubtext}>Log your first weigh-in to see progress</Text>
        </View>
      </View>
    );
  }

  // Format dates for labels (show only every few labels to avoid crowding)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Get labels - show fewer labels if many data points
  const labelInterval = Math.ceil(data.length / 6);
  const labels = data.map((point, index) =>
    index % labelInterval === 0 ? formatDate(point.t) : ''
  );

  const weights = data.map(point => point.kg);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = maxWeight - minWeight;

  // Calculate Y-axis bounds with some padding
  const yAxisMin = Math.floor(minWeight - (range * 0.1 || 1));
  const yAxisMax = Math.ceil(maxWeight + (range * 0.1 || 1));

  const chartData = {
    labels,
    datasets: [
      {
        data: weights,
        color: (opacity = 1) => `rgba(226, 241, 99, ${opacity})`, // accent color
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.background.secondary,
    backgroundGradientFrom: colors.background.secondary,
    backgroundGradientTo: colors.background.secondary,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(226, 241, 99, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(165, 167, 170, ${opacity})`,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.accent.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'rgba(255, 255, 255, 0.1)',
    },
    fillShadowGradient: colors.accent.primary,
    fillShadowGradientOpacity: 0.2,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weight Progress</Text>
        <Text style={styles.subtitle}>
          {weights[weights.length - 1]?.toFixed(1)} kg
        </Text>
      </View>

      <LineChart
        data={chartData}
        width={screenWidth - spacing.lg * 2}
        height={height}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        fromZero={false}
        yAxisSuffix=" kg"
        segments={4}
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
    fontSize: typography.size.lg,
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
});
