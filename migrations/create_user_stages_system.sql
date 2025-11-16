-- ============================================
-- MIGRATION: Linear Stage System
-- Date: 2025-11-06
-- Purpose: Create user_stages and user_stage_tasks tables
-- ============================================

BEGIN;

-- 1) Per-user stages table
CREATE TABLE IF NOT EXISTS user_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_index INT NOT NULL CHECK (stage_index >= 1),
  code TEXT NOT NULL,                  -- e.g., 'FOUNDATION', 'MOMENTUM', 'OPTIMIZE'
  title_he TEXT NOT NULL,
  subtitle_he TEXT,
  color_hex TEXT NOT NULL DEFAULT '#E2F163',
  is_unlocked BOOLEAN NOT NULL DEFAULT false,  -- only stage 1 starts unlocked
  is_completed BOOLEAN NOT NULL DEFAULT false, -- computed & persisted on completion
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stage_index)
);

COMMENT ON TABLE user_stages IS 'Linear progression stages per user';
COMMENT ON COLUMN user_stages.stage_index IS 'Sequential stage number (1, 2, 3, ...)';
COMMENT ON COLUMN user_stages.code IS 'Stage identifier (FOUNDATION, MOMENTUM, etc.)';
COMMENT ON COLUMN user_stages.is_unlocked IS 'Whether user can access this stage';
COMMENT ON COLUMN user_stages.is_completed IS 'Whether all tasks in stage are complete';

-- 2) Tasks per stage table
CREATE TABLE IF NOT EXISTS user_stage_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_stage_id UUID NOT NULL REFERENCES user_stages(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  key_code TEXT NOT NULL,                    -- e.g., 'LOG_3_MEALS_TODAY'
  title_he TEXT NOT NULL,
  desc_he TEXT,
  points INT NOT NULL DEFAULT 10,
  condition_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- rule definition
  is_completed BOOLEAN NOT NULL DEFAULT false,       -- persisted when server confirms
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_stage_id, order_index)
);

COMMENT ON TABLE user_stage_tasks IS 'Tasks within each stage';
COMMENT ON COLUMN user_stage_tasks.order_index IS 'Task order within stage (0, 1, 2, ...)';
COMMENT ON COLUMN user_stage_tasks.condition_json IS 'Declarative rule config for completion check';

-- 3) Create indexes
CREATE INDEX IF NOT EXISTS idx_user_stages_user ON user_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stages_state ON user_stages(user_id, is_unlocked, is_completed);
CREATE INDEX IF NOT EXISTS idx_user_stages_index ON user_stages(user_id, stage_index);

CREATE INDEX IF NOT EXISTS idx_user_stage_tasks_stage ON user_stage_tasks(user_stage_id);
CREATE INDEX IF NOT EXISTS idx_user_stage_tasks_completed ON user_stage_tasks(user_stage_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_user_stage_tasks_order ON user_stage_tasks(user_stage_id, order_index);

-- 4) Enable RLS
ALTER TABLE user_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stage_tasks ENABLE ROW LEVEL SECURITY;

-- 5) RLS Policies for user_stages
CREATE POLICY "stages_select_own" ON user_stages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "stages_insert_own" ON user_stages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stages_update_own" ON user_stages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "stages_delete_own" ON user_stages
  FOR DELETE USING (auth.uid() = user_id);

-- 6) RLS Policies for user_stage_tasks
CREATE POLICY "stage_tasks_select_via_stage" ON user_stage_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_stages s
      WHERE s.id = user_stage_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "stage_tasks_insert_via_stage" ON user_stage_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_stages s
      WHERE s.id = user_stage_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "stage_tasks_update_via_stage" ON user_stage_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_stages s
      WHERE s.id = user_stage_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "stage_tasks_delete_via_stage" ON user_stage_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_stages s
      WHERE s.id = user_stage_id AND s.user_id = auth.uid()
    )
  );

-- 7) Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8) Triggers for updated_at
DROP TRIGGER IF EXISTS update_user_stages_updated_at ON user_stages;
CREATE TRIGGER update_user_stages_updated_at
  BEFORE UPDATE ON user_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_stage_tasks_updated_at ON user_stage_tasks;
CREATE TRIGGER update_user_stage_tasks_updated_at
  BEFORE UPDATE ON user_stage_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================
-- Verification Queries
-- ============================================

-- Check tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_stages', 'user_stage_tasks');

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_stages', 'user_stage_tasks');

-- Check policies
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_stages', 'user_stage_tasks');
