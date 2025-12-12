/**
 * Insights component - generates contextual insights based on user's progress data
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lightbulb, TrendingUp, TrendingDown, Target, Flame, Beef } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius } from '../../lib/theme';
import type { ProgressKPIs } from '../../types/progress';

interface InsightsProps {
  kpis: ProgressKPIs;
  targetCalories?: number;
}

interface Insight {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral' | 'info';
}

export function Insights({ kpis, targetCalories = 2000 }: InsightsProps) {
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];
    const iconSize = 20;

    // Weight trend insight
    if (kpis.weight.trend) {
      if (kpis.weight.trend === 'down' && kpis.weight.delta7d !== null) {
        insights.push({
          icon: <TrendingDown size={iconSize} color={colors.semantic.success} />,
          title: 'Weight Progress',
          description: `You're down ${Math.abs(kpis.weight.delta7d).toFixed(1)} kg in the last 7 days. Keep up the great work!`,
          type: 'positive',
        });
      } else if (kpis.weight.trend === 'up' && kpis.weight.delta7d !== null) {
        insights.push({
          icon: <TrendingUp size={iconSize} color={colors.semantic.warning} />,
          title: 'Weight Change',
          description: `You've gained ${kpis.weight.delta7d.toFixed(1)} kg in the last 7 days. Review your calorie intake.`,
          type: 'negative',
        });
      } else if (kpis.weight.trend === 'stable') {
        insights.push({
          icon: <Target size={iconSize} color={colors.accent.primary} />,
          title: 'Weight Stable',
          description: 'Your weight has been consistent. Great job maintaining!',
          type: 'neutral',
        });
      }
    }

    // Calorie intake insight
    if (kpis.avg7d.calories !== null) {
      const avgCalories = kpis.avg7d.calories;
      const diff = avgCalories - targetCalories;
      const diffPercent = Math.abs((diff / targetCalories) * 100);

      if (diff < -200) {
        insights.push({
          icon: <Flame size={iconSize} color={colors.semantic.warning} />,
          title: 'Calorie Deficit',
          description: `You're averaging ${Math.abs(Math.round(diff))} calories under your target. Make sure you're eating enough to fuel your goals.`,
          type: 'neutral',
        });
      } else if (diff > 200) {
        insights.push({
          icon: <Flame size={iconSize} color={colors.semantic.error} />,
          title: 'Calorie Surplus',
          description: `You're averaging ${Math.round(diff)} calories over your target. Consider adjusting portion sizes.`,
          type: 'negative',
        });
      } else {
        insights.push({
          icon: <Target size={iconSize} color={colors.semantic.success} />,
          title: 'On Target',
          description: 'Your calorie intake is right on track with your goals!',
          type: 'positive',
        });
      }
    }

    // Protein insight
    if (kpis.avg7d.protein !== null) {
      const avgProtein = kpis.avg7d.protein;
      // Rough protein target: 1.6g per kg for active people, estimate 70kg average
      const proteinTarget = 112; // ~1.6g * 70kg

      if (avgProtein >= proteinTarget) {
        insights.push({
          icon: <Beef size={iconSize} color={colors.semantic.success} />,
          title: 'Protein Intake',
          description: `Great job! You're hitting ${Math.round(avgProtein)}g of protein daily, supporting muscle maintenance.`,
          type: 'positive',
        });
      } else if (avgProtein < proteinTarget * 0.7) {
        insights.push({
          icon: <Beef size={iconSize} color={colors.semantic.warning} />,
          title: 'Low Protein',
          description: `Consider increasing protein intake. You're averaging ${Math.round(avgProtein)}g daily.`,
          type: 'neutral',
        });
      }
    }

    // Consistency insight
    if (kpis.today.calories !== null && kpis.avg7d.calories !== null) {
      const todayVsAvg = kpis.today.calories - kpis.avg7d.calories;

      if (Math.abs(todayVsAvg) > 500) {
        insights.push({
          icon: <Lightbulb size={iconSize} color={colors.accent.primary} />,
          title: 'Today\'s Intake',
          description: todayVsAvg > 0
            ? `Today you've eaten ${Math.round(todayVsAvg)} more calories than your weekly average.`
            : `Today you've eaten ${Math.abs(Math.round(todayVsAvg))} fewer calories than your weekly average.`,
          type: 'info',
        });
      }
    }

    // If no insights generated, add a default one
    if (insights.length === 0) {
      insights.push({
        icon: <Lightbulb size={iconSize} color={colors.accent.primary} />,
        title: 'Getting Started',
        description: 'Keep logging your meals and weight to unlock personalized insights!',
        type: 'info',
      });
    }

    return insights.slice(0, 3); // Max 3 insights
  };

  const insights = generateInsights();

  const getTypeColor = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return colors.semantic.success;
      case 'negative':
        return colors.semantic.error;
      case 'neutral':
        return colors.semantic.warning;
      default:
        return colors.accent.primary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Lightbulb size={20} color={colors.accent.primary} />
        <Text style={styles.title}>Insights</Text>
      </View>

      <View style={styles.insightsList}>
        {insights.map((insight, index) => (
          <View
            key={index}
            style={[
              styles.insightCard,
              { borderLeftColor: getTypeColor(insight.type) }
            ]}
          >
            <View style={styles.insightIcon}>{insight.icon}</View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightDescription}>{insight.description}</Text>
            </View>
          </View>
        ))}
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
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  insightsList: {
    gap: spacing.md,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
  },
  insightIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  insightDescription: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
