-- Migration: Avatar System
-- Created: 2025-10-30
-- Description: Implements avatar catalog and user avatar assignment tables with RLS policies

-- =============================================
-- 1. Avatar Catalog Table
-- =============================================
-- Stores the canonical avatar definitions from AVATAR_TAXONOMY.json

CREATE TABLE IF NOT EXISTS avatar_catalog (
  id text PRIMARY KEY,
  title text NOT NULL,
  spec jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE avatar_catalog IS 'Canonical avatar definitions from AVATAR_TAXONOMY.json';
COMMENT ON COLUMN avatar_catalog.id IS 'Avatar ID (e.g., "rookie-cut", "gym-regular-gain")';
COMMENT ON COLUMN avatar_catalog.title IS 'Hebrew title (e.g., "המתחיל בירידה")';
COMMENT ON COLUMN avatar_catalog.spec IS 'Full avatar specification including fit_rules, kpi_focus, etc.';

-- =============================================
-- 2. User Avatar Assignments Table
-- =============================================
-- Tracks which avatar is assigned to each user

CREATE TABLE IF NOT EXISTS user_avatar (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_id text NOT NULL REFERENCES avatar_catalog(id),
  confidence real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  matched_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add comments
COMMENT ON TABLE user_avatar IS 'User-to-avatar assignments with confidence and reasoning';
COMMENT ON COLUMN user_avatar.user_id IS 'Foreign key to auth.users';
COMMENT ON COLUMN user_avatar.avatar_id IS 'Foreign key to avatar_catalog';
COMMENT ON COLUMN user_avatar.confidence IS 'Match confidence score (0-1)';
COMMENT ON COLUMN user_avatar.matched_rules IS 'Array of matched rule strings (e.g., ["goal:loss", "frequency:3"])';
COMMENT ON COLUMN user_avatar.reasons IS 'Array of human-readable reasons in Hebrew';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_avatar_avatar_id ON user_avatar(avatar_id);
CREATE INDEX IF NOT EXISTS idx_user_avatar_updated_at ON user_avatar(updated_at DESC);

-- =============================================
-- 3. Row-Level Security (RLS) Policies
-- =============================================

-- Enable RLS on both tables
ALTER TABLE avatar_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_avatar ENABLE ROW LEVEL SECURITY;

-- Avatar Catalog Policies
-- Anyone can read the avatar catalog (it's public data)
DROP POLICY IF EXISTS "Anyone can read avatar catalog" ON avatar_catalog;
CREATE POLICY "Anyone can read avatar catalog"
  ON avatar_catalog
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete avatars
DROP POLICY IF EXISTS "Service role can manage avatar catalog" ON avatar_catalog;
CREATE POLICY "Service role can manage avatar catalog"
  ON avatar_catalog
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- User Avatar Policies
-- Users can read their own avatar assignment
DROP POLICY IF EXISTS "Users can read own avatar" ON user_avatar;
CREATE POLICY "Users can read own avatar"
  ON user_avatar
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all avatar assignments
DROP POLICY IF EXISTS "Service role can manage user avatars" ON user_avatar;
CREATE POLICY "Service role can manage user avatars"
  ON user_avatar
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can insert/update their own avatar
DROP POLICY IF EXISTS "Users can insert own avatar" ON user_avatar;
CREATE POLICY "Users can insert own avatar"
  ON user_avatar
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own avatar" ON user_avatar;
CREATE POLICY "Users can update own avatar"
  ON user_avatar
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 4. Trigger for updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_avatar_catalog_updated_at ON avatar_catalog;
CREATE TRIGGER update_avatar_catalog_updated_at
  BEFORE UPDATE ON avatar_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_avatar_updated_at ON user_avatar;
CREATE TRIGGER update_user_avatar_updated_at
  BEFORE UPDATE ON user_avatar
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. Seed Avatar Catalog
-- =============================================
-- Insert canonical avatars from AVATAR_TAXONOMY.json

INSERT INTO avatar_catalog (id, title, spec) VALUES
(
  'rookie-cut',
  'המתחיל בירידה',
  '{
    "tagline": "התחלה חדשה לשינוי",
    "profile_badge": "🌱",
    "color_token": "#4CAF50",
    "who_is_it_for": ["מתחילים באימונים", "מעוניינים בירידה במשקל", "מתאמנים 2-3 פעמים בשבוע"],
    "fit_rules": {"goal": ["loss"], "frequency": [2, 3], "experience": ["never", "time", "sure"]},
    "kpi_focus": ["weight", "workouts", "streak"],
    "training_split_hint": "3x full-body beginner",
    "nutrition_pattern_hint": "moderate deficit (~300-500 kcal), high protein (1.6g/kg), focus on habit building",
    "tone_of_voice": "supportive, educational, encouraging"
  }'::jsonb
),
(
  'rookie-gain',
  'המתחיל בעלייה',
  '{
    "tagline": "בונים בסיס חזק",
    "profile_badge": "💪",
    "color_token": "#2196F3",
    "who_is_it_for": ["מתחילים באימונים", "מעוניינים בהעלאת מסת שריר", "מתאמנים 2-3 פעמים בשבוע"],
    "fit_rules": {"goal": ["gain"], "frequency": [2, 3], "experience": ["never", "time", "sure"]},
    "kpi_focus": ["weight", "strength", "workouts"],
    "training_split_hint": "3x full-body compound focus",
    "nutrition_pattern_hint": "modest surplus (~300 kcal), high protein (1.8g/kg), whole foods emphasis",
    "tone_of_voice": "supportive, educational, motivating"
  }'::jsonb
),
(
  'busy-3day-cut',
  'העסוק בירידה',
  '{
    "tagline": "תוצאות בזמן מינימלי",
    "profile_badge": "⚡",
    "color_token": "#FF9800",
    "who_is_it_for": ["מתאמנים עם זמן מוגבל", "מעוניינים בירידה במשקל", "מתאמנים 3 פעמים בשבוע"],
    "fit_rules": {"goal": ["loss"], "frequency": [3], "experience": ["time", "results", "knowledge"]},
    "kpi_focus": ["weight", "efficiency", "adherence"],
    "training_split_hint": "3x efficient full-body, 45min sessions",
    "nutrition_pattern_hint": "moderate deficit (~400-500 kcal), meal prep friendly, simple tracking",
    "tone_of_voice": "efficient, practical, results-focused"
  }'::jsonb
),
(
  'busy-3day-gain',
  'העסוק בעלייה',
  '{
    "tagline": "מקסימום תוצאות במינימום זמן",
    "profile_badge": "🚀",
    "color_token": "#9C27B0",
    "who_is_it_for": ["מתאמנים עם זמן מוגבל", "מעוניינים בהעלאת מסה", "מתאמנים 3 פעמים בשבוע"],
    "fit_rules": {"goal": ["gain"], "frequency": [3], "experience": ["time", "results", "knowledge"]},
    "kpi_focus": ["strength", "weight", "efficiency"],
    "training_split_hint": "3x upper/lower split, compound-focused",
    "nutrition_pattern_hint": "moderate surplus (~350-400 kcal), nutrient-dense convenience foods ok",
    "tone_of_voice": "efficient, practical, motivating"
  }'::jsonb
),
(
  'gym-regular-cut',
  'הקבוע בירידה',
  '{
    "tagline": "מסור למטרה",
    "profile_badge": "🔥",
    "color_token": "#F44336",
    "who_is_it_for": ["מתאמנים 4-5 פעמים בשבוע", "מעוניינים בירידה במשקל", "יש ניסיון אימונים קודם"],
    "fit_rules": {"goal": ["loss"], "frequency": [4, 5], "experience": ["results", "knowledge"]},
    "kpi_focus": ["weight", "body_composition", "strength_retention"],
    "training_split_hint": "4-5x upper/lower or push/pull/legs",
    "nutrition_pattern_hint": "moderate to aggressive deficit (~500-600 kcal), protein emphasized (2g/kg), carb cycling optional",
    "tone_of_voice": "motivating, analytical, performance-focused"
  }'::jsonb
),
(
  'gym-regular-gain',
  'הקבוע בעלייה',
  '{
    "tagline": "בונה גוף חלומות",
    "profile_badge": "💎",
    "color_token": "#3F51B5",
    "who_is_it_for": ["מתאמנים 4-5 פעמים בשבוע", "מעוניינים בהעלאת מסה", "יש ניסיון אימונים קודם"],
    "fit_rules": {"goal": ["gain"], "frequency": [4, 5], "experience": ["results", "knowledge"]},
    "kpi_focus": ["weight", "strength", "volume"],
    "training_split_hint": "4-5x push/pull/legs or upper/lower",
    "nutrition_pattern_hint": "controlled surplus (~400-500 kcal), high protein (2g/kg), timing emphasized",
    "tone_of_voice": "motivating, analytical, performance-focused"
  }'::jsonb
),
(
  'athlete-cut',
  'הספורטאי בחיתוך',
  '{
    "tagline": "מתקדם ומחויב",
    "profile_badge": "🏆",
    "color_token": "#FF5722",
    "who_is_it_for": ["מתאמנים 5-6 פעמים בשבוע", "יש ניסיון רב באימונים", "מטרה להגיע לבניית גוף/אתלטיות גבוהה"],
    "fit_rules": {"goal": ["loss"], "frequency": [5, 6], "experience": ["knowledge", "results"]},
    "kpi_focus": ["body_fat", "strength", "conditioning"],
    "training_split_hint": "5-6x body-part split or push/pull/legs + accessories",
    "nutrition_pattern_hint": "periodized deficit, macro cycling, supplement protocol",
    "tone_of_voice": "technical, performance-driven, competitive"
  }'::jsonb
),
(
  'athlete-gain',
  'הספורטאי בבנייה',
  '{
    "tagline": "בניית מסה ברמה גבוהה",
    "profile_badge": "🦁",
    "color_token": "#00BCD4",
    "who_is_it_for": ["מתאמנים 5-6 פעמים בשבוע", "יש ניסיון רב באימונים", "מטרה להגיע לרמה תחרותית"],
    "fit_rules": {"goal": ["gain"], "frequency": [5, 6], "experience": ["knowledge", "results"]},
    "kpi_focus": ["weight", "strength", "volume", "recovery"],
    "training_split_hint": "5-6x body-part split, high volume progressive overload",
    "nutrition_pattern_hint": "aggressive surplus (~500-600 kcal), periodized macros, meal timing critical",
    "tone_of_voice": "technical, performance-driven, competitive"
  }'::jsonb
),
(
  'plant-powered-cut',
  'הצמחוני בירידה',
  '{
    "tagline": "בריא וצמחי",
    "profile_badge": "🌿",
    "color_token": "#8BC34A",
    "who_is_it_for": ["טבעוניים/צמחוניים", "מעוניינים בירידה במשקל", "מתאמנים בכל תדירות"],
    "fit_rules": {"goal": ["loss"], "diet": ["vegan", "vegetarian"], "frequency": [2, 3, 4, 5, 6]},
    "kpi_focus": ["weight", "nutrition_variety", "protein_intake"],
    "training_split_hint": "flexible based on frequency",
    "nutrition_pattern_hint": "deficit with plant protein emphasis (tofu, tempeh, legumes), B12 supplementation, complete amino acid sources",
    "tone_of_voice": "health-conscious, ethical, supportive"
  }'::jsonb
),
(
  'plant-powered-gain',
  'הצמחוני בעלייה',
  '{
    "tagline": "בונים שריר צמחי",
    "profile_badge": "🥬",
    "color_token": "#689F38",
    "who_is_it_for": ["טבעוניים/צמחוניים", "מעוניינים בהעלאת מסה", "מתאמנים בכל תדירות"],
    "fit_rules": {"goal": ["gain"], "diet": ["vegan", "vegetarian"], "frequency": [2, 3, 4, 5, 6]},
    "kpi_focus": ["weight", "strength", "protein_intake"],
    "training_split_hint": "flexible based on frequency",
    "nutrition_pattern_hint": "surplus with diverse plant proteins, leucine-rich sources emphasized, creatine supplementation recommended",
    "tone_of_voice": "health-conscious, ethical, supportive"
  }'::jsonb
),
(
  'recomp-balanced',
  'השיפור המאוזן',
  '{
    "tagline": "שיפור הרכב הגוף",
    "profile_badge": "⚖️",
    "color_token": "#607D8B",
    "who_is_it_for": ["מעוניינים בשיפור הרכב גוף", "שמירה על משקל יחסית קבוע", "מתאמנים 3-5 פעמים בשבוע"],
    "fit_rules": {"goal": ["recomp"], "frequency": [3, 4, 5], "experience": ["results", "knowledge"]},
    "kpi_focus": ["strength", "body_composition", "consistency"],
    "training_split_hint": "3-5x progressive resistance training",
    "nutrition_pattern_hint": "maintenance calories, high protein (2g/kg), nutrient timing around training",
    "tone_of_voice": "patient, analytical, sustainable"
  }'::jsonb
),
(
  'comeback-cut',
  'החוזר בירידה',
  '{
    "tagline": "חזרה לכושר עם ניסיון",
    "profile_badge": "🔄",
    "color_token": "#795548",
    "who_is_it_for": ["היה ניסיון קודם אך הפסקה ממושכת", "מעוניינים בירידה במשקל", "מתאמנים 2-4 פעמים בשבוע"],
    "fit_rules": {"goal": ["loss"], "frequency": [2, 3, 4], "experience": ["never", "results"]},
    "kpi_focus": ["consistency", "weight", "muscle_memory"],
    "training_split_hint": "progressive return to volume, 2-4x full-body or upper/lower",
    "nutrition_pattern_hint": "moderate deficit (~400 kcal), muscle preservation focus, gradual calorie adjustment",
    "tone_of_voice": "understanding, encouraging, realistic"
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  spec = EXCLUDED.spec,
  updated_at = now();

-- =============================================
-- 6. Helper Functions
-- =============================================

-- Function to get user's current avatar with full details
CREATE OR REPLACE FUNCTION get_user_avatar_details(p_user_id uuid)
RETURNS TABLE (
  avatar_id text,
  title text,
  spec jsonb,
  confidence real,
  matched_rules jsonb,
  reasons jsonb,
  assigned_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ua.avatar_id,
    ac.title,
    ac.spec,
    ua.confidence,
    ua.matched_rules,
    ua.reasons,
    ua.created_at as assigned_at
  FROM user_avatar ua
  JOIN avatar_catalog ac ON ua.avatar_id = ac.id
  WHERE ua.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_avatar_details(uuid) TO authenticated;

COMMENT ON FUNCTION get_user_avatar_details IS 'Get user avatar with full catalog details';

-- =============================================
-- Migration Complete
-- =============================================

-- Verify seed data
DO $$
BEGIN
  RAISE NOTICE 'Avatar system migration complete. Seeded % avatars.',
    (SELECT COUNT(*) FROM avatar_catalog);
END $$;
