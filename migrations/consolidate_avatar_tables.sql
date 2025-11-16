-- ============================================
-- MIGRATION: Consolidate Avatar Tables
-- Date: 2025-11-06
-- Purpose: Merge user_avatar into avatars table
-- ============================================

BEGIN;

-- Step 1: Add new columns to avatars table
ALTER TABLE avatars
  ADD COLUMN IF NOT EXISTS avatar_id TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS matched_rules TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reasons TEXT[] DEFAULT '{}';

COMMENT ON COLUMN avatars.avatar_id IS 'Resolved avatar ID from taxonomy (e.g., "rookie-cut", "athlete-gain")';
COMMENT ON COLUMN avatars.confidence IS 'Confidence score (0-1) from avatar resolution algorithm';
COMMENT ON COLUMN avatars.matched_rules IS 'Array of matched rules (e.g., ["goal:loss", "frequency:3"])';
COMMENT ON COLUMN avatars.reasons IS 'Array of Hebrew reasons why this avatar was chosen';

-- Step 2: Migrate data from user_avatar if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_avatar') THEN
    -- Migrate data
    UPDATE avatars a
    SET
      avatar_id = ua.avatar_id,
      confidence = ua.confidence,
      matched_rules = ua.matched_rules,
      reasons = ua.reasons,
      updated_at = COALESCE(ua.updated_at, NOW())
    FROM user_avatar ua
    WHERE a.user_id = ua.user_id;

    -- Log migration stats
    RAISE NOTICE 'Migrated % rows from user_avatar to avatars',
      (SELECT COUNT(*) FROM user_avatar);
  ELSE
    RAISE NOTICE 'user_avatar table does not exist - skipping migration';
  END IF;
END $$;

-- Step 3: Create index for avatar_id lookups
CREATE INDEX IF NOT EXISTS idx_avatars_avatar_id ON avatars(avatar_id);

-- Step 4: Verify migration
DO $$
DECLARE
  total_count INTEGER;
  with_avatar_id INTEGER;
  without_avatar_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM avatars;
  SELECT COUNT(*) INTO with_avatar_id FROM avatars WHERE avatar_id IS NOT NULL;
  SELECT COUNT(*) INTO without_avatar_id FROM avatars WHERE avatar_id IS NULL;

  RAISE NOTICE '=== Migration Verification ===';
  RAISE NOTICE 'Total avatars: %', total_count;
  RAISE NOTICE 'With avatar_id: %', with_avatar_id;
  RAISE NOTICE 'Without avatar_id: %', without_avatar_id;

  IF without_avatar_id > 0 THEN
    RAISE WARNING 'Some users do not have avatar_id - they will be resolved on next login';
  END IF;
END $$;

COMMIT;

-- ============================================
-- Post-Migration: Drop old table (OPTIONAL)
-- ============================================
-- IMPORTANT: Only run this after verifying the migration was successful
-- and monitoring production for 7+ days

-- BEGIN;
-- DROP TABLE IF EXISTS user_avatar CASCADE;
-- RAISE NOTICE 'Dropped user_avatar table';
-- COMMIT;

-- ============================================
-- Verification Queries
-- ============================================

-- Check sample migrated data
SELECT
  user_id,
  gender,
  goal,
  diet,
  frequency,
  experience,
  avatar_id,
  ROUND(confidence::numeric, 2) as confidence,
  array_length(matched_rules, 1) as rules_count,
  array_length(reasons, 1) as reasons_count,
  created_at,
  updated_at
FROM avatars
WHERE avatar_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- Count distribution by avatar type
SELECT
  avatar_id,
  COUNT(*) as user_count,
  ROUND(AVG(confidence)::numeric, 2) as avg_confidence
FROM avatars
WHERE avatar_id IS NOT NULL
GROUP BY avatar_id
ORDER BY user_count DESC;

-- Check for any missing avatar_ids
SELECT
  COUNT(*) as users_without_avatar,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_users
FROM avatars
WHERE avatar_id IS NULL;
