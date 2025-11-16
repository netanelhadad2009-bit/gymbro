/**
 * Hebrew Error Mapping for Generating Page
 *
 * Centralizes all error messages to ensure consistent, user-friendly Hebrew messaging
 * across all error scenarios in the program generation flow.
 */

export type ErrorLevel = 'critical' | 'warning' | 'info';

export interface HebrewError {
  title: string;
  desc: string;
  level: ErrorLevel;
  actions?: ErrorAction[];
}

export interface ErrorAction {
  label: string;
  type: 'retry' | 'continue' | 'cancel' | 'cleanup' | 'report';
}

/**
 * Error type classification
 */
export type GeneratingErrorType =
  | 'network_offline'
  | 'network_timeout'
  | 'network_error'
  | 'storage_quota'
  | 'storage_unavailable'
  | 'storage_permission'
  | 'navigation_failed'
  | 'draft_save_failed'
  | 'session_corrupted'
  | 'api_error'
  | 'timeout'
  | 'abort'
  | 'parse_error'
  | 'unknown';

/**
 * Hebrew error messages catalog
 */
const ERROR_MESSAGES: Record<GeneratingErrorType, HebrewError> = {
  network_offline: {
    title: 'אין חיבור לאינטרנט',
    desc: 'בדקו את החיבור שלכם לרשת ונסו שוב.',
    level: 'critical',
    actions: [
      { label: 'נסה שוב', type: 'retry' },
    ],
  },

  network_timeout: {
    title: 'תם הזמן',
    desc: 'השרת לא הגיב בזמן. בדקו את החיבור או נסו שוב. תוכלו גם להמשיך בלי להמתין.',
    level: 'warning',
    actions: [
      { label: 'נסה שוב', type: 'retry' },
      { label: 'המשך בכל זאת', type: 'continue' },
    ],
  },

  network_error: {
    title: 'בעיית חיבור לשרת',
    desc: 'קרתה שגיאה בתקשורת עם השרת. נסו שוב.',
    level: 'critical',
    actions: [
      { label: 'נסה שוב', type: 'retry' },
      { label: 'דווח שגיאה', type: 'report' },
    ],
  },

  storage_quota: {
    title: 'אחסון מלא',
    desc: 'האחסון במכשיר מלא. נקו טיוטות ישנות או פנו מקום במכשיר.',
    level: 'critical',
    actions: [
      { label: 'נקה טיוטות ישנות', type: 'cleanup' },
      { label: 'נסה שוב', type: 'retry' },
    ],
  },

  storage_unavailable: {
    title: 'אחסון מקומי לא זמין',
    desc: 'ייתכן שמצב גלישה פרטית מופעל או שהמכשיר מלא. נסו לכבות מצב פרטי או לפנות מקום.',
    level: 'critical',
    actions: [
      { label: 'נקה טיוטות ישנות', type: 'cleanup' },
      { label: 'נסה שוב', type: 'retry' },
    ],
  },

  storage_permission: {
    title: 'אין הרשאת אחסון',
    desc: 'הדפדפן חוסם גישה לאחסון מקומי. בדקו את ההגדרות.',
    level: 'critical',
    actions: [
      { label: 'נסה שוב', type: 'retry' },
    ],
  },

  navigation_failed: {
    title: 'ניווט נכשל',
    desc: 'לא הצלחנו לעבור לעמוד הבא. נסו שוב.',
    level: 'warning',
    actions: [
      { label: 'נסה שוב', type: 'retry' },
      { label: 'המשך לתוכנית שלי', type: 'continue' },
    ],
  },

  draft_save_failed: {
    title: 'שגיאה בשמירת התוכנית',
    desc: 'לא הצלחנו לשמור את התוכנית שלך. ייתכן שהאחסון במכשיר מלא.',
    level: 'critical',
    actions: [
      { label: 'נסה שוב', type: 'retry' },
      { label: 'דווח שגיאה', type: 'report' },
    ],
  },

  session_corrupted: {
    title: 'נתוני השיחה פגומים',
    desc: 'קרתה בעיה בנתוני היצירה. נצטרך להתחיל מחדש.',
    level: 'critical',
    actions: [
      { label: 'התחל מחדש', type: 'retry' },
    ],
  },

  api_error: {
    title: 'שגיאת שרת',
    desc: 'קרתה שגיאה בשרת. נסו שוב מאוחר יותר.',
    level: 'critical',
    actions: [
      { label: 'נסה שוב', type: 'retry' },
      { label: 'דווח שגיאה', type: 'report' },
    ],
  },

  timeout: {
    title: 'תם הזמן',
    desc: 'הפעולה ארכה יותר מדי זמן. נסו שוב.',
    level: 'warning',
    actions: [
      { label: 'נסה שוב', type: 'retry' },
      { label: 'המשך בכל זאת', type: 'continue' },
    ],
  },

  abort: {
    title: 'הפעולה בוטלה',
    desc: 'הפעולה בוטלה. תוכלו לנסות שוב.',
    level: 'warning',
    actions: [
      { label: 'נסה שוב', type: 'retry' },
    ],
  },

  parse_error: {
    title: 'שגיאה בעיבוד נתונים',
    desc: 'קרתה בעיה בעיבוד התשובה מהשרת. נסו שוב.',
    level: 'critical',
    actions: [
      { label: 'נסה שוב', type: 'retry' },
      { label: 'דווח שגיאה', type: 'report' },
    ],
  },

  unknown: {
    title: 'שגיאה לא צפויה',
    desc: 'קרתה שגיאה בלתי צפויה. נסו שוב או דווחו על הבעיה.',
    level: 'critical',
    actions: [
      { label: 'נסה שוב', type: 'retry' },
      { label: 'דווח שגיאה', type: 'report' },
    ],
  },
};

