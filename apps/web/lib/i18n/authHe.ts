/**
 * Hebrew authentication error translator
 *
 * Normalizes and translates all authentication errors to Hebrew,
 * including Supabase errors, validation errors, and network errors.
 */

import { AuthError } from '@supabase/supabase-js';

export interface NormalizedAuthError {
  code?: string;
  httpStatus?: number;
  rawMessage?: string;
}

/**
 * Normalizes various error types into a standard structure
 */
export function normalizeAuthError(err: unknown): NormalizedAuthError {
  // Null/undefined
  if (!err) {
    return {};
  }

  // Supabase AuthError
  if (err instanceof AuthError || (err && typeof err === 'object' && 'status' in err)) {
    const authErr = err as any;
    return {
      code: authErr.code || authErr.name,
      httpStatus: authErr.status,
      rawMessage: authErr.message,
    };
  }

  // Standard Error
  if (err instanceof Error) {
    return {
      code: err.name,
      rawMessage: err.message,
    };
  }

  // Plain object with message
  if (typeof err === 'object' && 'message' in err) {
    const errObj = err as any;
    return {
      code: errObj.code || errObj.error_code || errObj.name,
      httpStatus: errObj.status || errObj.statusCode,
      rawMessage: errObj.message,
    };
  }

  // String error
  if (typeof err === 'string') {
    return {
      rawMessage: err,
    };
  }

  return {};
}

/**
 * Context for error translation - different flows may have different messaging
 */
export type AuthErrorContext = 'sign_in' | 'sign_up' | 'reset' | 'otp' | 'generic';

/**
 * Hebrew error messages mapping
 */
const ERROR_MESSAGES_HE: Record<string, string> = {
  // Email validation
  invalid_email: 'האימייל שהוזן אינו תקין.',
  email_invalid: 'האימייל שהוזן אינו תקין.',

  // Password validation
  weak_password: 'הסיסמה חייבת להיות באורך 8 תווים לפחות.',
  password_too_short: 'הסיסמה חייבת להיות באורך 8 תווים לפחות.',
  password_complexity: 'הסיסמה חייבת לכלול אות ומספר.',

  // Sign up errors
  email_already_used: 'האימייל כבר רשום במערכת.',
  user_already_exists: 'האימייל כבר רשום במערכת.',
  email_exists: 'האימייל כבר רשום במערכת.',

  // Sign in errors
  invalid_credentials: 'האימייל או הסיסמה שגויים.',
  invalid_login_credentials: 'האימייל או הסיסמה שגויים.',
  email_not_confirmed: 'יש לאשר את כתובת האימייל לפני התחברות.',
  user_not_found: 'לא נמצא משתמש עם האימייל הזה.',

  // OTP errors
  otp_expired: 'הקוד פג תוקף. בקש/י קוד חדש.',
  otp_disabled: 'הקוד פג תוקף. בקש/י קוד חדש.',
  invalid_otp: 'הקוד שהוזן אינו תקין.',

  // Rate limiting
  too_many_requests: 'נשלחו יותר מדי בקשות. נסה/י שוב מאוחר יותר.',
  rate_limit_sms: 'נשלחו יותר מדי קודים. המתן/המתיני כמה דקות לפני ניסיון נוסף.',
  email_rate_limit_exceeded: 'נשלחו יותר מדי בקשות. נסה/י שוב מאוחר יותר.',

  // Network errors
  network_error: 'שגיאת רשת. בדוק/בדקי חיבור לאינטרנט.',
  fetch_failed: 'שגיאת רשת. בדוק/בדקי חיבור לאינטרנט.',

  // OAuth errors
  provider_cancelled: 'התחברות בוטלה.',
  oauth_cancelled: 'התחברות בוטלה.',

  // Session errors
  session_expired: 'פג תוקף ההתחברות. יש להתחבר מחדש.',
  refresh_token_not_found: 'פג תוקף ההתחברות. יש להתחבר מחדש.',

  // Server errors
  server_error: 'אירעה שגיאה בשרת. נסה/י שוב מאוחר יותר.',
  internal_server_error: 'אירעה שגיאה בשרת. נסה/י שוב מאוחר יותר.',
};

/**
 * Message substring patterns to detect (case-insensitive)
 */
