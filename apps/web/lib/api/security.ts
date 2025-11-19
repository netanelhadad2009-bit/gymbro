import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z, ZodSchema } from 'zod';

// ============================================
// RATE LIMITING (In-Memory Implementation)
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; limit: number; remaining: number; resetAt: number }> {
  // Get identifier (IP or user ID from session)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

  // Try to get user ID for authenticated requests
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    // Continue with IP-based limiting
  }

  const identifier = userId || ip;
  const key = `${config.keyPrefix || 'rl'}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // Create new entry
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    limit: config.maxRequests,
    remaining,
    resetAt: entry.resetAt,
  };
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

export interface AuthResult {
  user: any;
  supabase: any;
}

export async function requireAuth(): Promise<
  | { success: true; user: any; supabase: any }
  | { success: false; response: NextResponse }
> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Auth] Authentication failed:', authError?.message || 'No user');
      return {
        success: false,
        response: NextResponse.json(
          { ok: false, error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        ),
      };
    }

    return { success: true, user, supabase };
  } catch (err) {
    console.error('[Auth] Unexpected error:', err);
    return {
      success: false,
      response: NextResponse.json(
        { ok: false, error: 'AuthError', message: 'Authentication failed' },
        { status: 500 }
      ),
    };
  }
}

// Optional auth - returns null user if not authenticated
export async function optionalAuth(): Promise<{
  user: any | null;
  supabase: any;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { user: user || null, supabase };
  } catch {
    const supabase = await createClient();
    return { user: null, supabase };
  }
}

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<
  | { success: true; data: T }
  | { success: false; response: NextResponse }
> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      console.error('[Validation] Invalid request body:', result.error.flatten());
      return {
        success: false,
        response: NextResponse.json(
          {
            ok: false,
            error: 'ValidationError',
            message: 'Invalid request data',
            details: result.error.flatten().fieldErrors,
          },
          { status: 400 }
        ),
      };
    }

    return { success: true, data: result.data };
  } catch (err: any) {
    console.error('[Validation] Failed to parse JSON:', err.message);
    return {
      success: false,
      response: NextResponse.json(
        { ok: false, error: 'InvalidJSON', message: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    };
  }
}

export function validateSearchParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const result = schema.safeParse(params);

    if (!result.success) {
      console.error('[Validation] Invalid query params:', result.error.flatten());
      return {
        success: false,
        response: NextResponse.json(
          {
            ok: false,
            error: 'ValidationError',
            message: 'Invalid query parameters',
            details: result.error.flatten().fieldErrors,
          },
          { status: 400 }
        ),
      };
    }

    return { success: true, data: result.data };
  } catch (err: any) {
    console.error('[Validation] Failed to parse params:', err.message);
    return {
      success: false,
      response: NextResponse.json(
        { ok: false, error: 'InvalidParams', message: 'Invalid query parameters' },
        { status: 400 }
      ),
    };
  }
}

// ============================================
// ENVIRONMENT GUARDS
// ============================================

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function requireDevelopment(request: NextRequest): NextResponse | null {
  if (isProduction()) {
    console.warn('[DevGuard] Debug route accessed in production:', request.url);
    return NextResponse.json(
      { ok: false, error: 'NotFound', message: 'Route not available in production' },
      { status: 404 }
    );
  }
  return null;
}

// ============================================
// CRON SECRET VALIDATION
// ============================================

export function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('[CronAuth] CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${expectedSecret}`;
}

// ============================================
// METHOD VALIDATION
// ============================================

export function validateMethod(
  request: Request,
  allowedMethods: string[]
): NextResponse | null {
  if (!allowedMethods.includes(request.method)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'MethodNotAllowed',
        message: `Method ${request.method} not allowed. Allowed: ${allowedMethods.join(', ')}`
      },
      {
        status: 405,
        headers: {
          'Allow': allowedMethods.join(', ')
        }
      }
    );
  }
  return null;
}

