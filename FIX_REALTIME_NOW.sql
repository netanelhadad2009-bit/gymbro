-- ============================================================================
-- EMERGENCY FIX: Enable Realtime for ai_messages
-- ============================================================================
-- Run this NOW in Supabase SQL Editor

-- 1. Check if ai_messages is in the realtime publication
SELECT
  tablename,
  pubname,
  schemaname
FROM pg_publication_tables
WHERE tablename = 'ai_messages';

-- Expected: Should show 'ai_messages' in 'supabase_realtime' publication
-- If NO ROWS returned, the problem is confirmed!

-- 2. Add ai_messages to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;

-- 3. Verify it worked
SELECT
  tablename,
  pubname,
  schemaname
FROM pg_publication_tables
WHERE tablename = 'ai_messages';

-- Expected: Should now return 1 row

-- 4. Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- After running this:
-- 1. Hard refresh your browser (Cmd+Shift+R)
-- 2. Send another message
-- 3. Messages should appear instantly now
-- ============================================================================
