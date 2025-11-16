-- 015_rls_diagnostics.sql
-- RLS diagnostic tools for ai_messages table (developer-only)

-- View: RLS status on ai_messages
CREATE OR REPLACE VIEW public.v_ai_messages_rls_status AS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'ai_messages';

COMMENT ON VIEW public.v_ai_messages_rls_status IS
  'Shows RLS status for ai_messages table (dev diagnostic)';

-- View: policies on ai_messages (name/cmd/expressions only)
CREATE OR REPLACE VIEW public.v_ai_messages_policies AS
SELECT
  policyname,
  cmd,
  qual::text AS using_expr,
  with_check::text AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'ai_messages'
ORDER BY cmd, policyname;

COMMENT ON VIEW public.v_ai_messages_policies IS
  'Shows all RLS policies for ai_messages table (dev diagnostic)';

-- Function: impersonation test (counts only)
CREATE OR REPLACE FUNCTION public.debug_ai_messages_impersonation(_user_id uuid)
RETURNS TABLE (
  seen_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Impersonate anon + set sub claim
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claim.sub', _user_id::text, true);

  RETURN QUERY
  SELECT count(*)::bigint
  FROM public.ai_messages;
END;
$$;

COMMENT ON FUNCTION public.debug_ai_messages_impersonation(uuid) IS
  'Returns how many ai_messages the given user_id can see under RLS (counts only). SECURITY DEFINER for controlled impersonation test.';

-- Make sure PostgREST reloads schema cache after creating views/functions
NOTIFY pgrst, 'reload schema';
