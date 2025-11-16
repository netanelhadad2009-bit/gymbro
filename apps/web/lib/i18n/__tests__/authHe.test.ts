/**
 * Unit tests for Hebrew auth error translator
 */

import { describe, it, expect } from '@jest/globals';
import {
  translateAuthError,
  normalizeAuthError,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
} from '../authHe';

describe('normalizeAuthError', () => {
  it('should handle null/undefined', () => {
    expect(normalizeAuthError(null)).toEqual({});
    expect(normalizeAuthError(undefined)).toEqual({});
  });

  it('should handle Supabase AuthError', () => {
    const error = {
      name: 'AuthApiError',
      message: 'Invalid login credentials',
      status: 400,
      code: 'invalid_credentials',
    };
    const normalized = normalizeAuthError(error);
    expect(normalized.code).toBe('invalid_credentials');
    expect(normalized.httpStatus).toBe(400);
    expect(normalized.rawMessage).toBe('Invalid login credentials');
  });

  it('should handle standard Error', () => {
    const error = new Error('Network request failed');
    const normalized = normalizeAuthError(error);
    expect(normalized.code).toBe('Error');
    expect(normalized.rawMessage).toBe('Network request failed');
  });

  it('should handle plain string', () => {
    const normalized = normalizeAuthError('Something went wrong');
    expect(normalized.rawMessage).toBe('Something went wrong');
  });
});

describe('translateAuthError', () => {
  it('should translate invalid email errors', () => {
    const error = { message: 'Invalid email format', code: 'invalid_email' };
    expect(translateAuthError(error, 'sign_in')).toBe('האימייל שהוזן אינו תקין.');
  });

  it('should translate weak password errors', () => {
    const error = { message: 'Password is too short', code: 'weak_password' };
    expect(translateAuthError(error, 'sign_up')).toBe('הסיסמה חייבת להיות באורך 8 תווים לפחות.');
  });

  it('should translate email already used errors', () => {
    const error = { message: 'User already registered', code: 'user_already_exists' };
    expect(translateAuthError(error, 'sign_up')).toBe('האימייל כבר רשום במערכת.');
  });

  it('should translate invalid credentials errors', () => {
    const error = { message: 'Invalid login credentials', status: 400 };
    expect(translateAuthError(error, 'sign_in')).toBe('האימייל או הסיסמה שגויים.');
  });

  it('should translate user not found errors', () => {
    const error = { message: 'User not found in the system' };
    expect(translateAuthError(error, 'sign_in')).toBe('לא נמצא משתמש עם האימייל הזה.');
  });

  it('should translate email not confirmed errors', () => {
    const error = { message: 'Email not confirmed' };
    expect(translateAuthError(error, 'sign_in')).toBe('יש לאשר את כתובת האימייל לפני התחברות.');
  });

  it('should translate OTP expired errors', () => {
    const error = { message: 'OTP expired', code: 'otp_expired' };
    expect(translateAuthError(error, 'otp')).toBe('הקוד פג תוקף. בקש/י קוד חדש.');
  });

  it('should translate rate limit errors', () => {
    const error = { message: 'Too many requests', status: 429 };
    expect(translateAuthError(error, 'sign_in')).toBe('נשלחו יותר מדי בקשות. נסה/י שוב מאוחר יותר.');
  });

  it('should translate network errors', () => {
    const error = new TypeError('Failed to fetch');
    expect(translateAuthError(error, 'sign_in')).toBe('שגיאת רשת. בדוק/בדקי חיבור לאינטרנט.');
  });

  it('should translate OAuth cancelled errors', () => {
    const error = { message: 'OAuth flow was cancelled by user' };
    expect(translateAuthError(error, 'sign_in')).toBe('התחברות בוטלה.');
  });

  it('should translate session expired errors', () => {
    const error = { message: 'Refresh token not found', code: 'refresh_token_not_found' };
    expect(translateAuthError(error, 'generic')).toBe('פג תוקף ההתחברות. יש להתחבר מחדש.');
  });

  it('should translate server errors', () => {
    const error = { message: 'Internal server error', status: 500 };
    expect(translateAuthError(error, 'sign_in')).toBe('אירעה שגיאה בשרת. נסה/י שוב מאוחר יותר.');
  });

  it('should handle unknown errors with context-specific defaults', () => {
    const unknownError = { message: 'Some unknown error' };

    expect(translateAuthError(unknownError, 'sign_in')).toBe('האימייל או הסיסמה שגויים.');
    expect(translateAuthError(unknownError, 'sign_up')).toBe('אירעה שגיאה בהרשמה. נסה/י שוב.');
    expect(translateAuthError(unknownError, 'reset')).toBe('אירעה שגיאה באיפוס הסיסמה. נסה/י שוב.');
    expect(translateAuthError(unknownError, 'otp')).toBe('הקוד פג תוקף. בקש/י קוד חדש.');
    expect(translateAuthError(unknownError, 'generic')).toBe('אירעה שגיאה. נסה/י שוב.');
  });

  it('should detect errors by HTTP status code', () => {
    expect(translateAuthError({ status: 401 }, 'sign_in')).toBe('האימייל או הסיסמה שגויים.');
    expect(translateAuthError({ status: 422 }, 'sign_up')).toBe('האימייל שהוזן אינו תקין.');
    expect(translateAuthError({ status: 429 }, 'sign_in')).toBe('נשלחו יותר מדי בקשות. נסה/י שוב מאוחר יותר.');
    expect(translateAuthError({ status: 500 }, 'sign_in')).toBe('אירעה שגיאה בשרת. נסה/י שוב מאוחר יותר.');
  });

  it('should detect errors by message patterns', () => {
    expect(translateAuthError({ message: 'Email already registered' })).toContain('האימייל כבר רשום במערכת');
    expect(translateAuthError({ message: 'Password must be at least 8 characters' })).toContain('הסיסמה חייבת להיות באורך 8');
    expect(translateAuthError({ message: 'Wrong password provided' })).toContain('האימייל או הסיסמה שגויים');
    expect(translateAuthError({ message: 'Network request failed' })).toContain('שגיאת רשת');
  });
});

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('user@example.com')).toBeNull();
    expect(validateEmail('test.user+tag@domain.co.il')).toBeNull();
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('')).toBe('האימייל שהוזן אינו תקין.');
    expect(validateEmail('invalid')).toBe('האימייל שהוזן אינו תקין.');
    expect(validateEmail('invalid@')).toBe('האימייל שהוזן אינו תקין.');
    expect(validateEmail('@domain.com')).toBe('האימייל שהוזן אינו תקין.');
    expect(validateEmail('user@domain')).toBe('האימייל שהוזן אינו תקין.');
  });
});

