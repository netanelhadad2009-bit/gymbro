/**
 * KPI Card component for displaying key metrics
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';

type KpiCardVariant = 'default' | 'success' | 'warning' | 'danger';

interface KpiCardProps {
  label: string;
  value: string | number | null;
  subtitle?: string;
  delta?: number | null;
  trend?: 'up' | 'down' | 'stable' | null;
  variant?: KpiCardVariant;
  unit?: string;
}

export function KpiCard({
  label,
  value,
  subtitle,
  delta,
  trend,
  variant = 'default',
  unit,
}: KpiCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;

    const iconSize = 16;
    const iconColor = trend === 'up'
      ? colors.semantic.success
      : trend === 'down'
        ? colors.semantic.error
        : colors.text.muted;

    switch (trend) {
      case 'up':
        return <TrendingUp size={iconSize} color={iconColor} />;
      case 'down':
        return <TrendingDown size={iconSize} color={iconColor} />;
      case 'stable':
        return <Minus size={iconSize} color={iconColor} />;
      default:
        return null;
    }
  };

  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return colors.semantic.success;
      case 'warning':
        return colors.semantic.warning;
      case 'danger':
        return colors.semantic.error;
      default:
        return colors.accent.primary;
    }
  };

  const formatDelta = (val: number) => {
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: getVariantColor() }]}>
          {value !== null && value !== undefined ? value : '--'}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>

      <View style={styles.bottomRow}>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}

        {delta !== null && delta !== undefined && (
          <View style={styles.deltaContainer}>
            {getTrendIcon()}
            <Text style={[
              styles.delta,
              { color: trend === 'up'
                ? colors.semantic.success
                : trend === 'down'
                  ? colors.semantic.error
                  : colors.text.muted
              }
            ]}>
              {formatDelta(delta)} kg
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    minHeight: 100,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  value: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.accent.primary,
  },
  unit: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  bottomRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
  },
  deltaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  delta: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
});
