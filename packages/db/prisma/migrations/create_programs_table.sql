-- Create programs table for storing user workout and nutrition plans
-- Run this SQL directly in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT UNIQUE NOT NULL,
  days_estimate INTEGER NOT NULL,
  workout_plan_text TEXT NOT NULL,
  nutrition_plan_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_programs_user_id ON programs(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
