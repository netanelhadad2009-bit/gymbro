-- ============================================
-- Supabase Realtime Verification - All Steps
-- Table: public.ai_messages
-- ============================================

-- STEP 1: Verify table structure and primary key
-- ============================================
SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  tc.constraint_type
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu
  ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc
  ON kcu.constraint_name = tc.constraint_name
WHERE c.table_schema = 'public' AND c.table_name = 'ai_messages' AND c.column_name = 'id';
-- Expected: constraint_type = 'PRIMARY KEY'

-- STEP 2: Ensure replica identity is FULL
-- ============================================
ALTER TABLE public.ai_messages REPLICA IDENTITY FULL;

-- Verify it was set
SELECT relname, relreplident
FROM pg_class
WHERE relname = 'ai_messages';
-- Expected: relreplident = 'f' (FULL)

-- STEP 3: Re-add to publication cleanly
-- ============================================
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.ai_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;

-- Verify it's in publication
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'ai_messages';
-- Expected: 1 row

-- STEP 4: Force cache reloads
-- ============================================
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
-- No output expected, but you should see "NOTIFY" success message

-- STEP 5: Verify RLS is ON and SELECT policy exists
-- ============================================

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'ai_messages';
-- Expected: rowsecurity = true

-- Check SELECT policy exists
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'ai_messages' AND cmd = 'SELECT';
-- Expected: At least 1 row with qual containing 'auth.uid()'

-- STEP 6: Live end-to-end test
-- ============================================

-- First, get your current user ID
SELECT auth.uid() as current_user_id;

-- Insert a test message
INSERT INTO public.ai_messages (user_id, role, content)
VALUES (
  auth.uid(),
  'user',
  'Realtime test at ' || NOW()::text
)
RETURNING id, role, content, created_at;

-- ============================================
-- IMPORTANT: After running this script
-- ============================================
-- 1. Check the RETURNING output from the INSERT above
-- 2. Copy the message ID
-- 3. Open your browser at http://localhost:3001/coach
-- 4. Open DevTools Console
-- 5. Within 1-2 seconds you should see:
--    [RT] ✉️  event: INSERT <message_id>... (user)
--    [RT] 📨 Triggering onInsert callback
-- 6. The message should appear in the UI instantly
-- ============================================
