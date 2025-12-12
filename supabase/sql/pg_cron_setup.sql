-- pg_cron Setup for FitJourney
-- Run this in the Supabase SQL Editor after enabling pg_cron extension

-- Enable pg_cron extension (requires Supabase Pro plan or higher)
-- This may already be enabled - check in Dashboard > Database > Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP calls from cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================
-- CRON JOB 1: Reset Streaks Daily
-- Runs at midnight Israel time (22:00 UTC)
-- ============================================
SELECT cron.schedule(
  'reset-streaks-daily',
  '0 22 * * *',
  $$
  -- Reset streaks for users who haven't checked in
  UPDATE profiles
  SET
    current_streak = 0,
    streak_updated_at = NOW()
  WHERE
    streak_updated_at < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date - INTERVAL '1 day'
    AND current_streak > 0;

  -- Log the reset for debugging
  INSERT INTO cron_logs (job_name, executed_at, affected_rows)
  SELECT 'reset-streaks-daily', NOW(), COUNT(*)
  FROM profiles
  WHERE streak_updated_at >= NOW() - INTERVAL '1 minute';
  $$
);

-- ============================================
-- CRON JOB 2: Expire Trial Subscriptions
-- Runs daily at 00:00 UTC
-- ============================================
SELECT cron.schedule(
  'expire-trial-subscriptions',
  '0 0 * * *',
  $$
  UPDATE subscriptions
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE
    status = 'trial'
    AND trial_end_date < NOW();
  $$
);

-- ============================================
-- CRON JOB 3: Send Daily Reminders (via Edge Function)
-- Runs at 8:00 AM Israel time (6:00 UTC)
-- ============================================
SELECT cron.schedule(
  'send-daily-reminders',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-daily-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================
-- CRON JOB 4: Clean Up Old Push Tokens
-- Runs weekly on Sunday at 3:00 AM UTC
-- ============================================
SELECT cron.schedule(
  'cleanup-old-push-tokens',
  '0 3 * * 0',
  $$
  -- Deactivate push tokens not used in 60 days
  UPDATE push_subscriptions
  SET
    active = false,
    updated_at = NOW()
  WHERE
    active = true
    AND last_used_at < NOW() - INTERVAL '60 days';
  $$
);

-- ============================================
-- CRON JOB 5: Update User Activity Stats
-- Runs every hour
-- ============================================
SELECT cron.schedule(
  'update-activity-stats',
  '0 * * * *',
  $$
  -- Update last_active_at for users with recent activity
  UPDATE profiles p
  SET last_active_at = NOW()
  FROM (
    SELECT DISTINCT user_id
    FROM workout_logs
    WHERE created_at > NOW() - INTERVAL '1 hour'
  ) recent
  WHERE p.id = recent.user_id;
  $$
);

-- ============================================
-- Helper: View scheduled jobs
-- ============================================
-- SELECT * FROM cron.job;

-- ============================================
-- Helper: View job run history
-- ============================================
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- ============================================
-- Helper: Unschedule a job
-- ============================================
-- SELECT cron.unschedule('job-name');

-- ============================================
-- Create cron_logs table for debugging
-- ============================================
CREATE TABLE IF NOT EXISTS cron_logs (
  id SERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  affected_rows INTEGER,
  error_message TEXT
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_name ON cron_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_logs_executed_at ON cron_logs(executed_at DESC);
