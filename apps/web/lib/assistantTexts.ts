/**
 * Centralized text strings for the GymBro app
 * All static text (Hebrew and English) should be defined here
 * for easy maintenance and future localization
 */

// Hebrew text strings (default)
const he = {
  // General/Common
  general: {
    ok: "אישור",
    cancel: "ביטול",
    save: "שמור",
    saving: "שומר...",
    next: "הבא",
    back: "חזרה",
    continue: "המשך",
    loading: "טוען...",
    error: "אירעה שגיאה, נסה שוב",
    tryAgain: "נסה שוב",
    or: "או",
    days: "ימים",
  },

  // Navigation
  nav: {
    workouts: "אימונים",
    nutrition: "תפריט תזונה",
    map: "מפה",
    coach: "מאמן AI",
    profile: "פרופיל",
  },

  // Workouts Page
  workouts: {
    title: "אימונים",
    myWorkouts: "האימונים שלי",
    subtitle: "כל התוכניות שנוצרו עבורך",
    noPrograms: "אין תוכניות אימון",
    noProgramsDescription: "סיימת את השאלון? תן דקה לסנכרון, או צור תוכנית חדשה.",
    newProgram: "תוכנית חדשה",
    openProgram: "פתיחת התוכנית",
    continueWorkout: "המשך אימון",
    startWorkout: "התחל אימון",
    viewWorkout: "צפה באימון",
    progress: "התקדמות",
    workoutsLabel: "אימונים",
    nextWorkout: "הבא",
    allCompleted: "🎉 כל האימונים הושלמו!",
    loadError: "שגיאה בטעינת התוכניות. בדקו הרשאות/מדיניות RLS.",
    needToLogin: "צריך להתחבר",
    backToWorkouts: "חזרה לאימונים",
    completed: "הושלם",
    ready: "מוכן",
    exercises: "תרגילים",
    exercisesLabel: "תרגילים:",
    exercisesCount: "{n} תרגילים",
    dayLabel: "יום {n}",
    dayDefaultTitle: "אימון יום {n}",
    more: "עוד",
  },

  // Program Goals
  goals: {
    gain: "מסה",
    loss: "חיטוב",
    recomp: "ריקומפ",
    programTitle: "תוכנית אימון",
    programWithGoal: "תוכנית אימון –", // "תוכנית אימון – מסה"
    myProgram: "תוכנית אימון שלי",
  },

  // Program Detail Page
  programDetail: {
    notFound: "תוכנית לא נמצאה",
    programFor: "תוכנית ל-", // "תוכנית ל-90 ימים"
    progressTitle: "התקדמות",
    completed: "הושלם",
    workoutsTitle: "אימונים",
    noWorkouts: "לא נמצאו אימונים בתוכנית זו",
    day: "יום",
  },

  // Profile Page
  profile: {
    title: "פרופיל",
    subtitle: "פרטי המשתמש שלי",
    member: "חבר GymBro",
    user: "משתמש",
    email: "אימייל",
    userId: "מזהה משתמש",
    joinDate: "תאריך הצטרפות",
    logout: "התנתקות",
    needToLogin: "צריך להתחבר",
    loginButton: "התחברות",
    fullName: "שם מלא",
    gender: "מין",
    phoneNumber: "מספר טלפון",
    phoneNumberPlaceholder: "הכנס כאן את מספר הטלפון שלך",
    birthDate: "תאריך לידה",
    weight: "משקל",
    targetWeight: "משקל יעד",
    height: "גובה",
    age: "גיל",
    editProfile: "עריכת פרופיל",
    privacyPolicy: "מדיניות הפרטיות",
    termsOfUse: "תנאי שימוש",
    deleteAccount: "מחיקת חשבון",
    whatsappContact: "כל דבר שיש לך להגיד,\nנשמח שתדברו איתנו.",
  },

  // Login Page
  login: {
    title: "התחברות",
    emailLabel: "אימייל",
    emailPlaceholder: "your@email.com",
    passwordLabel: "סיסמה",
    loginButton: "התחברות",
    loggingIn: "מתחבר...",
  },

  // Signup Page
  signup: {
    title: "הרשמה",
    emailLabel: "אימייל",
    passwordLabel: "סיסמה",
    signupButton: "הרשמה",
    signingUp: "נרשם...",
  },

  // Onboarding - Goals
  onboardingGoals: {
    title: "מה אתה רוצה להשיג",
    titleFemale: "מה את רוצה להשיג",
    titleNeutral: "מה את/ה רוצה להשיג",
    withGymBro: "עם GymBro?",
    subtitle: "כל תשובה כאן היא לגיטימית - ומאתנו\nנבנה איתך תהליך שמתאים בדיוק לך.",
    muscleGain: "לעלות במסת שריר",
    weightLoss: "לרדת באחוזי שומן ולהתחטב",
    bodyMaintenance: "לשפר הרגלים ולשמור על הגוף",
  },

  // Generating Page
  generating: {
    phases: {
      calculating: "מחשב את היעד והלו״ז האישי שלך…",
      creatingWorkouts: "יוצר תוכנית אימונים לפי הבחירות שלך…",
      tuning: "מכוונן עומסים ותפריט לפי הנתונים שלך…",
      syncing: "מסנכרן ושומר את התוכנית…",
      ready: "מוכן! מעביר אותך לעמוד הבא…",
    },
    starting: "מתחיל...",
    loadingPlan: "טוען את התוכנית שלך...",
    savingPlan: "שומר את התוכנית...",
    done: "מוכן!",
    retryWorkout: "מנסה שוב ליצור אימונים...",
    retryNutrition: "מנסה שוב ליצור תפריט...",
    calculatingDays: "מחשב ימים עד השגת המטרה...",
    creatingParallel: "יוצר אימונים ותזונה במקביל...",
  },

  // Program Ready Page
  programReady: {
    title: "התוכנית שלך מוכנה! 🎉",
    description: "הכנו עבורך תוכנית אימונים ותזונה מותאמת אישית",
    whatIncluded: "מה כלול בתוכנית:",
    weeklyWorkouts: "תוכנית אימונים שבועית מלאה",
    nutritionPlan: "תפריט תזונה כשר מותאם",
    goalCalculation: "חישוב ימים למטרה שלך",
    letsStart: "בואו נתחיל!",
  },

  // Exercises Library
  exercises: {
    title: "ספריית תרגילים",
    subtitle: "דפדף בקטלוג התרגילים והוסף אותם לאימונים שלך",
    manageExercises: "ניהול תרגילים",
  },
} as const;

