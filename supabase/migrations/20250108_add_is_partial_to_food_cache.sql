-- Add is_partial column to food_cache table
-- This column indicates if nutrition data is incomplete

ALTER TABLE food_cache
ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN food_cache.is_partial IS 'Indicates if the product has incomplete nutrition data';

-- Update existing records to mark them as complete
UPDATE food_cache
SET is_partial = false
WHERE is_partial IS NULL;