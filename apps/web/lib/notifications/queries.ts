/**
 * Notification Database Query Helpers
 * Common queries for cron jobs and notification logic
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get all users who have push enabled and subscriptions
 */
export async function getUsersWithPushEnabled(
  supabase: SupabaseClient
): Promise<string[]> {
  // Get all users with active subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('user_id')
    .eq('active', true);

  if (subError || !subscriptions) {
    console.error('[Queries] Error fetching active subscriptions:', subError);
    return [];
  }

  // Get unique user IDs
  const userIds = [...new Set(subscriptions.map(s => s.user_id))];

  // Filter out users who have push_enabled = false
  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('user_id, push_enabled')
    .in('user_id', userIds);

  if (prefsError) {
    console.error('[Queries] Error fetching preferences:', prefsError);
    return userIds;  // Return all if we can't check prefs
  }

  // Filter out users with push_enabled = false
  const disabledUserIds = new Set(
    prefs?.filter(p => p.push_enabled === false).map(p => p.user_id) || []
  );

  return userIds.filter(id => !disabledUserIds.has(id));
}

/**
 * Get users who haven't met their daily protein target
 * Returns user_id and how much protein they still need
 */
export async function getUsersNeedingProteinReminder(
  supabase: SupabaseClient,
  minRemainingGrams: number = 10
): Promise<Array<{ user_id: string; target: number; current: number; remaining: number }>> {
  const today = new Date().toISOString().split('T')[0];

  // Get all users with nutrition plans
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, nutrition_plan')
    .not('nutrition_plan', 'is', null);

  if (profileError || !profiles) {
    console.error('[Queries] Error fetching profiles:', profileError);
    return [];
  }

  const results = [];

  for (const profile of profiles) {
    const target = profile.nutrition_plan?.dailyTargets?.protein_g;
    if (!target || target <= 0) continue;

    // Sum today's protein from meals
    const { data: meals } = await supabase
      .from('meals')
      .select('protein')
      .eq('user_id', profile.id)
      .eq('date', today);

    const current = meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;
    const remaining = target - current;

    if (remaining >= minRemainingGrams) {
      results.push({
        user_id: profile.id,
        target,
        current,
        remaining
      });
    }
  }

  return results;
}

/**
 * Get users who are below 50% of their protein target at midday
 */
export async function getUsersBelowMiddayProteinTarget(
  supabase: SupabaseClient
): Promise<Array<{ user_id: string; target: number; current: number; remaining: number }>> {
  const today = new Date().toISOString().split('T')[0];

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, nutrition_plan')
    .not('nutrition_plan', 'is', null);

  if (error || !profiles) {
    console.error('[Queries] Error fetching profiles:', error);
    return [];
  }

  const results = [];

  for (const profile of profiles) {
    const target = profile.nutrition_plan?.dailyTargets?.protein_g;
    if (!target || target <= 0) continue;

    const { data: meals } = await supabase
      .from('meals')
      .select('protein')
      .eq('user_id', profile.id)
      .eq('date', today);

    const current = meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;
    const percentAchieved = (current / target) * 100;

    // If less than 50% of target achieved
    if (percentAchieved < 50) {
      results.push({
        user_id: profile.id,
        target,
        current,
        remaining: target - current
      });
    }
  }

  return results;
}

/**
 * Get inactive users (no activity for X days)
 * Checks: meals, weigh-ins, user_activity table
 */
export async function getInactiveUsers(
  supabase: SupabaseClient,
  inactiveDays: number = 3
): Promise<Array<{ user_id: string; days_since_activity: number }>> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
  const cutoffISO = cutoffDate.toISOString();

  // Get all users with subscriptions
  const allUserIds = await getUsersWithPushEnabled(supabase);
  const results = [];

  for (const userId of allUserIds) {
    // Check for recent meals
    const { data: recentMeals } = await supabase
      .from('meals')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoffISO)
      .limit(1);

    if (recentMeals && recentMeals.length > 0) {
      continue;  // User is active
    }

    // Check for recent weigh-ins
    const { data: recentWeighIns } = await supabase
      .from('weigh_ins')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoffISO)
      .limit(1);

    if (recentWeighIns && recentWeighIns.length > 0) {
      continue;  // User is active
    }

    // Check user_activity table
    const { data: recentActivity } = await supabase
      .from('user_activity')
      .select('d')
      .eq('user_id', userId)
      .gte('d', cutoffDate.toISOString().split('T')[0])
      .limit(1);

    if (recentActivity && recentActivity.length > 0) {
      continue;  // User is active
    }

    // User is inactive - calculate days since last activity
    const { data: lastActivity } = await supabase
      .from('user_activity')
      .select('d')
      .eq('user_id', userId)
      .order('d', { ascending: false })
      .limit(1);

    let daysSince = inactiveDays;
    if (lastActivity && lastActivity.length > 0) {
      const lastDate = new Date(lastActivity[0].d);
      const today = new Date();
      daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    results.push({
      user_id: userId,
      days_since_activity: daysSince
    });
  }

  return results;
}

