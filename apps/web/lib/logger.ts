/**
 * Sanitized Security Logging Utilities
 *
 * Purpose:
 * - Prevent accidental logging of sensitive data (JWT tokens, API keys, passwords)
 * - Provide type-safe logging interface
 * - Standardize log format across the application
 * - Enable easy integration with monitoring tools (Sentry, Axiom, etc.)
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.info('User action', {
 *   userId: user.id,
 *   action: 'meal_created'
 * });
 *
 * logger.error('API error', {
 *   endpoint: '/api/meals',
 *   error: sanitizeError(error)
 * });
 * ```
 */

/* eslint-disable no-console */

// =============================================================================
// Types
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogContext {
  [key: string]: unknown;
}

export interface SanitizedError {
  message: string;
  name?: string;
  stack?: string;
  code?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';

// In production, only log warnings and errors by default
const MIN_LOG_LEVEL: LogLevel = IS_PRODUCTION ? 'warn' : 'debug';

// =============================================================================
// Sanitization Helpers
// =============================================================================

/**
 * Patterns to detect and redact sensitive data
 */
const SENSITIVE_PATTERNS = {
  // JWT tokens (eyJ...)
  jwt: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi,

  // API keys (common prefixes)
  apiKey: /(?:sk|pk|Bearer|token)[_-]?[a-zA-Z0-9]{20,}/gi,

  // Supabase keys (very long base64 strings)
  supabaseKey: /eyJ[a-zA-Z0-9_-]{100,}/gi,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,

  // Credit cards (basic pattern)
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

  // Passwords (common field names)
  passwordField: /(password|passwd|pwd)["']?\s*[:=]\s*["']?[^"'\s]+/gi,
};

/**
 * Keys that should never be logged
 */
const SENSITIVE_KEYS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'authorization',
  'auth',
  'apiKey',
  'api_key',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionToken',
  'session_token',
  'jwt',
  'bearer',
  'cookie',
  'cookies',
  'creditCard',
  'credit_card',
  'ssn',
  'social_security',
];

/**
 * Redact sensitive string values
 */
function redactString(value: string): string {
  let redacted = value;

  // Apply all sensitive patterns
  Object.entries(SENSITIVE_PATTERNS).forEach(([type, pattern]) => {
    redacted = redacted.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
  });

  return redacted;
}

/**
 * Recursively sanitize an object, removing/redacting sensitive fields
 */
function sanitizeObject(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 5) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return redactString(obj);
    }
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  // Handle objects
  const sanitized: Record<string, unknown> = {};

  Object.entries(obj).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();

    // Check if key is sensitive
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
      return;
    }

    // Recursively sanitize value
    sanitized[key] = sanitizeObject(value, depth + 1);
  });

  return sanitized;
}

// =============================================================================
// Public API - Sanitization Functions
// =============================================================================

/**
 * Sanitize user ID for logging
 * Shows first 8 chars only to help with debugging while maintaining privacy
 */
export function sanitizeUserId(userId: string | null | undefined): string {
  if (!userId) return '[NO_USER_ID]';
  if (userId.length <= 8) return userId;
  return `${userId.slice(0, 8)}...`;
}

/**
 * Sanitize error object for logging
 * Removes stack traces in production, keeps message
 */
export function sanitizeError(error: unknown): SanitizedError {
  if (error instanceof Error) {
    return {
      message: redactString(error.message),
      name: error.name,
      stack: IS_PRODUCTION ? undefined : error.stack,
      code: 'code' in error ? String(error.code) : undefined,
    };
  }

  if (typeof error === 'string') {
    return {
      message: redactString(error),
    };
  }

  return {
    message: 'Unknown error',
  };
}

/**
 * Sanitize request body for logging
 * Removes sensitive fields and redacts patterns
 */
export function sanitizeRequestBody(body: unknown): unknown {
  return sanitizeObject(body);
}

/**
 * Sanitize request headers for logging
 * Removes authorization, cookies, etc.
 */
