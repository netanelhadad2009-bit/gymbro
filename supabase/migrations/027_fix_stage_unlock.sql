-- Fix stage unlock bug: unlock stage_index 1 (first stage) for all users
-- Stages are numbered starting at 1, not 0

UPDATE user_stages
SET is_unlocked = true
WHERE stage_index = 1;