/**
 * Get users with active streaks at milestone days (3, 7, 14, 30)
 * Returns users who just hit these milestones today
 */
export async function getUsersAtStreakMilestone(
  supabase: SupabaseClient,
  milestones: number[] = [3, 7, 14, 30]
): Promise<Array<{ user_id: string; streak_days: number }>> {
  const { data: streaks, error } = await supabase
    .from('user_streaks')
    .select('user_id, current_streak')
    .in('current_streak', milestones);

  if (error || !streaks) {
    console.error('[Queries] Error fetching streaks:', error);
    return [];
  }

  return streaks.map(s => ({
    user_id: s.user_id,
    streak_days: s.current_streak
  }));
}

/**
 * Get users who completed a stage recently (in the last X hours)
 * Used to trigger stage completion notifications
 */
export async function getRecentStageCompletions(
  supabase: SupabaseClient,
  hoursAgo: number = 1
): Promise<Array<{ user_id: string; stage_name: string; completed_at: string }>> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);
  const cutoffISO = cutoffDate.toISOString();

  // Check user_progress table for recent completions
  const { data: completions, error } = await supabase
    .from('user_progress')
    .select(`
      user_id,
      completed_at,
      journey_nodes!inner(
        title
      )
    `)
    .eq('state', 'COMPLETED')
    .gte('completed_at', cutoffISO)
    .not('completed_at', 'is', null);

  if (error) {
    console.error('[Queries] Error fetching stage completions:', error);
    return [];
  }

  if (!completions) return [];

  return completions.map(c => ({
    user_id: c.user_id,
    stage_name: (c.journey_nodes as any)?.title || 'שלב חדש',
    completed_at: c.completed_at!
  }));
}

/**
 * Get users stuck on current stage (no progress for X days)
 */
export async function getUsersStuckOnStage(
  supabase: SupabaseClient,
  daysStuck: number = 2
): Promise<Array<{ user_id: string; days_since_progress: number }>> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysStuck);
  const cutoffISO = cutoffDate.toISOString();

  // Get all users with active (non-completed) nodes
  const { data: activeNodes, error } = await supabase
    .from('user_progress')
    .select('user_id, completed_at')
    .in('state', ['ACTIVE', 'AVAILABLE'])
    .order('completed_at', { ascending: false });

  if (error || !activeNodes) {
    console.error('[Queries] Error fetching active nodes:', error);
    return [];
  }

  // Group by user and find last completion date
  const userLastProgress = new Map<string, Date | null>();

  for (const node of activeNodes) {
    const userId = node.user_id;
    if (!userLastProgress.has(userId)) {
      userLastProgress.set(userId, node.completed_at ? new Date(node.completed_at) : null);
    }
  }

  const results = [];
  const now = new Date();

  for (const [userId, lastDate] of userLastProgress.entries()) {
    if (!lastDate) {
      // Never completed anything - could be a new user, skip
      continue;
    }

    if (lastDate < cutoffDate) {
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      results.push({
        user_id: userId,
        days_since_progress: daysSince
      });
    }
  }

  return results;
}

/**
 * Get users who haven't logged any meals today
 * Useful for meal reminder cron
 */
export async function getUsersWithNoMealsToday(
  supabase: SupabaseClient
): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0];

  // Get all users with push enabled
  const allUserIds = await getUsersWithPushEnabled(supabase);

  const usersWithNoMeals = [];

  for (const userId of allUserIds) {
    const { data: meals } = await supabase
      .from('meals')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1);

    if (!meals || meals.length === 0) {
      usersWithNoMeals.push(userId);
    }
  }

  return usersWithNoMeals;
}

/**
 * Get users who should receive weekly weigh-in reminder
 * Based on their preferred day (default: Friday = 5)
 */
export async function getUsersForWeighInReminder(
  supabase: SupabaseClient,
  currentDayOfWeek: number  // 0 = Sunday, 5 = Friday, 6 = Saturday
): Promise<string[]> {
  const { data: prefs, error } = await supabase
    .from('notification_preferences')
    .select('user_id, weigh_in_reminders, weigh_in_reminder_day')
    .eq('weigh_in_reminders', true);

  if (error || !prefs) {
    console.error('[Queries] Error fetching weigh-in preferences:', error);
    return [];
  }

  // Filter users whose preferred day matches today
  return prefs
    .filter(p => (p.weigh_in_reminder_day ?? 5) === currentDayOfWeek)
    .map(p => p.user_id);
}