describe('validatePassword', () => {
  it('should accept valid passwords', () => {
    expect(validatePassword('Password1')).toBeNull();
    expect(validatePassword('MyP@ssw0rd')).toBeNull();
    expect(validatePassword('12345678a')).toBeNull();
  });

  it('should reject short passwords', () => {
    expect(validatePassword('')).toBe('הסיסמה חייבת להיות באורך 8 תווים לפחות.');
    expect(validatePassword('short')).toBe('הסיסמה חייבת להיות באורך 8 תווים לפחות.');
    expect(validatePassword('Pass1')).toBe('הסיסמה חייבת להיות באורך 8 תווים לפחות.');
  });

  it('should reject passwords without letters or numbers', () => {
    expect(validatePassword('12345678')).toBe('הסיסמה חייבת לכלול אות ומספר.');
    expect(validatePassword('abcdefgh')).toBe('הסיסמה חייבת לכלול אות ומספר.');
    expect(validatePassword('!@#$%^&*()')).toBe('הסיסמה חייבת לכלול אות ומספר.');
  });
});

describe('validatePasswordMatch', () => {
  it('should accept matching passwords', () => {
    expect(validatePasswordMatch('Password1', 'Password1')).toBeNull();
  });

  it('should reject non-matching passwords', () => {
    expect(validatePasswordMatch('Password1', 'Password2')).toBe('הסיסמאות אינן תואמות.');
    expect(validatePasswordMatch('abc', 'def')).toBe('הסיסמאות אינן תואמות.');
  });
});
