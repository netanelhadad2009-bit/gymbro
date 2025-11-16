-- Step 3: Re-add to publication cleanly
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.ai_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;

-- Verify it's in publication
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'ai_messages';
-- Expected: 1 row
