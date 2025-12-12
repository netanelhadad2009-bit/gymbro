-- Add health_score column to meals table for AI vision analyzed meals
ALTER TABLE meals ADD COLUMN IF NOT EXISTS health_score integer;

-- Add comment explaining the column
COMMENT ON COLUMN meals.health_score IS 'Health score from 0-100, returned by AI vision analysis';
