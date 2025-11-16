-- Step 2: Ensure replica identity is FULL
ALTER TABLE public.ai_messages REPLICA IDENTITY FULL;

-- Verify it was set
SELECT relname, relreplident
FROM pg_class
WHERE relname = 'ai_messages';
-- Expected: relreplident = 'f' (FULL)
