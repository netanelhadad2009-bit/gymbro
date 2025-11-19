/**
 * Centralized Environment Variable Management
 *
 * Purpose:
 * - Type-safe access to environment variables
 * - Runtime validation with Zod
 * - Prevents accidental server secret exposure to client
 * - Single source of truth for all env vars
 *
 * Usage:
 * - Server-side: import { serverEnv } from '@/lib/env'
 * - Client-side: import { clientEnv } from '@/lib/env'
 */

import { z } from 'zod';

// =============================================================================
// SERVER-ONLY ENVIRONMENT VARIABLES
// =============================================================================
// These must NEVER be accessed from client components
// They contain sensitive secrets that bypass security (RLS, rate limits, etc.)

const serverEnvSchema = z.object({
  // Supabase Admin (bypasses RLS - CRITICAL)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required for server operations'),

  // OpenAI (AI features)
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required for AI features'),

  // Web Push Notifications (server-side)
  VAPID_PRIVATE_KEY: z.string().min(1, 'VAPID_PRIVATE_KEY is required for push notifications'),
  VAPID_SUBJECT: z.string().email().or(z.string().startsWith('mailto:')).optional().default('mailto:support@fitjourney.app'),

  // Optional: Model selection for AI
  OPENAI_MODEL_NUTRITION: z.string().optional().default('gpt-4o-mini'),
  OPENAI_MODEL_WORKOUT: z.string().optional().default('gpt-4o-mini'),
  OPENAI_VISION_MODEL: z.string().optional().default('gpt-4o'),

  // Optional: Custom API base URL
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
});

// =============================================================================
// CLIENT-SIDE ENVIRONMENT VARIABLES
// =============================================================================
// These are safe to expose in the browser (prefixed with NEXT_PUBLIC_)
// They should NOT contain sensitive secrets

const clientEnvSchema = z.object({
  // Supabase Public (respects RLS - safe for client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Web Push Notifications (client-side)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1, 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is required for push subscriptions'),

  // Optional: Feature flags
  NEXT_PUBLIC_COACH_COMPOSER_ENABLED: z.string().optional(),

  // Optional: App URL
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

function validateServerEnv() {
  // Prevent accidental server env access in browser
  if (typeof window !== 'undefined') {
    throw new Error(
      '🚨 SECURITY ERROR: Attempted to access server environment variables from client-side code. ' +
      'Use clientEnv instead, or move this code to a server component/API route.'
    );
  }

  try {
    return serverEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e: z.ZodIssue) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(
        `❌ Server environment validation failed:\n${missingVars}\n\n` +
        `💡 Check your .env.local file and ensure all required variables are set.`
      );
    }
    throw error;
  }
}

function validateClientEnv() {
  // Build client env object from process.env
  // (Next.js only exposes NEXT_PUBLIC_* to the client automatically)
  const clientEnvValues = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    NEXT_PUBLIC_COACH_COMPOSER_ENABLED: process.env.NEXT_PUBLIC_COACH_COMPOSER_ENABLED,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  try {
    return clientEnvSchema.parse(clientEnvValues);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e: z.ZodIssue) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(
        `❌ Client environment validation failed:\n${missingVars}\n\n` +
        `💡 Check your .env.local file and ensure all NEXT_PUBLIC_* variables are set.`
      );
    }
    throw error;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Server-side environment variables (validated)
 *
 * ⚠️  ONLY use in:
 * - API routes (app/api/**)
 * - Server components
 * - Server actions
 * - Scripts
 *
 * ❌ DO NOT use in:
 * - Client components
 * - Browser-side code
 */
export const serverEnv = validateServerEnv();

/**
 * Client-side environment variables (validated)
 *
 * ✅ Safe to use in:
 * - Client components
 * - Browser-side code
 * - Server components (if needed)
 */
export const clientEnv = validateClientEnv();

/**
 * Type exports for use in other files
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
