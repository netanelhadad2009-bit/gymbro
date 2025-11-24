-- Add unlocked_at timestamp to user_stages
-- This tracks when each stage was unlocked so we can filter task progress
-- to only count data from after the stage started

BEGIN;

-- Add unlocked_at column
ALTER TABLE user_stages
ADD COLUMN IF NOT EXISTS unlocked_at timestamptz;

-- Backfill: For stages that are already unlocked, set unlocked_at to created_at
-- (This assumes they were unlocked at creation, which is true for the first stage)
UPDATE user_stages
SET unlocked_at = created_at
WHERE is_unlocked = true
  AND unlocked_at IS NULL;

-- Add comment
COMMENT ON COLUMN user_stages.unlocked_at IS 'Timestamp when this stage was unlocked. Used to filter task progress to only count data from after stage start.';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_stages_unlocked_at
ON user_stages(unlocked_at);

COMMIT;