const MESSAGE_PATTERNS: Array<[RegExp, string]> = [
  // Email patterns
  [/invalid.*email|email.*invalid|email.*format/i, ERROR_MESSAGES_HE.invalid_email],
  [/email.*already.*registered|email.*already.*use|already.*registered|user.*already.*exists/i, ERROR_MESSAGES_HE.email_already_used],
  [/email.*not.*confirmed|confirm.*email/i, ERROR_MESSAGES_HE.email_not_confirmed],

  // Password patterns
  [/password.*short|password.*length|password.*8.*character/i, ERROR_MESSAGES_HE.weak_password],
  [/password.*weak|password.*complexity/i, ERROR_MESSAGES_HE.password_complexity],
  [/invalid.*login|invalid.*credential|wrong.*password|incorrect.*password/i, ERROR_MESSAGES_HE.invalid_credentials],

  // User patterns
  [/user.*not.*found|account.*not.*found/i, ERROR_MESSAGES_HE.user_not_found],

  // Rate limiting
  [/too.*many.*request|rate.*limit/i, ERROR_MESSAGES_HE.too_many_requests],
  [/sms.*rate.*limit/i, ERROR_MESSAGES_HE.rate_limit_sms],

  // Network
  [/network.*error|fetch.*fail|connection.*fail|network.*request.*fail/i, ERROR_MESSAGES_HE.network_error],
  [/failed.*to.*fetch|type.*error.*fetch/i, ERROR_MESSAGES_HE.network_error],

  // OTP
  [/otp.*expired|otp.*invalid|token.*expired/i, ERROR_MESSAGES_HE.otp_expired],

  // OAuth
  [/oauth.*cancel|provider.*cancel|auth.*cancel/i, ERROR_MESSAGES_HE.provider_cancelled],

  // Session
  [/session.*expired|token.*expired|refresh.*token/i, ERROR_MESSAGES_HE.session_expired],

  // Server
  [/server.*error|internal.*error|500/i, ERROR_MESSAGES_HE.server_error],
];

/**
 * Translate authentication error to Hebrew
 *
 * @param err - Error object (can be Supabase error, Error, or plain object)
 * @param context - Authentication flow context (optional)
 * @returns Hebrew error message
 */
export function translateAuthError(
  err: unknown,
  context: AuthErrorContext = 'generic'
): string {
  const normalized = normalizeAuthError(err);

  // Check for known error codes first
  if (normalized.code) {
    const codeLower = normalized.code.toLowerCase();

    // Direct code match
    if (ERROR_MESSAGES_HE[codeLower]) {
      return ERROR_MESSAGES_HE[codeLower];
    }

    // Check if code contains known patterns
    for (const [key, message] of Object.entries(ERROR_MESSAGES_HE)) {
      if (codeLower.includes(key)) {
        return message;
      }
    }
  }

  // Check HTTP status codes
  if (normalized.httpStatus) {
    switch (normalized.httpStatus) {
      case 400:
        // Bad request - likely validation error
        if (normalized.rawMessage) {
          // Try to match message patterns
          for (const [pattern, message] of MESSAGE_PATTERNS) {
            if (pattern.test(normalized.rawMessage)) {
              return message;
            }
          }
        }
        return ERROR_MESSAGES_HE.invalid_credentials;

      case 401:
        return ERROR_MESSAGES_HE.invalid_credentials;

      case 422:
        // Unprocessable entity - validation error
        return ERROR_MESSAGES_HE.invalid_email;

      case 429:
        return ERROR_MESSAGES_HE.too_many_requests;

      case 500:
      case 502:
      case 503:
      case 504:
        return ERROR_MESSAGES_HE.server_error;
    }
  }

  // Try to match message patterns
  if (normalized.rawMessage) {
    const message = normalized.rawMessage;

    for (const [pattern, hebrewMessage] of MESSAGE_PATTERNS) {
      if (pattern.test(message)) {
        return hebrewMessage;
      }
    }

    // Check for TypeError (network errors)
    if (message.includes('TypeError') || message.includes('Failed to fetch')) {
      return ERROR_MESSAGES_HE.network_error;
    }
  }

  // Default fallback based on context
  switch (context) {
    case 'sign_in':
      return ERROR_MESSAGES_HE.invalid_credentials;
    case 'sign_up':
      return 'אירעה שגיאה בהרשמה. נסה/י שוב.';
    case 'reset':
      return 'אירעה שגיאה באיפוס הסיסמה. נסה/י שוב.';
    case 'otp':
      return ERROR_MESSAGES_HE.otp_expired;
    default:
      return 'אירעה שגיאה. נסה/י שוב.';
  }
}

/**
 * Client-side validation helpers
 */

export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return ERROR_MESSAGES_HE.invalid_email;
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return ERROR_MESSAGES_HE.weak_password;
  }

  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return ERROR_MESSAGES_HE.password_complexity;
  }

  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (password !== confirm) {
    return 'הסיסמאות אינן תואמות.';
  }
  return null;
}
