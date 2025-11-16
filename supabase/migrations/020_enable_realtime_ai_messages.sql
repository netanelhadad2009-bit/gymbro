-- ============================================================================
-- Enable Realtime on ai_messages
-- ============================================================================
-- Ensures ai_messages table is in the supabase_realtime publication
-- for instant message updates in the chat UI

-- Add table to realtime publication (idempotent)
DO $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ai_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
    RAISE NOTICE 'Added ai_messages to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'ai_messages already in supabase_realtime publication';
  END IF;
END $$;

-- Verify (for manual checking)
-- Run this separately to check:
-- SELECT * FROM pg_publication_tables
-- WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ai_messages';
