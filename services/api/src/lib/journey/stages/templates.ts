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
      title_he: 'יסודות',
      subtitle_he: 'התחלה נכונה',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'LOG_FIRST_MEAL',
          title_he: 'רשום ארוחה ראשונה',
          desc_he: 'התחל לעקוב אחר מה שאתה אוכל',
          points: 10,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 1,
          },
        },
        {
          key_code: 'LOG_3_MEALS_TODAY',
          title_he: 'רשום 3 ארוחות היום',
          desc_he: 'בנה הרגל של רישום עקבי',
          points: 20,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'FIRST_WEIGH_IN',
          title_he: 'שקול משקל פעם ראשונה',
          desc_he: 'נקודת התחלה חשובה למעקב',
          points: 15,
          condition_json: {
            type: 'FIRST_WEIGH_IN',
          },
        },
      ],
    },
    {
      code: 'MOMENTUM',
      title_he: 'מומנטום',
      subtitle_he: 'בניית הרגלים',
      color_hex: '#4CAF50',
      tasks: [
        {
          key_code: 'LOG_3_DAYS_STREAK',
          title_he: 'רשום ארוחות 3 ימים רצופים',
          desc_he: 'התמדה היא המפתח',
          points: 30,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 3,
          },
        },
        {
          key_code: 'DEFICIT_1_WEEK',
          title_he: 'שמור על גירעון קלורי שבוע',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
          points: 40,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_5_WEIGH_INS',
          title_he: 'רשום 5 שקילות',
          desc_he: 'עקוב אחר ההתקדמות שלך',
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
      title_he: 'עקביות',
      subtitle_he: 'הפיכה להרגל',
      color_hex: '#2196F3',
      tasks: [
        {
          key_code: 'LOG_7_DAYS_STREAK',
          title_he: 'רשום ארוחות שבוע שלם',
          desc_he: 'שבוע מושלם!',
          points: 50,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 7,
          },
        },
        {
          key_code: 'DEFICIT_2_WEEKS',
          title_he: 'גירעון קלורי שבועיים רצופים',
          desc_he: 'עקביות היא המפתח להצלחה',
          points: 60,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
            lookback_days: 14,
          },
        },
        {
          key_code: 'TOTAL_50_MEALS',
          title_he: 'רשום 50 ארוחות',
          desc_he: 'ההרגל מתחזק!',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על מסת השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_DEFICIT',
          title_he: 'שמור על גירעון קלורי',
          desc_he: 'המשך לשרוף שומן',
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
      title_he: 'יסודות מתקדמים',
      subtitle_he: 'עיבוד התזונה',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'PROTEIN_GOAL_3_DAYS',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'חלבון שומר על מסת השריר',
          points: 25,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_14_DAYS_STREAK',
          title_he: 'רשום ארוחות שבועיים רצופים',
          desc_he: 'משמעת ברזל',
          points: 40,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 14,
          },
        },
        {
          key_code: 'LOG_10_WEIGH_INS',
          title_he: 'רשום 10 שקילות',
          desc_he: 'מעקב קבוע אחר הגוף',
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
      title_he: 'אופטימיזציה',
      subtitle_he: 'שיפור ביצועים',
      color_hex: '#FF9800',
      tasks: [
        {
          key_code: 'HIGHER_DEFICIT_WEEK',
          title_he: 'שמור על גירעון קלורי יומי',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
          points: 50,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_STREAK_7_DAYS',
          title_he: 'עמוד ביעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
          points: 45,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'TOTAL_100_MEALS',
          title_he: 'רשום 100 ארוחות',
          desc_he: 'מקצוען במעקב תזונתי!',
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
      title_he: 'שליטה',
      subtitle_he: 'אכול לפי יעד הקלוריות היומי שלך',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'LOG_30_DAYS_STREAK',
          title_he: 'רשום ארוחות חודש שלם',
          desc_he: 'מסירות מדהימה!',
          points: 100,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 30,
          },
        },
        {
          key_code: 'AGGRESSIVE_DEFICIT_2_WEEKS',
          title_he: 'גירעון קלורי שבועיים רצופים',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
          points: 80,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
            lookback_days: 14,
          },
        },
        {
          key_code: 'LOG_20_WEIGH_INS',
          title_he: 'רשום 20 שקילות',
          desc_he: 'מעקב מקצועי אחר המשקל',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על מסת השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_DEFICIT',
          title_he: 'שמור על גירעון קלורי',
          desc_he: 'המשך לשרוף שומן',
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
      title_he: 'דיוק',
      subtitle_he: 'שליטה מלאה',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'PROTEIN_HIGH_150G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
          points: 40,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'HUGE_DEFICIT_WEEK',
          title_he: 'שמור על גירעון קלורי יומי',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
          points: 60,
          condition_json: {
            type: 'WEEKLY_DEFICIT',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_60_DAYS_STREAK',
          title_he: 'רשום ארוחות חודשיים רצופים',
          desc_he: 'מחויבות ללא פשרות',
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
      title_he: 'מצוינות',
      subtitle_he: 'רמה מקצועית',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'TOTAL_200_MEALS',
          title_he: 'רשום 200 ארוחות',
          desc_he: 'מקצוען אמיתי',
          points: 80,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 200,
          },
        },
        {
          key_code: 'LOG_30_WEIGH_INS',
          title_he: 'רשום 30 שקילות',
          desc_he: 'מעקב מתמיד',
          points: 70,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 30,
          },
        },
        {
          key_code: 'EXTREME_DEFICIT_MONTH',
          title_he: 'גירעון קלורי חודש שלם',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
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
      title_he: 'אגדי',
      subtitle_he: 'רמת אליפות',
      color_hex: '#FF6B6B',
      tasks: [
        {
          key_code: 'LOG_90_DAYS_STREAK',
          title_he: 'רשום ארוחות 3 חודשים רצופים',
          desc_he: 'הישג אגדי!',
          points: 200,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 90,
          },
        },
        {
          key_code: 'TOTAL_500_MEALS',
          title_he: 'רשום 500 ארוחות',
          desc_he: 'מאסטר המעקב התזונתי',
          points: 150,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 500,
          },
        },
        {
          key_code: 'PROTEIN_ULTRA_180G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על מסת השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_DEFICIT',
          title_he: 'שמור על גירעון קלורי',
          desc_he: 'המשך לשרוף שומן',
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
      title_he: 'יסודות',
      subtitle_he: 'בניית הבסיס',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'LOG_FIRST_MEAL',
          title_he: 'רשום ארוחה ראשונה',
          desc_he: 'התחל לעקוב אחר התזונה',
          points: 10,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 1,
          },
        },
        {
          key_code: 'EAT_SURPLUS_DAY',
          title_he: 'אכול בעודף קלורי יום אחד',
          desc_he: 'עודף נדרש לבניית שריר',
          points: 20,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
            lookback_days: 1,
          },
        },
        {
          key_code: 'FIRST_WEIGH_IN',
          title_he: 'שקול משקל פעם ראשונה',
          desc_he: 'עקוב אחר ההתקדמות',
          points: 15,
          condition_json: {
            type: 'FIRST_WEIGH_IN',
          },
        },
      ],
    },
    {
      code: 'GROWTH',
      title_he: 'צמיחה',
      subtitle_he: 'בניית מסה',
      color_hex: '#4CAF50',
      tasks: [
        {
          key_code: 'SURPLUS_WEEK',
          title_he: 'עודף קלורי שבוע שלם',
          desc_he: 'גדל באופן עקבי',
          points: 40,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_GAIN_120G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
          points: 30,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_7_DAYS_STREAK',
          title_he: 'רשום ארוחות שבוע רצוף',
          desc_he: 'מעקב עקבי',
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
      title_he: 'מומנטום',
      subtitle_he: 'המשך הצמיחה',
      color_hex: '#2196F3',
      tasks: [
        {
          key_code: 'SURPLUS_2_WEEKS',
          title_he: 'עודף קלורי שבועיים רצופים',
          desc_he: 'בלק מוצלח',
          points: 60,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
            lookback_days: 14,
          },
        },
        {
          key_code: 'TOTAL_50_MEALS',
          title_he: 'רשום 50 ארוחות',
          desc_he: 'מעקב טוב = תוצאות טובות',
          points: 40,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 50,
          },
        },
        {
          key_code: 'LOG_10_WEIGH_INS',
          title_he: 'רשום 10 שקילות',
          desc_he: 'עקוב אחר העלייה במשקל',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על בניית השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_SURPLUS',
          title_he: 'שמור על עודף קלורי',
          desc_he: 'המשך לגדול',
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
      title_he: 'אופטימיזציה',
      subtitle_he: 'בלק חכם',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'SURPLUS_CONTROLLED_WEEK',
          title_he: 'שמור על עודף קלורי יומי',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
          points: 35,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_GAIN_150G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
          points: 40,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_14_DAYS_STREAK',
          title_he: 'רשום ארוחות שבועיים רצופים',
          desc_he: 'משמעת במעקב',
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
      title_he: 'בניית מסה',
      subtitle_he: 'גדל במהירות',
      color_hex: '#FF9800',
      tasks: [
        {
          key_code: 'SURPLUS_AGGRESSIVE_WEEK',
          title_he: 'שמור על עודף קלורי יומי',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
          points: 50,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
          },
        },
        {
          key_code: 'TOTAL_100_MEALS',
          title_he: 'רשום 100 ארוחות',
          desc_he: 'מעקב מקצועי',
          points: 50,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 100,
          },
        },
        {
          key_code: 'LOG_30_DAYS_STREAK',
          title_he: 'רשום ארוחות חודש שלם',
          desc_he: 'התמדה מדהימה',
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
      title_he: 'עקביות',
      subtitle_he: 'תוצאות ארוכות טווח',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'SURPLUS_MONTH',
          title_he: 'שמור על עודף קלורי חודש',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
          points: 100,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
            lookback_days: 30,
          },
        },
        {
          key_code: 'LOG_20_WEIGH_INS',
          title_he: 'רשום 20 שקילות',
          desc_he: 'מעקב קפדני אחר המשקל',
          points: 60,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 20,
          },
        },
        {
          key_code: 'PROTEIN_ULTRA_170G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על בניית השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_SURPLUS',
          title_he: 'שמור על עודף קלורי',
          desc_he: 'המשך לגדול',
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
      title_he: 'בלק מדויק',
      subtitle_he: 'ליין בלקינג',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'LEAN_SURPLUS_WEEK',
          title_he: 'שמור על עודף קלורי קטן',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
          points: 40,
          condition_json: {
            type: 'WEEKLY_SURPLUS',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_MASSIVE_180G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
          points: 50,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_60_DAYS_STREAK',
          title_he: 'רשום ארוחות חודשיים רצופים',
          desc_he: 'מחויבות מלאה',
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
      title_he: 'מצוינות',
      subtitle_he: 'רמה מקצועית',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'TOTAL_200_MEALS',
          title_he: 'רשום 200 ארוחות',
          desc_he: 'מעקב ברמה גבוהה',
          points: 80,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 200,
          },
        },
        {
          key_code: 'LOG_30_WEIGH_INS',
          title_he: 'רשום 30 שקילות',
          desc_he: 'מעקב מתמשך',
          points: 70,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 30,
          },
        },
        {
          key_code: 'CONTROLLED_SURPLUS_2_MONTHS',
          title_he: 'עודף קלורי חודשיים רצופים',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
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
      title_he: 'אגדי',
      subtitle_he: 'רמת אליפות',
      color_hex: '#FF6B6B',
      tasks: [
        {
          key_code: 'LOG_90_DAYS_STREAK',
          title_he: 'רשום ארוחות 3 חודשים רצופים',
          desc_he: 'אגדי!',
          points: 200,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 90,
          },
        },
        {
          key_code: 'TOTAL_500_MEALS',
          title_he: 'רשום 500 ארוחות',
          desc_he: 'מאסטר התזונה',
          points: 150,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 500,
          },
        },
        {
          key_code: 'PROTEIN_BEAST_200G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על בניית השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_SURPLUS',
          title_he: 'שמור על עודף קלורי',
          desc_he: 'המשך לגדול',
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
      title_he: 'יסודות',
      subtitle_he: 'איזון והרכב גוף',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'LOG_FIRST_MEAL',
          title_he: 'רשום ארוחה ראשונה',
          desc_he: 'התחל במעקב',
          points: 10,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 1,
          },
        },
        {
          key_code: 'MAINTENANCE_DAY',
          title_he: 'אכול בתחזוקה יום אחד',
          desc_he: 'שמור על מאזן קלורי',
          points: 20,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true, // ±100 kcal
            lookback_days: 1,
          },
        },
        {
          key_code: 'FIRST_WEIGH_IN',
          title_he: 'שקול משקל פעם ראשונה',
          desc_he: 'בסיס למעקב',
          points: 15,
          condition_json: {
            type: 'FIRST_WEIGH_IN',
          },
        },
      ],
    },
    {
      code: 'BALANCE',
      title_he: 'איזון',
      subtitle_he: 'שמירה על מאזן',
      color_hex: '#4CAF50',
      tasks: [
        {
          key_code: 'MAINTENANCE_WEEK',
          title_he: 'שמור על תחזוקה שבוע',
          desc_he: 'לא עודף ולא גירעון',
          points: 35,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_RECOMP_140G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'חלבון גבוה לריקומפ',
          points: 30,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_7_DAYS_STREAK',
          title_he: 'רשום ארוחות שבוע רצוף',
          desc_he: 'מעקב עקבי',
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
      title_he: 'ריקומפוזיציה',
      subtitle_he: 'שינוי הרכב הגוף',
      color_hex: '#2196F3',
      tasks: [
        {
          key_code: 'MAINTENANCE_2_WEEKS',
          title_he: 'תחזוקה שבועיים רצופים',
          desc_he: 'שינוי הרכב גוף בהצלחה',
          points: 60,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 14,
          },
        },
        {
          key_code: 'TOTAL_50_MEALS',
          title_he: 'רשום 50 ארוחות',
          desc_he: 'מעקב מקצועי',
          points: 40,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 50,
          },
        },
        {
          key_code: 'LOG_10_WEIGH_INS',
          title_he: 'רשום 10 שקילות',
          desc_he: 'עקוב אחר היציבות',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על הרכב הגוף',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'שמור על תחזוקת קלוריות',
          desc_he: 'המשך את הריקומפ',
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
      title_he: 'דיוק',
      subtitle_he: 'שליטה במאזן',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'TIGHT_MAINTENANCE_WEEK',
          title_he: 'שמור על תחזוקת קלוריות שבוע',
          desc_he: 'שמור על ±100 קלוריות',
          points: 40,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_HIGH_160G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
          points: 40,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_14_DAYS_STREAK',
          title_he: 'רשום ארוחות שבועיים רצופים',
          desc_he: 'מעקב קפדני',
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
      title_he: 'אופטימיזציה',
      subtitle_he: 'שינוי הרכב מתקדם',
      color_hex: '#FF9800',
      tasks: [
        {
          key_code: 'MAINTENANCE_MONTH',
          title_he: 'תחזוקה חודש שלם',
          desc_he: 'ריקומפ ארוך טווח',
          points: 80,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 30,
          },
        },
        {
          key_code: 'TOTAL_100_MEALS',
          title_he: 'רשום 100 ארוחות',
          desc_he: 'מעקב ברמה גבוהה',
          points: 50,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 100,
          },
        },
        {
          key_code: 'LOG_30_DAYS_STREAK',
          title_he: 'רשום ארוחות חודש שלם',
          desc_he: 'התמדה מדהימה',
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
      title_he: 'שליטה',
      subtitle_he: 'ריקומפ מושלם',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'MAINTENANCE_2_MONTHS',
          title_he: 'תחזוקה חודשיים רצופים',
          desc_he: 'שינוי הרכב גוף משמעותי',
          points: 120,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 60,
          },
        },
        {
          key_code: 'LOG_20_WEIGH_INS',
          title_he: 'רשום 20 שקילות',
          desc_he: 'מעקב מתמיד',
          points: 60,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 20,
          },
        },
        {
          key_code: 'PROTEIN_ULTRA_180G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על הרכב הגוף',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'שמור על תחזוקת קלוריות',
          desc_he: 'המשך את הריקומפ',
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
      title_he: 'דיוק עילית',
      subtitle_he: 'אכול לפי יעד הקלוריות היומי שלך',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'ULTRA_TIGHT_MAINTENANCE',
          title_he: 'שמור על תחזוקת קלוריות',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
          points: 60,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_ELITE_190G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
          points: 70,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_60_DAYS_STREAK',
          title_he: 'רשום ארוחות חודשיים רצופים',
          desc_he: 'מחויבות מלאה',
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
      title_he: 'מצוינות',
      subtitle_he: 'רמה מקצועית',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'TOTAL_200_MEALS',
          title_he: 'רשום 200 ארוחות',
          desc_he: 'מקצוען במעקב',
          points: 80,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 200,
          },
        },
        {
          key_code: 'LOG_30_WEIGH_INS',
          title_he: 'רשום 30 שקילות',
          desc_he: 'מעקב מתמשך',
          points: 70,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 30,
          },
        },
        {
          key_code: 'MAINTENANCE_3_MONTHS',
          title_he: 'תחזוקה 3 חודשים רצופים',
          desc_he: 'ריקומפ ארוך טווח',
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
      title_he: 'אגדי',
      subtitle_he: 'רמת אליפות',
      color_hex: '#FF6B6B',
      tasks: [
        {
          key_code: 'LOG_90_DAYS_STREAK',
          title_he: 'רשום ארוחות 3 חודשים רצופים',
          desc_he: 'הישג אגדי!',
          points: 200,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 90,
          },
        },
        {
          key_code: 'TOTAL_500_MEALS',
          title_he: 'רשום 500 ארוחות',
          desc_he: 'מאסטר התזונה',
          points: 150,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 500,
          },
        },
        {
          key_code: 'PROTEIN_CHAMPION_200G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על הרכב הגוף',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'שמור על תחזוקת קלוריות',
          desc_he: 'המשך את הריקומפ',
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
      title_he: 'יסודות',
      subtitle_he: 'שמירה על היציבות',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'LOG_FIRST_MEAL',
          title_he: 'רשום ארוחה ראשונה',
          desc_he: 'התחל במעקב',
          points: 10,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 1,
          },
        },
        {
          key_code: 'MAINTENANCE_DAY',
          title_he: 'אכול בתחזוקה יום אחד',
          desc_he: 'שמור על משקל יציב',
          points: 15,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 1,
          },
        },
        {
          key_code: 'FIRST_WEIGH_IN',
          title_he: 'שקול משקל פעם ראשונה',
          desc_he: 'בסיס למעקב',
          points: 15,
          condition_json: {
            type: 'FIRST_WEIGH_IN',
          },
        },
      ],
    },
    {
      code: 'STABILITY',
      title_he: 'יציבות',
      subtitle_he: 'שמירה על מאזן',
      color_hex: '#4CAF50',
      tasks: [
        {
          key_code: 'MAINTENANCE_WEEK',
          title_he: 'תחזוקה שבוע שלם',
          desc_he: 'משקל יציב',
          points: 30,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_5_DAYS_STREAK',
          title_he: 'רשום ארוחות 5 ימים רצופים',
          desc_he: 'מעקב קבוע',
          points: 25,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 5,
          },
        },
        {
          key_code: 'LOG_5_WEIGH_INS',
          title_he: 'רשום 5 שקילות',
          desc_he: 'עקוב אחר היציבות',
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
      title_he: 'עקביות',
      subtitle_he: 'שמירה לטווח ארוך',
      color_hex: '#2196F3',
      tasks: [
        {
          key_code: 'MAINTENANCE_2_WEEKS',
          title_he: 'תחזוקה שבועיים רצופים',
          desc_he: 'שמירה מוצלחת על המשקל',
          points: 50,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 14,
          },
        },
        {
          key_code: 'TOTAL_30_MEALS',
          title_he: 'רשום 30 ארוחות',
          desc_he: 'מעקב טוב',
          points: 30,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 30,
          },
        },
        {
          key_code: 'LOG_10_DAYS_STREAK',
          title_he: 'רשום ארוחות 10 ימים רצופים',
          desc_he: 'התמדה יפה',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על מסת השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'שמור על תחזוקת קלוריות',
          desc_he: 'שמור על המשקל',
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
      title_he: 'דיוק',
      subtitle_he: 'שמירה מדויקת',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'TIGHT_MAINTENANCE_WEEK',
          title_he: 'שמור על תחזוקת קלוריות',
          desc_he: 'שליטה במשקל',
          points: 35,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_MAINTAIN_120G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'חלבון לשמירה על שריר',
          points: 30,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_14_DAYS_STREAK',
          title_he: 'רשום ארוחות שבועיים רצופים',
          desc_he: 'מעקב עקבי',
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
      title_he: 'שליטה',
      subtitle_he: 'תחזוקה ארוכת טווח',
      color_hex: '#FF9800',
      tasks: [
        {
          key_code: 'MAINTENANCE_MONTH',
          title_he: 'תחזוקה חודש שלם',
          desc_he: 'יציבות מדהימה',
          points: 70,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 30,
          },
        },
        {
          key_code: 'TOTAL_100_MEALS',
          title_he: 'רשום 100 ארוחות',
          desc_he: 'מעקב מקצועי',
          points: 50,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 100,
          },
        },
        {
          key_code: 'LOG_15_WEIGH_INS',
          title_he: 'רשום 15 שקילות',
          desc_he: 'מעקב מתמיד',
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
      title_he: 'מצוינות',
      subtitle_he: 'שמירה מושלמת',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'MAINTENANCE_2_MONTHS',
          title_he: 'תחזוקה חודשיים רצופים',
          desc_he: 'שליטה מושלמת במשקל',
          points: 100,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
            lookback_days: 60,
          },
        },
        {
          key_code: 'LOG_30_DAYS_STREAK',
          title_he: 'רשום ארוחות חודש שלם',
          desc_he: 'מחויבות גבוהה',
          points: 70,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 30,
          },
        },
        {
          key_code: 'PROTEIN_HIGH_150G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'חלבון גבוה',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על מסת השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'שמור על תחזוקת קלוריות',
          desc_he: 'שמור על המשקל',
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
      title_he: 'שליטה עילית',
      subtitle_he: 'אכול לפי יעד הקלוריות היומי שלך',
      color_hex: '#E2F163',
      tasks: [
        {
          key_code: 'ULTRA_TIGHT_MAINTENANCE',
          title_he: 'שמור על תחזוקת קלוריות',
          desc_he: 'אכול לפי יעד הקלוריות היומי שלך',
          points: 50,
          condition_json: {
            type: 'WEEKLY_BALANCED',
            use_user_target: true,
          },
        },
        {
          key_code: 'PROTEIN_ELITE_160G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
          points: 50,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'LOG_60_DAYS_STREAK',
          title_he: 'רשום ארוחות חודשיים רצופים',
          desc_he: 'מחויבות יוצאת דופן',
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
      title_he: 'שלמות',
      subtitle_he: 'תחזוקה מושלמת',
      color_hex: '#9C27B0',
      tasks: [
        {
          key_code: 'TOTAL_200_MEALS',
          title_he: 'רשום 200 ארוחות',
          desc_he: 'מעקב ברמה גבוהה',
          points: 80,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 200,
          },
        },
        {
          key_code: 'LOG_25_WEIGH_INS',
          title_he: 'רשום 25 שקילות',
          desc_he: 'מעקב מתמשך',
          points: 60,
          condition_json: {
            type: 'TOTAL_WEIGH_INS',
            target: 25,
          },
        },
        {
          key_code: 'MAINTENANCE_3_MONTHS',
          title_he: 'תחזוקה 3 חודשים רצופים',
          desc_he: 'שמירה ארוכת טווח מדהימה',
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
      title_he: 'אגדי',
      subtitle_he: 'רמת אליפות',
      color_hex: '#FF6B6B',
      tasks: [
        {
          key_code: 'LOG_90_DAYS_STREAK',
          title_he: 'רשום ארוחות 3 חודשים רצופים',
          desc_he: 'הישג אגדי!',
          points: 200,
          condition_json: {
            type: 'STREAK_DAYS',
            target: 90,
          },
        },
        {
          key_code: 'TOTAL_500_MEALS',
          title_he: 'רשום 500 ארוחות',
          desc_he: 'מאסטר המעקב',
          points: 150,
          condition_json: {
            type: 'TOTAL_MEALS_LOGGED',
            target: 500,
          },
        },
        {
          key_code: 'PROTEIN_CHAMPION_180G',
          title_he: 'הגע ליעד החלבון היומי שלך',
          desc_he: 'שמור על היעד שלך',
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
      title_he: 'תחזוקה יומית',
      subtitle_he: 'שמור על התוצאות',
      color_hex: '#00BCD4',
      tasks: [
        {
          key_code: 'DAILY_MEAL_LOG',
          title_he: 'רשום את הארוחות היום',
          desc_he: 'מעקב יומי עקבי',
          points: 5,
          condition_json: {
            type: 'LOG_MEALS_TODAY',
            target: 3,
          },
        },
        {
          key_code: 'DAILY_PROTEIN',
          title_he: 'הגע ליעד החלבון',
          desc_he: 'שמור על מסת השריר',
          points: 10,
          condition_json: {
            type: 'HIT_PROTEIN_GOAL',
            use_user_target: true,
          },
        },
        {
          key_code: 'DAILY_BALANCED',
          title_he: 'שמור על תחזוקת קלוריות',
          desc_he: 'שמור על המשקל',
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
