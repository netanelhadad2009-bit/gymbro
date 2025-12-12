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

// English text labels
export const texts = {
  // Auth
  auth: {
    login: 'Log In',
    signup: 'Sign Up',
    email: 'Email',
    emailPlaceholder: 'Enter your email',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
    loginButton: 'Log In',
    loggingIn: 'Logging in...',
    signupButton: 'Sign Up',
    signingUp: 'Signing up...',
    welcomeBack: 'Welcome Back',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    or: 'or',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
  },

  // Navigation
  nav: {
    journey: 'Journey',
    workouts: 'Workouts',
    nutrition: 'Nutrition',
    profile: 'Profile',
  },

  // Profile
  profile: {
    title: 'Profile',
    email: 'Email',
    gender: 'Gender',
    age: 'Age',
    weight: 'Weight (kg)',
    targetWeight: 'Target Weight (kg)',
    height: 'Height (cm)',
    goal: 'Goal',
    dietType: 'Diet Type',
    editProfile: 'Edit Profile',
    logout: 'Log Out',
    logoutConfirm: 'Are you sure you want to log out?',
    logoutTitle: 'Log Out',
    cancel: 'Cancel',
    privacyPolicy: 'Privacy Policy',
    termsOfUse: 'Terms of Use',
    deleteAccount: 'Delete Account',
  },

  // Journey
  journey: {
    title: 'My Fitness Journey',
    changeStage: 'Change Stage',
    lockedStage: 'Stage Locked',
    lockedStageDesc: 'All tasks in this stage are locked. Complete the previous stage to unlock.',
    goToActiveStage: 'Go to Current Stage',
    loading: 'Loading your journey...',
    noStages: 'No stages available',
    createStages: 'Create Stages',
    connectionError: 'Connection Error',
    tryAgain: 'Try Again',
    streak: 'Day Streak',
  },

  // Workouts
  workouts: {
    title: 'Workouts',
    myWorkouts: 'My Workouts',
    noPrograms: 'No workout programs',
    noProgramsDesc: 'Create a personalized workout program to get started',
    createProgram: 'Create Program',
    continueWorkout: 'Continue Workout',
    startWorkout: 'Start Workout',
    viewWorkout: 'View Workout',
    completed: 'Completed',
    ready: 'Ready',
    exercises: 'Exercises',
    exercisesCount: 'Exercises',
    day: 'Day',
    progress: 'Progress',
    workoutsCompleted: 'Workouts Completed',
    sets: 'Sets',
    reps: 'Reps',
    rest: 'Rest',
    seconds: 'seconds',
  },

  // Nutrition
  nutrition: {
    title: 'Nutrition',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    consumed: 'Consumed',
    target: 'Target',
    remaining: 'Remaining',
    meals: 'Meals',
    addMeal: 'Add Meal',
    scanBarcode: 'Scan Barcode',
    scanPhoto: 'Take Photo',
    viewSummary: 'View Full Summary',
    tips: 'Tips',
    shoppingList: 'Shopping List',
    close: 'Close',
  },

  // General
  general: {
    loading: 'Loading...',
    error: 'Error',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    confirm: 'Confirm',
    or: 'or',
  },
} as const;

// Gender translations
export const genderToEn = (gender?: string): string => {
  if (!gender) return '—';
  switch (gender.toLowerCase()) {
    case 'male':
      return 'Male';
    case 'female':
      return 'Female';
    case 'other':
      return 'Other';
    default:
      return gender;
  }
};

// Goal translations
export const goalToEn = (goal?: string | null): string => {
  if (!goal) return '—';
  switch (goal.toLowerCase()) {
    case 'gain':
    case 'muscle_gain':
      return 'Build Muscle';
    case 'loss':
    case 'fat_loss':
      return 'Lose Weight';
    case 'recomp':
    case 'recomposition':
      return 'Body Recomposition';
    case 'maintain':
      return 'Maintain Weight';
    default:
      return goal;
  }
};

// Diet type translations
export const dietToEn = (diet?: string): string => {
  if (!diet) return '—';
  switch (diet.toLowerCase()) {
    case 'omnivore':
      return 'Omnivore';
    case 'vegetarian':
      return 'Vegetarian';
    case 'vegan':
      return 'Vegan';
    case 'keto':
      return 'Keto';
    case 'paleo':
      return 'Paleo';
    default:
      return diet;
  }
};

// Hebrew translations
export const genderToHe = (gender?: string | null): string => {
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

export const goalToHe = (goal?: string | null): string => {
  if (!goal) return '—';
  switch (goal.toLowerCase()) {
    case 'gain':
    case 'muscle_gain':
    case 'muscle building':
      return 'בניית שריר';
    case 'loss':
    case 'weight_loss':
    case 'fat loss':
      return 'ירידה במשקל';
    case 'recomp':
    case 'recomposition':
    case 'body recomposition':
      return 'שיפור מבנה גוף';
    case 'maintain':
    case 'maintenance':
      return 'שמירה על משקל';
    default:
      return goal;
  }
};

export const dietToHe = (diet?: string | null): string => {
  if (!diet) return '—';
  switch (diet.toLowerCase()) {
    case 'regular':
    case 'omnivore':
      return 'רגיל';
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
