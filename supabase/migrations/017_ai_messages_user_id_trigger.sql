-- 017_ai_messages_user_id_trigger.sql
-- Safety net: automatically set user_id to auth.uid() if NULL on insert
-- This prevents accidental NULL user_id that would make rows invisible under RLS

-- Function: if user_id is null on insert, set it to auth.uid()
CREATE OR REPLACE FUNCTION public.ai_messages_set_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF new.user_id IS NULL THEN
    new.user_id := auth.uid();
    RAISE NOTICE 'ai_messages_set_user_id: Setting user_id to auth.uid() %', new.user_id;
  END IF;
  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.ai_messages_set_user_id() IS
  'Safety net: sets user_id to auth.uid() if NULL on insert to prevent RLS visibility issues';

-- Drop trigger if exists (idempotent)
DROP TRIGGER IF EXISTS trg_ai_messages_set_user_id ON public.ai_messages;

-- Create trigger
CREATE TRIGGER trg_ai_messages_set_user_id
  BEFORE INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_messages_set_user_id();

COMMENT ON TRIGGER trg_ai_messages_set_user_id ON public.ai_messages IS
  'Automatically sets user_id to auth.uid() if NULL before insert';

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
