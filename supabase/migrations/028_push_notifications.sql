-- Migration: Push Notification System
-- Creates tables for push subscriptions, user preferences, and notification logs
-- No workout-related notifications - focus on nutrition, journey, and engagement

-- ============================================================================
-- 1. Push Subscriptions Table
-- ============================================================================
-- Stores device tokens and web push subscriptions
-- Replaces in-memory Map with persistent database storage

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Device/Platform Info
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id text,  -- Optional: track unique devices for analytics

  -- Token/Subscription Data
  -- For native (iOS/Android): token field contains APNS/FCM token
  -- For web push: endpoint, p256dh, auth fields contain subscription data
  token text,      -- Native push token (APNS/FCM)
  endpoint text,   -- Web push endpoint
  p256dh text,     -- Web push public key
  auth text,       -- Web push auth secret

  -- Metadata
  user_agent text,
  last_used_at timestamptz DEFAULT NOW(),
  active boolean DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Unique constraint: one active subscription per user+platform+endpoint/token
-- Uses COALESCE to handle both native (token) and web (endpoint) subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_unique
ON public.push_subscriptions(user_id, platform, COALESCE(endpoint, token))
WHERE active = true;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(user_id, active)
WHERE active = true;

-- Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Notification Preferences Table
-- ============================================================================
-- Stores per-user notification settings and timing preferences

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Global Settings
  push_enabled boolean DEFAULT true,  -- Master switch for all notifications

  -- Notification Type Toggles
  meal_reminders boolean DEFAULT true,           -- Periodic meal logging reminders
  daily_protein_reminder boolean DEFAULT true,   -- Evening protein target check
  midday_protein_reminder boolean DEFAULT true,  -- Midday protein nudge
  weigh_in_reminders boolean DEFAULT true,       -- Weekly weigh-in prompts
  stage_completion_alerts boolean DEFAULT true,  -- Journey stage unlocks
  journey_nudges boolean DEFAULT true,           -- Stuck on stage nudges
  streak_celebrations boolean DEFAULT true,      -- Streak milestone achievements
  inactivity_nudges boolean DEFAULT true,        -- Re-engagement after absence

  -- Timing Preferences
  -- meal_reminder_times: array of "HH:MM" strings (24-hour format)
  -- Default: breakfast (8am), lunch (1pm), dinner (7pm)
  meal_reminder_times jsonb DEFAULT '["08:00","13:00","19:00"]'::jsonb,

  -- daily_protein_reminder_time: when to check if protein target is met
  daily_protein_reminder_time text DEFAULT '20:00',  -- 8pm

  -- midday_protein_reminder_time: when to nudge if protein is low
  midday_protein_reminder_time text DEFAULT '14:00',  -- 2pm

  -- weigh_in_reminder: day of week (0=Sunday, 5=Friday, 6=Saturday) and time
  weigh_in_reminder_day integer DEFAULT 5 CHECK (weigh_in_reminder_day >= 0 AND weigh_in_reminder_day <= 6),  -- Friday
  weigh_in_reminder_time text DEFAULT '07:00',  -- 7am

  -- inactivity_threshold: days of inactivity before sending re-engagement nudge
  inactivity_threshold_days integer DEFAULT 3 CHECK (inactivity_threshold_days > 0),

  -- Quiet Hours (Do Not Disturb)
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start text DEFAULT '22:00',  -- 10pm
  quiet_hours_end text DEFAULT '08:00',    -- 8am

  -- Timezone (for local time calculations)
  timezone text DEFAULT 'Asia/Jerusalem',

  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- 3. Notification Logs Table
-- ============================================================================
-- Tracks all sent notifications for debugging and preventing spam

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification Content
  type text NOT NULL,  -- 'meal_reminder', 'protein_target', 'stage_complete', etc.
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,  -- Additional payload (route, task_id, etc.)

  -- Delivery Status
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'expired')),
  sent_at timestamptz,
  error_message text,

  -- Engagement Tracking (optional - populated when user interacts)
  opened_at timestamptz,
  action_taken text,  -- 'opened', 'dismissed', 'clicked_action', etc.

  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_type ON public.notification_logs(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC) WHERE sent_at IS NOT NULL;

-- Row Level Security
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification logs" ON public.notification_logs;
CREATE POLICY "Users can view own notification logs"
ON public.notification_logs FOR SELECT
USING (auth.uid() = user_id);

-- Only backend services can insert/update logs
DROP POLICY IF EXISTS "Service role can manage logs" ON public.notification_logs;
CREATE POLICY "Service role can manage logs"
ON public.notification_logs FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to automatically create default preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Realtime Subscriptions (Optional)
-- ============================================================================
-- Enable realtime for push_subscriptions if needed for live UI updates

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.push_subscriptions IS 'Stores push notification tokens and web push subscriptions for all platforms';
COMMENT ON TABLE public.notification_preferences IS 'User-specific notification settings and timing preferences';
COMMENT ON TABLE public.notification_logs IS 'Audit log of all sent notifications for debugging and spam prevention';

COMMENT ON COLUMN public.notification_preferences.meal_reminder_times IS 'Array of HH:MM times when to send meal reminders (e.g., ["08:00","13:00","19:00"])';
COMMENT ON COLUMN public.notification_preferences.inactivity_threshold_days IS 'Days of inactivity before sending re-engagement notification';
COMMENT ON COLUMN public.notification_preferences.timezone IS 'IANA timezone for local time calculations (default: Asia/Jerusalem for Israel)';
