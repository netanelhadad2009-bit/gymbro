/**
 * Pre-made Stage Templates for Each Avatar Type
 *
 * Each avatar gets a specific set of stages based on:
 * - Goal: loss, gain, recomp, maintain
 * - Experience: beginner, intermediate, advanced
 *
 * Templates are copied (not generated) during plan creation
 *
 * IMPORTANT: All tasks must use ONLY implemented condition types:
 * - FIRST_WEIGH_IN
 * - LOG_MEALS_TODAY
 * - HIT_PROTEIN_GOAL
 * - STREAK_DAYS
 * - WEEKLY_DEFICIT
 * - WEEKLY_SURPLUS
 * - WEEKLY_BALANCED
 * - TOTAL_MEALS_LOGGED
 * - TOTAL_WEIGH_INS
 */

import { BuiltStage } from './builder';

/**
 * Template Key Format: {goal}_{experience}
 * Examples: loss_beginner, gain_advanced, recomp_intermediate
 */
export type TemplateKey =
  | 'loss_beginner' | 'loss_intermediate' | 'loss_advanced'
  | 'gain_beginner' | 'gain_intermediate' | 'gain_advanced'
  | 'recomp_beginner' | 'recomp_intermediate' | 'recomp_advanced'
  | 'maintain_beginner' | 'maintain_intermediate' | 'maintain_advanced';

/**
 * Avatar profile for template selection
 */
