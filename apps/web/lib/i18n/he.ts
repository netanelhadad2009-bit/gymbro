// Hebrew translations for FitJourney app
export const he = {
  journey: {
    title: "מסע הכושר שלי",
    subtitle: "עקוב אחר ההתקדמות שלך בדרך ליעד",
  },
  hints: {
    panzoom: "גרור כדי לנוע • צביטה כדי לזום",
    locked: "השלב נעול - השלם את השלבים הקודמים",
  },
  stage: {
    close: "סגור",
    xpLabel: "נסיון",
    progress: "התקדמות",
    requirementsLabel: "דרישות לשלב",
    nextStepsLabel: "צעדים הבאים",
    start: "התחל",
    logWorkout: "רשום אימון",
    logMeal: "רשום ארוחה",
    completed: "הושלם",
    share: "שתף",
    locked: "נעול",
    available: "זמין",
    inProgress: "בתהליך",
  },
  workouts: {
    title: "האימונים שלי",
    subtitle: "כל התוכניות שנוצרו עבורך",
    searchPlaceholder: "חפש תוכניות...",
    empty: {
      title: "אין תוכניות אימון",
      subtitle: "סיימת שאלון? תן דקה לסנכרון, או צור תוכנית חדשה.",
      cta: "תוכנית חדשה",
    },
    auth: {
      required: "צריך להתחבר",
    },
    stats: {
      totalPrograms: "סה\"כ תוכניות",
      avgProgress: "התקדמות ממוצעת",
      weeklyWorkouts: "אימונים שבועיים",
    },
    buttons: {
      openPlan: "פתיחת התוכנית",
      continue: "המשך אימון",
      newProgram: "תוכנית חדשה",
    },
  },
  goals: {
    loss: "חיטוב",
    gain: "מסה",
    recomp: "ריקומפ",
    maintain: "שמירה",
  },
  common: {
    days: "ימים",
    daysRemaining: "ימים נותרו",
    createdOn: "נוצר ב־",
  },
  requirements: {
    workouts_per_week: "אימונים בשבוע",
    nutrition_adherence_pct: "דבקות בתזונה",
    weigh_ins: "שקילות",
    protein_avg_g: "ממוצע חלבון (גרם)",
    cardio_minutes: "קרדיו (דקות)",
    log_streak_days: "רצף רישום (ימים)",
    upper_body_workouts: "אימוני פלג עליון",
    kcal_deficit_avg: "ממוצע גירעון קלורי",
    steps_avg: "ממוצע צעדים",
    meals_logged: "ארוחות נרשמו",
    days: "ימים",
  },
  vision: {
    errors: {
      no_detection: {
        title: "לא הצלחנו לזהות ערכים תזונתיים",
        description: "נסו צילום ברור יותר או חפשו את המוצר במאגר",
      },
      no_ai_response: {
        title: "שגיאה בניתוח התמונה",
        description: "נסו שוב או הוסיפו את המוצר ידנית",
      },
      invalid_ai_response: {
        title: "שגיאה בניתוח התמונה",
        description: "נסו שוב או הוסיפו את המוצר ידנית",
      },
      missing_file: {
        title: "לא נבחרה תמונה",
        description: "אנא בחרו תמונה לניתוח",
      },
      server_error: {
        title: "שגיאת שרת",
        description: "משהו השתבש. נסו שוב מאוחר יותר",
      },
      network_error: {
        title: "שגיאת רשת",
        description: "בדקו את החיבור לאינטרנט ונסו שוב",
      },
      unknown: {
        title: "שגיאה לא צפויה",
        description: "משהו השתבש. נסו שוב",
      },
    },
    actions: {
      search: "חיפוש במאגר",
      manual: "הוספת מוצר ידני",
      retake: "נסו צילום מחדש",
      close: "סגור",
    },
  },
};

export type VisionErrorCode = keyof typeof he.vision.errors;

/**
 * Get Hebrew error message by code
 */
export function getVisionError(code: string) {
  const errorCode = code as VisionErrorCode;
  return he.vision.errors[errorCode] || he.vision.errors.unknown;
}
