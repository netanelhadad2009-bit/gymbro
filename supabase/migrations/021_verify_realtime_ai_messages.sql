-- Ensure ai_messages is included in the realtime publication (safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='ai_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
  END IF;
END $$;

-- sanity check
SELECT * FROM pg_publication_tables
WHERE pubname='supabase_realtime' AND tablename='ai_messages';
