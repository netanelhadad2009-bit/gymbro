-- Add profile snapshot to AI messages for profile-aware coaching
-- This allows the AI coach to reference the user's profile at the time of each message

-- Add profile_snapshot column to store user profile data
ALTER TABLE public.ai_messages
ADD COLUMN IF NOT EXISTS profile_snapshot jsonb;

-- Add index for efficient querying by user and time
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_created
ON public.ai_messages (user_id, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN public.ai_messages.profile_snapshot IS 'Snapshot of user profile at time of message (age, gender, weight, goals, diet, injuries, etc.)';