// ============================================
// STANDARDIZED ERROR RESPONSES
// ============================================

export const ErrorResponses = {
  unauthorized: (message = 'Authentication required') => NextResponse.json(
    { ok: false, error: 'Unauthorized', message },
    { status: 401 }
  ),

  forbidden: (message = 'Access denied') => NextResponse.json(
    { ok: false, error: 'Forbidden', message },
    { status: 403 }
  ),

  notFound: (message = 'Resource not found') => NextResponse.json(
    { ok: false, error: 'NotFound', message },
    { status: 404 }
  ),

  badRequest: (message = 'Invalid request', details?: any) => NextResponse.json(
    { ok: false, error: 'BadRequest', message, ...(details && { details }) },
    { status: 400 }
  ),

  conflict: (message = 'Conflict', details?: any) => NextResponse.json(
    { ok: false, error: 'Conflict', message, ...(details && { details }) },
    { status: 409 }
  ),

  rateLimited: (resetAt: number, limit?: number) => {
    // Defensive: handle invalid resetAt values
    const safeResetAt = resetAt && !isNaN(resetAt) ? resetAt : Date.now() + 60000;
    const retryAfterSeconds = Math.ceil(Math.max(0, (safeResetAt - Date.now()) / 1000));

    return NextResponse.json(
      {
        ok: false,
        error: 'RateLimitExceeded',
        message: 'Too many requests',
        retryAfter: retryAfterSeconds,
        limit
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Reset': new Date(safeResetAt).toISOString(),
        }
      }
    );
  },

  serverError: (message = 'Internal server error') => {
    // Never expose internal error details to client
    console.error('[ServerError]', message);
    return NextResponse.json(
      { ok: false, error: 'ServerError', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  },

  methodNotAllowed: (method: string, allowed: string[]) => NextResponse.json(
    {
      ok: false,
      error: 'MethodNotAllowed',
      message: `Method ${method} not allowed`,
      allowed
    },
    {
      status: 405,
      headers: { 'Allow': allowed.join(', ') }
    }
  ),
};

// ============================================
// SAFE ERROR HANDLER
// ============================================

export function handleApiError(err: any, context: string): NextResponse {
  // Log full error internally
  console.error(`[${context}] Error:`, err);

  // Check for known error types
  if (err instanceof z.ZodError) {
    return ErrorResponses.badRequest('Invalid request data', {
      errors: err.issues.map((e: z.ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Supabase auth errors
  if (err?.status === 401 || err?.code === 'PGRST301') {
    return ErrorResponses.unauthorized();
  }

  if (err?.status === 403) {
    return ErrorResponses.forbidden();
  }

  if (err?.status === 404) {
    return ErrorResponses.notFound();
  }

  // Default to generic server error (never expose internals)
  return ErrorResponses.serverError();
}

// ============================================
// REQUEST ID GENERATION
// ============================================

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// LOGGING UTILITIES
// ============================================

export interface ApiLogger {
  info: (message: string, data?: any) => void;
  error: (message: string, error?: any) => void;
  warn: (message: string, data?: any) => void;
}

export function createApiLogger(route: string, requestId: string): ApiLogger {
  const prefix = `[${route}] [${requestId}]`;

  return {
    info: (message: string, data?: any) => {
      console.log(`${prefix} ${message}`, data || '');
    },
    error: (message: string, error?: any) => {
      console.error(`${prefix} ${message}`, error || '');
    },
    warn: (message: string, data?: any) => {
      console.warn(`${prefix} ${message}`, data || '');
    },
  };
}

// ============================================
// RATE LIMIT PRESETS
// ============================================

export const RateLimitPresets = {
  // Expensive AI operations
  ai: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },

  // Standard CRUD operations
  standard: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },

  // Search/lookup operations
  search: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },

  // Authentication attempts
  auth: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },

  // Public endpoints
  public: {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },

  // Strict for sensitive operations
  strict: {
    maxRequests: 3,
    windowMs: 60 * 1000,
  },
};