/**
 * FitJourney Theme Constants
 * Matches the web app design system
 */

export const colors = {
  // Backgrounds
  background: {
    primary: '#0D0E0F',
    secondary: '#0b0d0e',
    card: '#1A1B1C',
    cardAlt: '#111213',
    input: '#1a1d1e',
  },

  // Borders
  border: {
    primary: '#2A2B2C',
    secondary: '#333',
    light: 'rgba(255, 255, 255, 0.1)',
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#B7C0C8',
    tertiary: '#666',
    muted: '#5E666D',
    placeholder: 'rgba(255, 255, 255, 0.4)',
  },

  // Accent colors
  accent: {
    primary: '#E2F163',   // Lime-yellow (default)
    lime: '#a3e635',      // Alternative lime
    orange: '#FFA856',
    pink: '#C9456C',
    blue: '#5B9BFF',
  },

  // Semantic colors
  semantic: {
    success: '#22c55e',
    error: '#dc2626',
    errorLight: 'rgba(220, 38, 38, 0.2)',
    warning: '#f59e0b',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const typography = {
  // Font sizes
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },

  // Font weights (as strings for React Native)
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Hebrew text labels
export const texts = {
  // Auth
  auth: {
    login: 'התחברות',
    signup: 'הרשמה',
    email: 'אימייל',
    emailPlaceholder: 'הכנס את האימייל שלך',
    password: 'סיסמה',
    passwordPlaceholder: 'הכנס סיסמה',
    loginButton: 'התחבר',
    loggingIn: 'מתחבר...',
    signupButton: 'הרשם',
    signingUp: 'נרשם...',
    welcomeBack: 'ברוך הבא',
    createAccount: 'צור חשבון',
    alreadyHaveAccount: 'כבר יש לך חשבון?',
    dontHaveAccount: "אין לך חשבון?",
    or: 'או',
    continueWithGoogle: 'המשך עם Google',
    continueWithApple: 'המשך עם Apple',
  },

  // Navigation
  nav: {
    journey: 'מסע',
    workouts: 'אימונים',
    nutrition: 'תזונה',
    profile: 'פרופיל',
  },

  // Profile
  profile: {
    title: 'פרופיל',
    email: 'אימייל',
    gender: 'מגדר',
    age: 'גיל',
    weight: 'משקל (ק"ג)',
    targetWeight: 'משקל יעד (ק"ג)',
    height: 'גובה (ס"מ)',
    goal: 'מטרה',
    dietType: 'סוג דיאטה',
    editProfile: 'ערוך פרופיל',
    logout: 'התנתקות',
    logoutConfirm: 'האם אתה בטוח שברצונך להתנתק?',
    logoutTitle: 'התנתקות',
    cancel: 'ביטול',
    privacyPolicy: 'מדיניות פרטיות',
    termsOfUse: 'תנאי שימוש',
    deleteAccount: 'מחיקת חשבון',
  },

  // Journey
  journey: {
    title: 'מסע הכושר שלי',
    changeStage: 'שנה שלב',
    lockedStage: 'שלב נעול',
    lockedStageDesc: 'כל המשימות בשלב זה נעולות. השלם את השלב הקודם כדי לפתוח.',
    goToActiveStage: 'עבור לשלב הנוכחי',
    loading: 'טוען את המסע שלך...',
    noStages: 'אין שלבים זמינים',
    createStages: 'צור שלבים',
    connectionError: 'שגיאת חיבור',
    tryAgain: 'נסה שוב',
    streak: 'רצף ימים',
  },

  // Workouts
  workouts: {
    title: 'אימונים',
    myWorkouts: 'האימונים שלי',
    noPrograms: 'אין תוכניות אימון',
    noProgramsDesc: 'צור תוכנית אימון מותאמת אישית כדי להתחיל',
    createProgram: 'צור תוכנית',
    continueWorkout: 'המשך אימון',
    startWorkout: 'התחל אימון',
    viewWorkout: 'צפה באימון',
    completed: 'הושלם',
    ready: 'מוכן',
    exercises: 'תרגילים',
    exercisesCount: 'תרגילים',
    day: 'יום',
    progress: 'התקדמות',
    workoutsCompleted: 'אימונים הושלמו',
    sets: 'סטים',
    reps: 'חזרות',
    rest: 'מנוחה',
    seconds: 'שניות',
  },

  // Nutrition
  nutrition: {
    title: 'תזונה',
    calories: 'קלוריות',
    protein: 'חלבון',
    carbs: 'פחמימות',
    fat: 'שומנים',
    consumed: 'נצרך',
    target: 'יעד',
    remaining: 'נותר',
    meals: 'ארוחות',
    addMeal: 'הוסף ארוחה',
    scanBarcode: 'סרוק ברקוד',
    scanPhoto: 'צלם תמונה',
    viewSummary: 'צפה בסיכום מלא',
    tips: 'טיפים',
    shoppingList: 'רשימת קניות',
    close: 'סגור',
  },

  // General
  general: {
    loading: 'טוען...',
    error: 'שגיאה',
    save: 'שמור',
    cancel: 'ביטול',
    delete: 'מחק',
    edit: 'ערוך',
    confirm: 'אישור',
    or: 'או',
  },
} as const;

// Gender translations
export const genderToHe = (gender?: string): string => {
  if (!gender) return '—';
  switch (gender.toLowerCase()) {
    case 'male':
      return 'זכר';
    case 'female':
      return 'נקבה';
    case 'other':
      return 'אחר';
    default:
      return gender;
  }
};

// Goal translations
export const goalToHe = (goal?: string | null): string => {
  if (!goal) return '—';
  switch (goal.toLowerCase()) {
    case 'gain':
    case 'muscle_gain':
      return 'בניית שריר';
    case 'loss':
    case 'fat_loss':
      return 'הורדת משקל';
    case 'recomp':
    case 'recomposition':
      return 'שיפור הרכב גוף';
    case 'maintain':
      return 'שמירה על משקל';
    default:
      return goal;
  }
};

// Diet type translations
export const dietToHe = (diet?: string): string => {
  if (!diet) return '—';
  switch (diet.toLowerCase()) {
    case 'omnivore':
      return 'אומניבור';
    case 'vegetarian':
      return 'צמחוני';
    case 'vegan':
      return 'טבעוני';
    case 'keto':
      return 'קטו';
    case 'paleo':
      return 'פליאו';
    default:
      return diet;
  }
};
