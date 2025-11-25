/**
 * Subscription Types
 *
 * TypeScript types for the Subscription table in Supabase.
 * Used by both server and client subscription helpers.
 */

export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'expired' | string;

export interface Subscription {
  id: string;
  userId: string;
  provider: string | null;
  status: SubscriptionStatus;
  plan: string | null;
  currentPeriodEnd: string | null;
}

/**
 * Raw subscription row from Supabase (snake_case column names)
 */
export interface SubscriptionRow {
  id: string;
  userId: string;
  provider: string | null;
  status: string;
  plan: string | null;
  current_period_end?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Map raw Supabase row to Subscription type
 */
export function mapRowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider ?? null,
    status: row.status as SubscriptionStatus,
    plan: row.plan ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
  };
}