/**
 * Map JavaScript Error to Hebrew error message
 *
 * @param error - The error object (Error, DOMException, or any)
 * @param context - Optional context for more specific error detection
 * @returns Structured Hebrew error with title, description, and suggested actions
 */
export function mapErrorToHe(
  error: unknown,
  context?: { operation?: 'network' | 'storage' | 'navigation' | 'parsing' }
): HebrewError {
  // Handle null/undefined
  if (!error) {
    return ERROR_MESSAGES.unknown;
  }

  const err = error as any;
  const errorMessage = err?.message || '';
  const errorName = err?.name || '';

  // Network errors
  if (errorName === 'TypeError' && errorMessage.includes('fetch')) {
    return ERROR_MESSAGES.network_error;
  }

  if (errorName === 'TypeError' && errorMessage.includes('Failed to fetch')) {
    return ERROR_MESSAGES.network_offline;
  }

  // Timeout errors
  if (errorName === 'AbortError') {
    if (errorMessage.includes('timeout') || context?.operation === 'network') {
      return ERROR_MESSAGES.network_timeout;
    }
    return ERROR_MESSAGES.abort;
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return ERROR_MESSAGES.timeout;
  }

  // Storage errors
  if (err instanceof DOMException) {
    if (err.name === 'QuotaExceededError') {
      return ERROR_MESSAGES.storage_quota;
    }

    if (err.name === 'SecurityError' || err.name === 'NotAllowedError') {
      return ERROR_MESSAGES.storage_permission;
    }

    if (err.name === 'InvalidStateError') {
      return ERROR_MESSAGES.storage_unavailable;
    }
  }

  if (errorMessage.includes('storage') || errorMessage.includes('localStorage')) {
    if (errorMessage.includes('quota') || errorMessage.includes('full')) {
      return ERROR_MESSAGES.storage_quota;
    }
    return ERROR_MESSAGES.storage_unavailable;
  }

  // Parse errors
  if (errorName === 'SyntaxError' || errorMessage.includes('JSON')) {
    return ERROR_MESSAGES.parse_error;
  }

  // API errors
  if (errorMessage.includes('API') || errorMessage.includes('server') || errorMessage.includes('status')) {
    return ERROR_MESSAGES.api_error;
  }

  // Context-specific errors
  if (context?.operation === 'storage') {
    return ERROR_MESSAGES.storage_unavailable;
  }

  if (context?.operation === 'network') {
    return ERROR_MESSAGES.network_error;
  }

  if (context?.operation === 'navigation') {
    return ERROR_MESSAGES.navigation_failed;
  }

  // Default to unknown error
  return ERROR_MESSAGES.unknown;
}

/**
 * Get specific error message by type
 */
export function getErrorMessage(type: GeneratingErrorType): HebrewError {
  return ERROR_MESSAGES[type];
}

/**
 * Check if error is recoverable (warning level)
 */
export function isRecoverableError(error: HebrewError): boolean {
  return error.level === 'warning' || error.level === 'info';
}

/**
 * Check if error should block progress
 */
export function shouldBlockProgress(error: HebrewError): boolean {
  return error.level === 'critical';
}
