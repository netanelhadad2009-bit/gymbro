-- Step 5: Verify RLS is ON and SELECT policy exists

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
