-- ============================================================================
-- GymBro AI Coach Migration
-- ============================================================================
-- Convert from human coach to AI-powered coach for all users
-- Removes coach assignment logic and creates simple AI message history table

-- Drop old coach tables (cascade to clean up all dependencies)
DROP TABLE IF EXISTS public.coach_messages CASCADE;
DROP TABLE IF EXISTS public.coach_clients CASCADE;
DROP TABLE IF EXISTS public.coaches CASCADE;
DROP TABLE IF EXISTS public.coach_requests CASCADE;

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS public.get_or_create_dev_coach(uuid);
DROP FUNCTION IF EXISTS public.mark_messages_read(uuid, uuid);

-- Create AI messages table
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Create index for fast user message lookups
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_id ON public.ai_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON public.ai_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own AI messages"
  ON public.ai_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI messages"
  ON public.ai_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for AI messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.ai_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