// English text strings (for future localization)
const en = {
  // General/Common
  general: {
    ok: "OK",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    next: "Next",
    back: "Back",
    continue: "Continue",
    loading: "Loading...",
    error: "An error occurred, please try again",
    tryAgain: "Try Again",
    or: "or",
    days: "days",
  },

  // Navigation
  nav: {
    workouts: "Workouts",
    nutrition: "Nutrition",
    map: "Map",
    coach: "AI Coach",
    profile: "Profile",
  },

  // Workouts Page
  workouts: {
    title: "Workouts",
    myWorkouts: "My Workouts",
    subtitle: "All programs created for you",
    noPrograms: "No workout programs",
    noProgramsDescription: "Finished the questionnaire? Wait a minute for sync, or create a new program.",
    newProgram: "New Program",
    openProgram: "Open Program",
    continueWorkout: "Continue Workout",
    startWorkout: "Start Workout",
    viewWorkout: "View Workout",
    progress: "Progress",
    workoutsLabel: "workouts",
    nextWorkout: "Next",
    allCompleted: "🎉 All workouts completed!",
    loadError: "Error loading programs. Check permissions/RLS policy.",
    needToLogin: "Need to login",
    backToWorkouts: "Back to Workouts",
    completed: "Completed",
    ready: "Ready",
    exercises: "exercises",
    exercisesLabel: "Exercises:",
    exercisesCount: "{n} exercises",
    dayLabel: "Day {n}",
    dayDefaultTitle: "Day {n} Workout",
    more: "more",
  },

  // Program Goals
  goals: {
    gain: "Gain",
    loss: "Cut",
    recomp: "Recomp",
    programTitle: "Workout Program",
    programWithGoal: "Workout Program –",
    myProgram: "My Workout Program",
  },

  // Program Detail Page
  programDetail: {
    notFound: "Program not found",
    programFor: "Program for ", // "Program for 90 days"
    progressTitle: "Progress",
    completed: "completed",
    workoutsTitle: "Workouts",
    noWorkouts: "No workouts found in this program",
    day: "Day",
  },

  // Profile Page
  profile: {
    title: "Profile",
    subtitle: "My user details",
    member: "GymBro Member",
    user: "User",
    email: "Email",
    userId: "User ID",
    joinDate: "Join Date",
    logout: "Logout",
    needToLogin: "Need to login",
    loginButton: "Login",
  },

  // Login Page
  login: {
    title: "Login",
    emailLabel: "Email",
    emailPlaceholder: "your@email.com",
    passwordLabel: "Password",
    loginButton: "Login",
    loggingIn: "Logging in...",
  },

  // Signup Page
  signup: {
    title: "Sign Up",
    emailLabel: "Email",
    passwordLabel: "Password",
    signupButton: "Sign Up",
    signingUp: "Signing up...",
  },

  // Onboarding - Goals
  onboardingGoals: {
    title: "What do you want to achieve",
    titleFemale: "What do you want to achieve",
    titleNeutral: "What do you want to achieve",
    withGymBro: "with GymBro?",
    subtitle: "Every answer here is legitimate - and we'll\nbuild a process that fits you exactly.",
    muscleGain: "Gain muscle mass",
    weightLoss: "Lose body fat and get toned",
    bodyMaintenance: "Improve habits and maintain body",
  },

  // Generating Page
  generating: {
    phases: {
      calculating: "Calculating your goal and personal schedule…",
      creatingWorkouts: "Creating workout program based on your choices…",
      tuning: "Tuning loads and menu based on your data…",
      syncing: "Syncing and saving the program…",
      ready: "Ready! Transferring you to the next page…",
    },
    starting: "Starting...",
    loadingPlan: "Loading your program...",
    savingPlan: "Saving the program...",
    done: "Done!",
    retryWorkout: "Retrying to create workouts...",
    retryNutrition: "Retrying to create menu...",
    calculatingDays: "Calculating days to goal achievement...",
    creatingParallel: "Creating workouts and nutrition in parallel...",
  },

  // Program Ready Page
  programReady: {
    title: "Your Program is Ready! 🎉",
    description: "We've prepared a personalized workout and nutrition program for you",
    whatIncluded: "What's included in the program:",
    weeklyWorkouts: "Full weekly workout program",
    nutritionPlan: "Customized kosher nutrition menu",
    goalCalculation: "Days calculation to your goal",
    letsStart: "Let's start!",
  },

  // Exercises Library
  exercises: {
    title: "Exercise Library",
    subtitle: "Browse the exercise catalog and add them to your workouts",
    manageExercises: "Manage Exercises",
  },
} as const;

// Language type
export type Language = "he" | "en";

// Default language
export const DEFAULT_LANGUAGE: Language = "he";

// Export both languages
export const assistantTexts = {
  he,
  en,
} as const;

// Helper function to get text in the current language
export function getTexts(lang: Language = DEFAULT_LANGUAGE) {
  return assistantTexts[lang];
}

// Export default (Hebrew) for convenience
export default assistantTexts.he;