export interface AvatarTemplateProfile {
  goal: 'loss' | 'gain' | 'recomp' | 'maintain';
  experience: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Stage Templates Database
 */
export const STAGE_TEMPLATES: Record<TemplateKey, BuiltStage[]> = {
  // ==========================================
  // WEIGHT LOSS - BEGINNER
  // ==========================================
  loss_beginner: [
    {
      code: 'FOUNDATION',
      title_he: 'Foundations',
      subtitle_he: 'Getting Started Right',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'LOG_FIRST_MEAL',
          title_he: 'Log Your First Meal',
          desc_he: 'Start tracking what you eat',
          points: 10,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 1,
          },
        },
        {
          key_code: 'LOG_3_MEALS_TODAY',
          title_he: 'Log 3 Meals Today',
          desc_he: 'Build a consistent logging habit',
          points: 20,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'FIRST_WEIGH_IN',
          title_he: 'Weigh In for the First Time',
          desc_he: 'Important starting point for tracking',
          points: 15,
          condition_json: {
            type: 'FIRST_WEIGH_IN',
          },
        },
      ],
    },
    {
      code: 'MOMENTUM',
      title_he: 'Momentum',
      subtitle_he: 'Building Habits',
      color_hex: '#4CAF50',
      tasks: [
        {
          key_code: 'LOG_3_DAYS_STREAK',
          title_he: 'Log Meals for 3 Days Straight',
          desc_he: 'Consistency is key',
          points: 30,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 3,
          },
        },
        {
          key_code: 'DEFICIT_1_WEEK',
          title_he: 'Maintain Calorie Deficit for a Week',
          desc_he: 'Eat according to your daily calorie target',
          points: 40,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_5_WEIGH_INS',
          title_he: 'Log 5 Weigh-Ins',
          desc_he: 'Track your progress',
          points: 20,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 5,
          },
        },
      ],
    },
    {
      code: 'CONSISTENCY',
      title_he: 'Consistency',
      subtitle_he: 'Making It a Habit',
      color_hex: '#2196F3',
      tasks: [
        {
          key_code: 'LOG_7_DAYS_STREAK',
          title_he: 'Log Meals for a Full Week',
          desc_he: 'Perfect week!',
          points: 50,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 7,
          },
        },
        {
          key_code: 'DEFICIT_2_WEEKS',
          title_he: 'Calorie Deficit for 2 Weeks Straight',
          desc_he: 'Consistency is the key to success',
          points: 60,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
            lookback_days: 14,
          },
        },
        {
          key_code: 'TOTAL_50_MEALS',
          title_he: 'Log 50 Meals',
          desc_he: 'The habit is getting stronger!',
          points: 40,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 50,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Preserve muscle mass',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_DEFICIT',
          title_he: 'Maintain Calorie Deficit',
          desc_he: 'Keep burning fat',
          points: 10,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],

  // ==========================================
  // WEIGHT LOSS - INTERMEDIATE
  // ==========================================
  loss_intermediate: [
    {
      code: 'FOUNDATION',
      title_he: 'Advanced Foundations',
      subtitle_he: 'Refining Nutrition',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'PROTEIN_GOAL_3_DAYS',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Protein preserves muscle mass',
          points: 25,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_14_DAYS_STREAK',
          title_he: 'Log Meals for 2 Weeks Straight',
          desc_he: 'Iron discipline',
          points: 40,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 14,
          },
        },
        {
          key_code: 'LOG_10_WEIGH_INS',
          title_he: 'Log 10 Weigh-Ins',
          desc_he: 'Consistent body tracking',
          points: 30,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 10,
          },
        },
      ],
    },
    {
      code: 'OPTIMIZATION',
      title_he: 'Optimization',
      subtitle_he: 'Performance Improvement',
      color_hex: '#FF9800',
      tasks: [
        {
          key_code: 'HIGHER_DEFICIT_WEEK',
          title_he: 'Maintain Daily Calorie Deficit',
          desc_he: 'Eat according to your daily calorie target',
          points: 50,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_STREAK_7_DAYS',
          title_he: 'Meet Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 45,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'TOTAL_100_MEALS',
          title_he: 'Log 100 Meals',
          desc_he: 'Pro nutrition tracker!',
          points: 40,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 100,
          },
        },
      ],
    },
    {
      code: 'MASTERY',
      title_he: 'Control',
      subtitle_he: 'Eat According to Your Daily Calorie Target',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'LOG_30_DAYS_STREAK',
          title_he: 'Log Meals for a Full Month',
          desc_he: 'Amazing dedication!',
          points: 100,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 30,
          },
        },
        {
          key_code: 'AGGRESSIVE_DEFICIT_2_WEEKS',
          title_he: 'Calorie Deficit for 2 Weeks Straight',
          desc_he: 'Eat according to your daily calorie target',
          points: 80,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
            lookback_days: 14,
          },
        },
        {
          key_code: 'LOG_20_WEIGH_INS',
          title_he: 'Log 20 Weigh-Ins',
          desc_he: 'Professional weight tracking',
          points: 60,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 20,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Preserve muscle mass',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_DEFICIT',
          title_he: 'Maintain Calorie Deficit',
          desc_he: 'Keep burning fat',
          points: 10,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],

  // ==========================================
  // WEIGHT LOSS - ADVANCED
  // ==========================================
  loss_advanced: [
    {
      code: 'PRECISION',
      title_he: 'Precision',
      subtitle_he: 'Full Control',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'PROTEIN_HIGH_150G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 40,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'HUGE_DEFICIT_WEEK',
          title_he: 'Maintain Daily Calorie Deficit',
          desc_he: 'Eat according to your daily calorie target',
          points: 60,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_60_DAYS_STREAK',
          title_he: 'Log Meals for 2 Months Straight',
          desc_he: 'Uncompromising commitment',
          points: 150,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 60,
          },
        },
      ],
    },
    {
      code: 'EXCELLENCE',
      title_he: 'Excellence',
      subtitle_he: 'Professional Level',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'TOTAL_200_MEALS',
          title_he: 'Log 200 Meals',
          desc_he: 'True professional',
          points: 80,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 200,
          },
        },
        {
          key_code: 'LOG_30_WEIGH_INS',
          title_he: 'Log 30 Weigh-Ins',
          desc_he: 'Continuous tracking',
          points: 70,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 30,
          },
        },
        {
          key_code: 'EXTREME_DEFICIT_MONTH',
          title_he: 'Calorie Deficit for a Full Month',
          desc_he: 'Eat according to your daily calorie target',
          points: 120,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
            lookback_days: 30,
          },
        },
      ],
    },
    {
      code: 'LEGENDARY',
      title_he: 'Legendary',
      subtitle_he: 'Championship Level',
      color_hex: '#FF6B6B',
      tasks: [
        {
          key_code: 'LOG_90_DAYS_STREAK',
          title_he: 'Log Meals for 3 Months Straight',
          desc_he: 'Legendary achievement!',
          points: 200,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 90,
          },
        },
        {
          key_code: 'TOTAL_500_MEALS',
          title_he: 'Log 500 Meals',
          desc_he: 'Master of nutrition tracking',
          points: 150,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 500,
          },
        },
        {
          key_code: 'PROTEIN_ULTRA_180G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 100,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Preserve muscle mass',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_DEFICIT',
          title_he: 'Maintain Calorie Deficit',
          desc_he: 'Keep burning fat',
          points: 10,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],

  // ==========================================
  // MUSCLE GAIN - BEGINNER
  // ==========================================
  gain_beginner: [
    {
      code: 'FOUNDATION',
      title_he: 'Foundations',
      subtitle_he: 'Building the Foundation',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'LOG_FIRST_MEAL',
          title_he: 'Log Your First Meal',
          desc_he: 'Start tracking nutrition',
          points: 10,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 1,
          },
        },
        {
          key_code: 'EAT_SURPLUS_DAY',
          title_he: 'Eat in Calorie Surplus for One Day',
          desc_he: 'Surplus required for building muscle',
          points: 20,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
            lookback_days: 1,
          },
        },
        {
          key_code: 'FIRST_WEIGH_IN',
          title_he: 'Weigh In for the First Time',
          desc_he: 'Track your progress',
          points: 15,
          condition_json: {
            type: 'FIRST_WEIGH_IN',
          },
        },
      ],
    },
    {
      code: 'GROWTH',
      title_he: 'Growth',
      subtitle_he: 'Building Mass',
      color_hex: '#4CAF50',
      tasks: [
        {
          key_code: 'SURPLUS_WEEK',
          title_he: 'Calorie Surplus for a Full Week',
          desc_he: 'Grow consistently',
          points: 40,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_GAIN_120G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 30,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_7_DAYS_STREAK',
          title_he: 'Log meals for a week straight',
          desc_he: 'Consistent tracking',
          points: 35,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 7,
          },
        },
      ],
    },
    {
      code: 'MOMENTUM',
      title_he: 'Momentum',
      subtitle_he: 'Continued Growth',
      color_hex: '#2196F3',
      tasks: [
        {
          key_code: 'SURPLUS_2_WEEKS',
          title_he: 'Calorie Surplus for 2 Weeks Straight',
          desc_he: 'Successful bulk',
          points: 60,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
            lookback_days: 14,
          },
        },
        {
          key_code: 'TOTAL_50_MEALS',
          title_he: 'Log 50 Meals',
          desc_he: 'Good tracking = good results',
          points: 40,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 50,
          },
        },
        {
          key_code: 'LOG_10_WEIGH_INS',
          title_he: 'Log 10 Weigh-Ins',
          desc_he: 'Track weight gain',
          points: 30,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 10,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Keep building muscle',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_SURPLUS',
          title_he: 'Maintain Calorie Surplus',
          desc_he: 'Keep growing',
          points: 10,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],

  // ==========================================
  // MUSCLE GAIN - INTERMEDIATE
  // ==========================================
  gain_intermediate: [
    {
      code: 'OPTIMIZATION',
      title_he: 'Optimization',
      subtitle_he: 'Smart Bulk',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'SURPLUS_CONTROLLED_WEEK',
          title_he: 'Maintain Daily Calorie Surplus',
          desc_he: 'Eat according to your daily calorie target',
          points: 35,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_GAIN_150G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 40,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_14_DAYS_STREAK',
          title_he: 'Log Meals for 2 Weeks Straight',
          desc_he: 'Tracking discipline',
          points: 45,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 14,
          },
        },
      ],
    },
    {
      code: 'MASS_BUILDING',
      title_he: 'Building Mass',
      subtitle_he: 'Grow Rapidly',
      color_hex: '#FF9800',
      tasks: [
        {
          key_code: 'SURPLUS_AGGRESSIVE_WEEK',
          title_he: 'Maintain Daily Calorie Surplus',
          desc_he: 'Eat according to your daily calorie target',
          points: 50,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
          },
        },
        {
          key_code: 'TOTAL_100_MEALS',
          title_he: 'Log 100 Meals',
          desc_he: 'Professional tracking',
          points: 50,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 100,
          },
        },
        {
          key_code: 'LOG_30_DAYS_STREAK',
          title_he: 'Log Meals for a Full Month',
          desc_he: 'Amazing persistence',
          points: 80,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 30,
          },
        },
      ],
    },
    {
      code: 'CONSISTENCY',
      title_he: 'Consistency',
      subtitle_he: 'Long-Term Results',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'SURPLUS_MONTH',
          title_he: 'Maintain Calorie Surplus for a Month',
          desc_he: 'Eat according to your daily calorie target',
          points: 100,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
            lookback_days: 30,
          },
        },
        {
          key_code: 'LOG_20_WEIGH_INS',
          title_he: 'Log 20 Weigh-Ins',
          desc_he: 'Careful weight tracking',
          points: 60,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 20,
          },
        },
        {
          key_code: 'PROTEIN_ULTRA_170G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 70,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Keep building muscle',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_SURPLUS',
          title_he: 'Maintain Calorie Surplus',
          desc_he: 'Keep growing',
          points: 10,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],

  // ==========================================
  // MUSCLE GAIN - ADVANCED
  // ==========================================
  gain_advanced: [
    {
      code: 'PRECISION_BULK',
      title_he: 'Precise Bulk',
      subtitle_he: 'Lean Bulking',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'LEAN_SURPLUS_WEEK',
          title_he: 'Maintain Small Calorie Surplus',
          desc_he: 'Eat according to your daily calorie target',
          points: 40,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_MASSIVE_180G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 50,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_60_DAYS_STREAK',
          title_he: 'Log Meals for 2 Months Straight',
          desc_he: 'Full commitment',
          points: 120,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 60,
          },
        },
      ],
    },
    {
      code: 'EXCELLENCE',
      title_he: 'Excellence',
      subtitle_he: 'Professional Level',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'TOTAL_200_MEALS',
          title_he: 'Log 200 Meals',
          desc_he: 'High-level tracking',
          points: 80,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 200,
          },
        },
        {
          key_code: 'LOG_30_WEIGH_INS',
          title_he: 'Log 30 Weigh-Ins',
          desc_he: 'Continuous tracking',
          points: 70,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 30,
          },
        },
        {
          key_code: 'CONTROLLED_SURPLUS_2_MONTHS',
          title_he: 'Calorie Surplus for 2 Months Straight',
          desc_he: 'Eat according to your daily calorie target',
          points: 150,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
            lookback_days: 60,
          },
        },
      ],
    },
    {
      code: 'LEGENDARY',
      title_he: 'Legendary',
      subtitle_he: 'Championship Level',
      color_hex: '#FF6B6B',
      tasks: [
        {
          key_code: 'LOG_90_DAYS_STREAK',
          title_he: 'Log Meals for 3 Months Straight',
          desc_he: 'Legendary!',
          points: 200,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 90,
          },
        },
        {
          key_code: 'TOTAL_500_MEALS',
          title_he: 'Log 500 Meals',
          desc_he: 'Nutrition master',
          points: 150,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 500,
          },
        },
        {
          key_code: 'PROTEIN_BEAST_200G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 100,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Keep building muscle',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_SURPLUS',
          title_he: 'Maintain Calorie Surplus',
          desc_he: 'Keep growing',
          points: 10,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],

  // ==========================================
  // RECOMP - BEGINNER
  // ==========================================
  recomp_beginner: [
    {
      code: 'FOUNDATION',
      title_he: 'Foundations',
      subtitle_he: 'Balance and Body Composition',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'LOG_FIRST_MEAL',
          title_he: 'Log Your First Meal',
          desc_he: 'Start tracking',
          points: 10,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 1,
          },
        },
        {
          key_code: 'MAINTENANCE_DAY',
          title_he: 'Eat at Maintenance for One Day',
          desc_he: 'Maintain calorie balance',
          points: 20,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true, // ±100 kcal
            lookback_days: 1,
          },
        },
        {
          key_code: 'FIRST_WEIGH_IN',
          title_he: 'Weigh In for the First Time',
          desc_he: 'Baseline for tracking',
          points: 15,
          condition_json: {
            type: 'FIRST_WEIGH_IN',
          },
        },
      ],
    },
    {
      code: 'BALANCE',
      title_he: 'Balance',
      subtitle_he: 'Maintaining Balance',
      color_hex: '#4CAF50',
      tasks: [
        {
          key_code: 'MAINTENANCE_WEEK',
          title_he: 'Maintain Maintenance Calories for a Week',
          desc_he: 'No surplus, no deficit',
          points: 35,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_RECOMP_140G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'High protein for recomp',
          points: 30,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_7_DAYS_STREAK',
          title_he: 'Log meals for a week straight',
          desc_he: 'Consistent tracking',
          points: 35,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 7,
          },
        },
      ],
    },
    {
      code: 'RECOMPOSITION',
      title_he: 'Recomposition',
      subtitle_he: 'Changing Body Composition',
      color_hex: '#2196F3',
      tasks: [
        {
          key_code: 'MAINTENANCE_2_WEEKS',
          title_he: 'Maintenance for 2 Weeks Straight',
          desc_he: 'Successful body recomposition',
          points: 60,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 14,
          },
        },
        {
          key_code: 'TOTAL_50_MEALS',
          title_he: 'Log 50 Meals',
          desc_he: 'Professional tracking',
          points: 40,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 50,
          },
        },
        {
          key_code: 'LOG_10_WEIGH_INS',
          title_he: 'Log 10 Weigh-Ins',
          desc_he: 'Track stability',
          points: 30,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 10,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Maintain body composition',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'Maintain Maintenance Calories',
          desc_he: 'Continue the recomp',
          points: 10,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],

  // ==========================================
  // RECOMP - INTERMEDIATE
  // ==========================================
  recomp_intermediate: [
    {
      code: 'PRECISION',
      title_he: 'Precision',
      subtitle_he: 'Controlling the Balance',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'TIGHT_MAINTENANCE_WEEK',
          title_he: 'Maintain Maintenance Calories for a Week',
          desc_he: 'Stay within ±100 calories',
          points: 40,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_HIGH_160G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 40,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_14_DAYS_STREAK',
          title_he: 'Log Meals for 2 Weeks Straight',
          desc_he: 'Careful tracking',
          points: 45,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 14,
          },
        },
      ],
    },
    {
      code: 'OPTIMIZATION',
      title_he: 'Optimization',
      subtitle_he: 'Advanced Body Composition',
      color_hex: '#FF9800',
      tasks: [
        {
          key_code: 'MAINTENANCE_MONTH',
          title_he: 'Maintenance for a Full Month',
          desc_he: 'Long-term recomp',
          points: 80,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 30,
          },
        },
        {
          key_code: 'TOTAL_100_MEALS',
          title_he: 'Log 100 Meals',
          desc_he: 'High-level tracking',
          points: 50,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 100,
          },
        },
        {
          key_code: 'LOG_30_DAYS_STREAK',
          title_he: 'Log Meals for a Full Month',
          desc_he: 'Amazing persistence',
          points: 80,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 30,
          },
        },
      ],
    },
    {
      code: 'MASTERY',
      title_he: 'Control',
      subtitle_he: 'Perfect Recomp',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'MAINTENANCE_2_MONTHS',
          title_he: 'Maintenance for 2 Months Straight',
          desc_he: 'Significant body composition change',
          points: 120,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 60,
          },
        },
        {
          key_code: 'LOG_20_WEIGH_INS',
          title_he: 'Log 20 Weigh-Ins',
          desc_he: 'Continuous tracking',
          points: 60,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 20,
          },
        },
        {
          key_code: 'PROTEIN_ULTRA_180G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 70,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Maintain body composition',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'Maintain Maintenance Calories',
          desc_he: 'Continue the recomp',
          points: 10,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],

  // ==========================================
  // RECOMP - ADVANCED
  // ==========================================
  recomp_advanced: [
    {
      code: 'ELITE_PRECISION',
      title_he: 'Elite Precision',
      subtitle_he: 'Eat According to Your Daily Calorie Target',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'ULTRA_TIGHT_MAINTENANCE',
          title_he: 'Maintain Maintenance Calories',
          desc_he: 'Eat according to your daily calorie target',
          points: 60,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_ELITE_190G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 70,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_60_DAYS_STREAK',
          title_he: 'Log Meals for 2 Months Straight',
          desc_he: 'Full commitment',
          points: 120,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 60,
          },
        },
      ],
    },
    {
      code: 'EXCELLENCE',
      title_he: 'Excellence',
      subtitle_he: 'Professional Level',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'TOTAL_200_MEALS',
          title_he: 'Log 200 Meals',
          desc_he: 'Pro tracker',
          points: 80,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 200,
          },
        },
        {
          key_code: 'LOG_30_WEIGH_INS',
          title_he: 'Log 30 Weigh-Ins',
          desc_he: 'Continuous tracking',
          points: 70,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 30,
          },
        },
        {
          key_code: 'MAINTENANCE_3_MONTHS',
          title_he: 'Maintenance for 3 Months Straight',
          desc_he: 'Long-term recomp',
          points: 180,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 90,
          },
        },
      ],
    },
    {
      code: 'LEGENDARY',
      title_he: 'Legendary',
      subtitle_he: 'Championship Level',
      color_hex: '#FF6B6B',
      tasks: [
        {
          key_code: 'LOG_90_DAYS_STREAK',
          title_he: 'Log Meals for 3 Months Straight',
          desc_he: 'Legendary achievement!',
          points: 200,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 90,
          },
        },
        {
          key_code: 'TOTAL_500_MEALS',
          title_he: 'Log 500 Meals',
          desc_he: 'Nutrition master',
          points: 150,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 500,
          },
        },
        {
          key_code: 'PROTEIN_CHAMPION_200G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 100,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Maintain body composition',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'Maintain Maintenance Calories',
          desc_he: 'Continue the recomp',
          points: 10,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],

  // ==========================================
  // MAINTAIN - BEGINNER
  // ==========================================
  maintain_beginner: [
    {
      code: 'FOUNDATION',
      title_he: 'Foundations',
      subtitle_he: 'Maintaining Stability',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'LOG_FIRST_MEAL',
          title_he: 'Log Your First Meal',
          desc_he: 'Start tracking',
          points: 10,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 1,
          },
        },
        {
          key_code: 'MAINTENANCE_DAY',
          title_he: 'Eat at Maintenance for One Day',
          desc_he: 'Maintain stable weight',
          points: 15,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 1,
          },
        },
        {
          key_code: 'FIRST_WEIGH_IN',
          title_he: 'Weigh In for the First Time',
          desc_he: 'Baseline for tracking',
          points: 15,
          condition_json: {
            type: 'FIRST_WEIGH_IN',
          },
        },
      ],
    },
    {
      code: 'STABILITY',
      title_he: 'Stability',
      subtitle_he: 'Maintaining Balance',
      color_hex: '#4CAF50',
      tasks: [
        {
          key_code: 'MAINTENANCE_WEEK',
          title_he: 'Maintenance for a Full Week',
          desc_he: 'Stable weight',
          points: 30,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_5_DAYS_STREAK',
          title_he: 'Log Meals for 5 Days Straight',
          desc_he: 'Regular tracking',
          points: 25,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 5,
          },
        },
        {
          key_code: 'LOG_5_WEIGH_INS',
          title_he: 'Log 5 Weigh-Ins',
          desc_he: 'Track stability',
          points: 20,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 5,
          },
        },
      ],
    },
    {
      code: 'CONSISTENCY',
      title_he: 'Consistency',
      subtitle_he: 'Long-Term Maintenance',
      color_hex: '#2196F3',
      tasks: [
        {
          key_code: 'MAINTENANCE_2_WEEKS',
          title_he: 'Maintenance for 2 Weeks Straight',
          desc_he: 'Successfully maintaining weight',
          points: 50,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 14,
          },
        },
        {
          key_code: 'TOTAL_30_MEALS',
          title_he: 'Log 30 Meals',
          desc_he: 'Good tracking',
          points: 30,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 30,
          },
        },
        {
          key_code: 'LOG_10_DAYS_STREAK',
          title_he: 'Log Meals for 10 Days Straight',
          desc_he: 'Nice persistence',
          points: 40,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 10,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Preserve muscle mass',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'Maintain Maintenance Calories',
          desc_he: 'Maintain weight',
          points: 10,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],

  // ==========================================
  // MAINTAIN - INTERMEDIATE
  // ==========================================
  maintain_intermediate: [
    {
      code: 'PRECISION',
      title_he: 'Precision',
      subtitle_he: 'Precise Maintenance',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'TIGHT_MAINTENANCE_WEEK',
          title_he: 'Maintain Maintenance Calories',
          desc_he: 'Control weight',
          points: 35,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_MAINTAIN_120G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Protein to preserve muscle',
          points: 30,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_14_DAYS_STREAK',
          title_he: 'Log Meals for 2 Weeks Straight',
          desc_he: 'Consistent tracking',
          points: 40,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 14,
          },
        },
      ],
    },
    {
      code: 'MASTERY',
      title_he: 'Control',
      subtitle_he: 'Long-Term Maintenance',
      color_hex: '#FF9800',
      tasks: [
        {
          key_code: 'MAINTENANCE_MONTH',
          title_he: 'Maintenance for a Full Month',
          desc_he: 'Amazing stability',
          points: 70,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 30,
          },
        },
        {
          key_code: 'TOTAL_100_MEALS',
          title_he: 'Log 100 Meals',
          desc_he: 'Professional tracking',
          points: 50,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 100,
          },
        },
        {
          key_code: 'LOG_15_WEIGH_INS',
          title_he: 'Log 15 Weigh-Ins',
          desc_he: 'Continuous tracking',
          points: 40,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 15,
          },
        },
      ],
    },
    {
      code: 'EXCELLENCE',
      title_he: 'Excellence',
      subtitle_he: 'Perfect Maintenance',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'MAINTENANCE_2_MONTHS',
          title_he: 'Maintenance for 2 Months Straight',
          desc_he: 'Perfect weight control',
          points: 100,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 60,
          },
        },
        {
          key_code: 'LOG_30_DAYS_STREAK',
          title_he: 'Log Meals for a Full Month',
          desc_he: 'High commitment',
          points: 70,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 30,
          },
        },
        {
          key_code: 'PROTEIN_HIGH_150G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'High protein',
          points: 50,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Preserve muscle mass',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'Maintain Maintenance Calories',
          desc_he: 'Maintain weight',
          points: 10,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],

  // ==========================================
  // MAINTAIN - ADVANCED
  // ==========================================
  maintain_advanced: [
    {
      code: 'ELITE_CONTROL',
      title_he: 'Elite Control',
      subtitle_he: 'Eat According to Your Daily Calorie Target',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'ULTRA_TIGHT_MAINTENANCE',
          title_he: 'Maintain Maintenance Calories',
          desc_he: 'Eat according to your daily calorie target',
          points: 50,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_ELITE_160G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 50,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_60_DAYS_STREAK',
          title_he: 'Log Meals for 2 Months Straight',
          desc_he: 'Exceptional commitment',
          points: 100,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 60,
          },
        },
      ],
    },
    {
      code: 'PERFECTION',
      title_he: 'Perfection',
      subtitle_he: 'Perfect Maintenance',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'TOTAL_200_MEALS',
          title_he: 'Log 200 Meals',
          desc_he: 'High-level tracking',
          points: 80,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 200,
          },
        },
        {
          key_code: 'LOG_25_WEIGH_INS',
          title_he: 'Log 25 Weigh-Ins',
          desc_he: 'Continuous tracking',
          points: 60,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 25,
          },
        },
        {
          key_code: 'MAINTENANCE_3_MONTHS',
          title_he: 'Maintenance for 3 Months Straight',
          desc_he: 'Amazing long-term maintenance',
          points: 150,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 90,
          },
        },
      ],
    },
    {
      code: 'LEGENDARY',
      title_he: 'Legendary',
      subtitle_he: 'Championship Level',
      color_hex: '#FF6B6B',
      tasks: [
        {
          key_code: 'LOG_90_DAYS_STREAK',
          title_he: 'Log Meals for 3 Months Straight',
          desc_he: 'Legendary achievement!',
          points: 200,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 90,
          },
        },
        {
          key_code: 'TOTAL_500_MEALS',
          title_he: 'Log 500 Meals',
          desc_he: 'Tracking master',
          points: 150,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 500,
          },
        },
        {
          key_code: 'PROTEIN_CHAMPION_180G',
          title_he: 'Hit Your Daily Protein Goal',
          desc_he: 'Stay on target',
          points: 100,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
      ],
    },
    {
      code: 'MAINTENANCE',
      title_he: 'Daily Maintenance',
      subtitle_he: 'Maintain Your Results',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'Log Your Meals Today',
          desc_he: 'Consistent daily tracking',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'Hit Your Protein Goal',
          desc_he: 'Preserve muscle mass',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'Maintain Maintenance Calories',
          desc_he: 'Maintain weight',
          points: 10,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 1,
          },
        },
      ],
    },
  ],
};

/**
 * Get the stage template for a given avatar profile
 */
export function getStageTemplate(profile: AvatarTemplateProfile): BuiltStage[] {
  const key: TemplateKey = `${profile.goal}_${profile.experience}`;

  if (!(key in STAGE_TEMPLATES)) {
    console.warn(`[StageTemplates] Unknown template key: ${key}, using loss_beginner as fallback`);
    return STAGE_TEMPLATES.loss_beginner;
  }

  return STAGE_TEMPLATES[key];
}