export function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  Object.entries(headers).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();

    if (lowerKey === 'authorization' || lowerKey === 'cookie') {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = redactString(value);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Sanitize URL parameters for logging
 * Removes token, key, secret params
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost');
    const params = new URLSearchParams(parsed.search);

    // Redact sensitive query params
    ['token', 'key', 'secret', 'password', 'api_key'].forEach((param) => {
      if (params.has(param)) {
        params.set(param, '[REDACTED]');
      }
    });

    parsed.search = params.toString();
    return parsed.pathname + (parsed.search ? `?${parsed.search}` : '');
  } catch {
    // If URL parsing fails, just redact the whole thing
    return redactString(url);
  }
}

// =============================================================================
// Log Level Utilities
// =============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

function shouldLog(level: LogLevel): boolean {
  // Never log in test environment (unless explicitly testing logger)
  if (IS_TEST) return false;

  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

// =============================================================================
// Logging Functions
// =============================================================================

interface LogOptions {
  level: LogLevel;
  message: string;
  context?: LogContext;
}

function formatLog(options: LogOptions): string {
  const { level, message, context } = options;
  const timestamp = new Date().toISOString();

  const logObject = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(context ? { context: sanitizeObject(context) } : {}),
  };

  return JSON.stringify(logObject);
}

function logToConsole(options: LogOptions): void {
  const { level } = options;
  const formatted = formatLog(options);

  // Use appropriate console method
  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
    case 'critical':
      console.error(formatted);
      break;
  }
}

// =============================================================================
// Logger Instance
// =============================================================================

export const logger = {
  /**
   * Debug logs (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    logToConsole({ level: 'debug', message, context });
  },

  /**
   * Informational logs
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    logToConsole({ level: 'info', message, context });
  },

  /**
   * Warning logs (potential issues)
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    logToConsole({ level: 'warn', message, context });
  },

  /**
   * Error logs (recoverable errors)
   */
  error(message: string, context?: LogContext): void {
    if (!shouldLog('error')) return;
    logToConsole({ level: 'error', message, context });
  },

  /**
   * Critical logs (requires immediate attention)
   */
  critical(message: string, context?: LogContext): void {
    if (!shouldLog('critical')) return;
    logToConsole({ level: 'critical', message, context });

    // In production, you might want to send to PagerDuty/Slack here
    if (IS_PRODUCTION) {
      // TODO: Integrate with alerting service
      // Example: sendToSlack(message, context);
    }
  },

  /**
   * Security event logs (always logged, even in production)
   */
  security(event: string, context?: LogContext): void {
    // Security events always logged regardless of level
    const formatted = formatLog({
      level: 'critical',
      message: `[SECURITY] ${event}`,
      context: {
        ...context,
        securityEvent: true,
      },
    });

    console.error(formatted);

    // TODO: Send to security monitoring service
    // Example: sendToSIEM(event, context);
  },
};

// =============================================================================
// Security Event Helpers
// =============================================================================

/**
 * Log unauthorized access attempt
 */
export function logUnauthorizedAccess(context: {
  userId?: string;
  endpoint: string;
  method: string;
  targetResource?: string;
}): void {
  logger.security('Unauthorized access attempt', {
    ...context,
    userId: sanitizeUserId(context.userId),
  });
}

/**
 * Log authentication failure
 */
export function logAuthFailure(context: {
  endpoint: string;
  reason: string;
  userId?: string;
}): void {
  logger.security('Authentication failure', {
    ...context,
    userId: sanitizeUserId(context.userId),
  });
}

/**
 * Log rate limit violation
 */
export function logRateLimitViolation(context: {
  userId?: string;
  endpoint: string;
  limit: number;
  current: number;
}): void {
  logger.security('Rate limit violation', {
    ...context,
    userId: sanitizeUserId(context.userId),
  });
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(context: {
  userId?: string;
  activity: string;
  details?: unknown;
}): void {
  logger.security('Suspicious activity detected', {
    ...context,
    userId: sanitizeUserId(context.userId),
    details: sanitizeObject(context.details),
  });
}

// =============================================================================
// Exports
// =============================================================================

export default logger;
